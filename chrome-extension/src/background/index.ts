import 'webextension-polyfill';
import { LocalInferenceClient } from './local-inference-client';
import {
  createTranslationCacheKey,
  getTranslationCacheModelFingerprint,
  TranslationCacheStore,
} from './translation-cache';
import { ignoreHref } from '@extension/shared';
import {
  BUILTIN_EXTENSION_ENGINE_API_BASE_URLS,
  contentUIStateStorage,
  engineConfigStorage,
  engineStatusStorage,
  normalizeApiBaseUrl,
  translationModeStorage,
} from '@extension/storage';
import type {
  AllMessage,
  EngineFailureStage,
  EngineFailureSummary,
  EngineProbeResult,
  QueryRequest,
  QueryResponse,
  QueryStreamDelta,
  QueryStreamDone,
  QueryStreamError,
  QueryStreamMessage,
  QueryStreamRequest,
  QueryStreamSnapshot,
  RefreshEngineStatusResponse,
  RunEngineProbeResponse,
  State,
} from '@extension/shared';
import type { EngineStatus, ExtensionEngineConfig } from '@extension/storage';

const localInferenceClient = new LocalInferenceClient();
const translationCacheStore = new TranslationCacheStore();
const inFlightTranslations = new Map<string, Promise<string>>();
const inFlightStreamTranslations = new Map<string, InFlightStreamTranslation>();
const streamSubscribersByRequestId = new Map<string, StreamSubscriber>();
const pendingRequests = new Map<string, (response?: AllMessage) => void>();
const enginePollIntervalMs = 1000;
const maxConcurrentTranslationRequests = 2;
const translationQueueDrainDelayMs = 50;
const activeTabTranslationPriorityBoost = 100000;
const highlightedTabTranslationPriorityBoost = 80000;
const focusedWindowTranslationPriorityBoost = 10000;
const translationStreamPortName = 'translation-stream';
const engineStatusTransientFailureThreshold = 3;
const builtinEngineApiBaseUrls: readonly string[] = BUILTIN_EXTENSION_ENGINE_API_BASE_URLS;
let refreshPromise: Promise<EngineStatus> | null = null;
let lastEngineFailureSummary: EngineFailureSummary | null = null;
let activeTranslationRequestCount = 0;
let translationQueueDrainTimer: ReturnType<typeof setTimeout> | null = null;
let focusedWindowId: number | null = null;
let activeTabId: number | null = null;
let highlightedTabIds = new Set<number>();
let consecutiveEngineStatusUnreadyCount = 0;
let lastReadyEngineStatus: EngineStatus | null = null;
let engineReady = false;

interface QueuedTranslationTask {
  request: QueryRequest['body'];
  tabContext: TranslationTabContext;
  run: () => Promise<string>;
  resolve: (translation: string) => void;
  reject: (error: unknown) => void;
}

interface TranslationTabContext {
  tabId: number | null;
  windowId: number | null;
  active: boolean;
  highlighted: boolean;
}

interface StreamSubscriber {
  port: chrome.runtime.Port;
  request: QueryStreamRequest['body'];
  cacheKey: string;
}

interface InFlightStreamTranslation {
  request: QueryStreamRequest['body'];
  modelFingerprint: string;
  abortController: AbortController;
  subscribers: Map<string, StreamSubscriber>;
  translation: string;
}

const queuedTranslationTasks: QueuedTranslationTask[] = [];

// 初始化状态，从 storage 中恢复
const state: State = {
  interactionMode: 'full',
  demoMode: false,
  ignored: false,
  translationEnabled: true,
  running: false,
  ignoreHref,
  inspecting: false,
  showBBox: false,
};

const canRunTranslations = (engineStatus: EngineStatus) => engineStatus.connected && engineStatus.models.length > 0;

const updateRunningState = () => {
  state.running = state.translationEnabled && engineReady;
};

const getTranslationTabContext = (sender?: chrome.runtime.MessageSender): TranslationTabContext => {
  const tab = sender?.tab;
  return {
    tabId: typeof tab?.id === 'number' ? tab.id : null,
    windowId: typeof tab?.windowId === 'number' ? tab.windowId : null,
    active: tab?.active === true,
    highlighted: tab?.highlighted === true,
  };
};

const getQueuedTranslationTaskTabPriority = (task: QueuedTranslationTask) => {
  const { tabContext } = task;
  let priority = 0;

  if (tabContext.windowId !== null && tabContext.windowId === focusedWindowId) {
    priority += focusedWindowTranslationPriorityBoost;
  }

  if (tabContext.tabId !== null && tabContext.tabId === activeTabId) {
    priority += activeTabTranslationPriorityBoost;
  } else if (tabContext.tabId !== null && highlightedTabIds.has(tabContext.tabId)) {
    priority += highlightedTabTranslationPriorityBoost;
  } else if (tabContext.active) {
    priority += activeTabTranslationPriorityBoost;
  } else if (tabContext.highlighted) {
    priority += highlightedTabTranslationPriorityBoost;
  }

  return priority;
};

const compareQueuedTranslationTasks = (a: QueuedTranslationTask, b: QueuedTranslationTask) => {
  const tabPriorityDifference = getQueuedTranslationTaskTabPriority(b) - getQueuedTranslationTaskTabPriority(a);
  if (tabPriorityDifference !== 0) {
    return tabPriorityDifference;
  }

  if (a.request.priority !== b.request.priority) {
    return b.request.priority - a.request.priority;
  }

  return a.request.tick - b.request.tick;
};

const sortQueuedTranslationTasks = () => {
  queuedTranslationTasks.sort(compareQueuedTranslationTasks);
};

const drainTranslationQueue = () => {
  sortQueuedTranslationTasks();

  while (activeTranslationRequestCount < maxConcurrentTranslationRequests && queuedTranslationTasks.length > 0) {
    const task = queuedTranslationTasks.shift();
    if (!task) {
      return;
    }

    activeTranslationRequestCount++;
    void task
      .run()
      .then(translation => {
        task.resolve(translation);
      })
      .catch(error => {
        task.reject(error);
      })
      .finally(() => {
        activeTranslationRequestCount--;
        drainTranslationQueue();
      });
  }
};

const scheduleTranslationQueueDrain = () => {
  if (translationQueueDrainTimer !== null) {
    return;
  }

  translationQueueDrainTimer = setTimeout(() => {
    translationQueueDrainTimer = null;
    drainTranslationQueue();
  }, translationQueueDrainDelayMs);
};

const enqueueTranslation = (
  request: QueryRequest['body'],
  tabContext: TranslationTabContext,
  run: () => Promise<string>,
) =>
  new Promise<string>((resolve, reject) => {
    queuedTranslationTasks.push({
      request,
      tabContext,
      run,
      resolve,
      reject,
    });
    sortQueuedTranslationTasks();
    scheduleTranslationQueueDrain();
  });

const shouldTryBuiltinFallbacks = (apiBaseUrl: string) =>
  builtinEngineApiBaseUrls.includes(normalizeApiBaseUrl(apiBaseUrl));

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return '未知错误';
};

const createEngineProbeResult = ({
  ok,
  stage,
  apiBaseUrl,
  port,
  models,
  startedAt,
  error,
  sampleOutputPreview = '',
  checkedAt = new Date().toISOString(),
}: {
  ok: boolean;
  stage: EngineProbeResult['stage'];
  apiBaseUrl: string;
  port: number | null;
  models: string[];
  startedAt: number;
  error: string | null;
  sampleOutputPreview?: string;
  checkedAt?: string;
}): EngineProbeResult => ({
  ok,
  stage,
  apiBaseUrl,
  port,
  models,
  durationMs: Date.now() - startedAt,
  error,
  sampleOutputPreview,
  checkedAt,
  recentFailure: lastEngineFailureSummary,
});

const toPreview = (value: string) => value.replace(/\s+/g, ' ').trim().slice(0, 120);

const recordEngineFailure = (stage: EngineFailureStage, apiBaseUrl: string, error: unknown) => {
  lastEngineFailureSummary = {
    stage,
    apiBaseUrl: normalizeApiBaseUrl(apiBaseUrl),
    error: getErrorMessage(error),
    checkedAt: new Date().toISOString(),
  };
};

const getEngineStatusIssue = (engineStatus: EngineStatus) => {
  if (engineStatus.lastError) {
    return engineStatus.lastError;
  }

  if (!engineStatus.connected) {
    return 'API 未运行';
  }

  if (engineStatus.models.length === 0) {
    return 'API 在线，未加载模型';
  }

  return '状态未知';
};

const rememberReadyEngineStatus = (engineStatus: EngineStatus) => {
  consecutiveEngineStatusUnreadyCount = 0;
  lastReadyEngineStatus = {
    ...engineStatus,
    lastError: null,
  };

  return lastReadyEngineStatus;
};

const getStabilizedEngineStatus = (engineStatus: EngineStatus) => {
  if (canRunTranslations(engineStatus)) {
    return rememberReadyEngineStatus(engineStatus);
  }

  consecutiveEngineStatusUnreadyCount++;

  if (lastReadyEngineStatus && consecutiveEngineStatusUnreadyCount < engineStatusTransientFailureThreshold) {
    return {
      ...lastReadyEngineStatus,
      lastError: `状态探测暂时异常（${consecutiveEngineStatusUnreadyCount}/${engineStatusTransientFailureThreshold}）：${getEngineStatusIssue(engineStatus)}`,
    };
  }

  return engineStatus;
};

const resolveEngineConnection = async (engineConfig: ExtensionEngineConfig) => {
  const normalizedApiBaseUrl = normalizeApiBaseUrl(engineConfig.apiBaseUrl);
  const normalizedEngineConfig =
    normalizedApiBaseUrl == engineConfig.apiBaseUrl
      ? engineConfig
      : { ...engineConfig, apiBaseUrl: normalizedApiBaseUrl };
  const currentEngineStatus = await localInferenceClient.getEngineStatus(normalizedEngineConfig);

  if (currentEngineStatus.lastError == null) {
    return {
      engineConfig: normalizedEngineConfig,
      engineStatus: currentEngineStatus,
    };
  }

  if (!shouldTryBuiltinFallbacks(normalizedApiBaseUrl)) {
    return {
      engineConfig: normalizedEngineConfig,
      engineStatus: currentEngineStatus,
    };
  }

  for (const candidateBaseUrl of BUILTIN_EXTENSION_ENGINE_API_BASE_URLS) {
    if (candidateBaseUrl == normalizedApiBaseUrl) {
      continue;
    }

    const candidateEngineConfig: ExtensionEngineConfig = {
      ...normalizedEngineConfig,
      apiBaseUrl: candidateBaseUrl,
    };
    const candidateEngineStatus = await localInferenceClient.getEngineStatus(candidateEngineConfig);

    if (candidateEngineStatus.lastError != null) {
      continue;
    }

    await engineConfigStorage.setApiBaseUrl(candidateBaseUrl);

    return {
      engineConfig: candidateEngineConfig,
      engineStatus: candidateEngineStatus,
    };
  }

  return {
    engineConfig: normalizedEngineConfig,
    engineStatus: currentEngineStatus,
  };
};

const translateWithResolvedConfig = async (engineConfig: ExtensionEngineConfig, request: QueryRequest['body']) => {
  try {
    return await localInferenceClient.translate(engineConfig, request);
  } catch (error) {
    const resolvedConnection = await resolveEngineConnection(engineConfig);
    const currentApiBaseUrl = normalizeApiBaseUrl(engineConfig.apiBaseUrl);
    const resolvedApiBaseUrl = normalizeApiBaseUrl(resolvedConnection.engineConfig.apiBaseUrl);

    if (resolvedConnection.engineStatus.lastError != null || resolvedApiBaseUrl == currentApiBaseUrl) {
      throw error;
    }

    return localInferenceClient.translate(resolvedConnection.engineConfig, request);
  }
};

const translateStreamWithResolvedConfig = async (
  engineConfig: ExtensionEngineConfig,
  request: QueryRequest['body'],
  options: {
    signal: AbortSignal;
    onDelta: (delta: string, accumulated: string) => void;
  },
) => {
  let hasDelta = false;
  const onDelta = (delta: string, accumulated: string) => {
    hasDelta = true;
    options.onDelta(delta, accumulated);
  };

  try {
    return await localInferenceClient.translateStream(engineConfig, request, {
      signal: options.signal,
      onDelta,
    });
  } catch (error) {
    if (options.signal.aborted || hasDelta) {
      throw error;
    }

    const resolvedConnection = await resolveEngineConnection(engineConfig);
    const currentApiBaseUrl = normalizeApiBaseUrl(engineConfig.apiBaseUrl);
    const resolvedApiBaseUrl = normalizeApiBaseUrl(resolvedConnection.engineConfig.apiBaseUrl);

    if (resolvedConnection.engineStatus.lastError != null || resolvedApiBaseUrl == currentApiBaseUrl) {
      throw error;
    }

    return localInferenceClient.translateStream(resolvedConnection.engineConfig, request, {
      signal: options.signal,
      onDelta,
    });
  }
};

const persistState = async () => {
  await contentUIStateStorage.updateGlobalState({
    translationEnabled: state.translationEnabled,
    running: state.running,
    ignored: state.ignored,
    interactionMode: state.interactionMode,
    demoMode: state.demoMode,
    inspecting: state.inspecting,
    showBBox: state.showBBox,
  });
};

const initializeStateFromStorage = async () => {
  try {
    const [storedState, translationModeState, engineStatus] = await Promise.all([
      contentUIStateStorage.get(),
      translationModeStorage.get(),
      engineStatusStorage.get(),
    ]);

    state.interactionMode = storedState.interactionMode;
    state.demoMode = storedState.demoMode;
    state.inspecting = storedState.inspecting;
    state.showBBox = storedState.showBBox;
    state.ignored = storedState.ignored;
    state.translationEnabled = translationModeState.enabled;
    engineReady = canRunTranslations(engineStatus);
    updateRunningState();
    if (engineReady) {
      rememberReadyEngineStatus(engineStatus);
    }
  } catch (e) {
    console.error(e);
  }
};

const syncStateToContent = async () => {
  await persistState();
  const tabs = await chrome.tabs.query({});
  await Promise.all(
    tabs.map(async tab => {
      if (!tab.id) {
        return;
      }

      try {
        await chrome.tabs.sendMessage(tab.id, { func: 'OnStateChanged', ...state });
      } catch (error) {
        console.warn('background.syncStateToContent', error);
      }
    }),
  );
};

const applyEngineStatus = async (engineStatus: EngineStatus) => {
  engineReady = canRunTranslations(engineStatus);
  updateRunningState();
  await engineStatusStorage.updateStatus(engineStatus);
  await syncStateToContent();
};

const cancelInFlightStreamTranslations = () => {
  for (const inFlight of Array.from(inFlightStreamTranslations.values())) {
    for (const subscriber of Array.from(inFlight.subscribers.values())) {
      streamSubscribersByRequestId.delete(subscriber.request.requestId);
    }
    inFlight.subscribers.clear();
    inFlight.abortController.abort();
  }
};

const setTranslationEnabled = async (enabled: boolean) => {
  state.translationEnabled = enabled;
  updateRunningState();
  if (!enabled) {
    cancelInFlightStreamTranslations();
  }
  await translationModeStorage.setEnabled(enabled);
  await syncStateToContent();
};

const refreshEngineStatus = async () => {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const engineConfig = await engineConfigStorage.get();
    const resolvedConnection = await resolveEngineConnection(engineConfig);
    const rawEngineStatus = resolvedConnection.engineStatus;
    const shouldRecordStatusIssue = rawEngineStatus.lastError != null || !rawEngineStatus.connected;

    if (shouldRecordStatusIssue) {
      recordEngineFailure('status', resolvedConnection.engineConfig.apiBaseUrl, getEngineStatusIssue(rawEngineStatus));
    }

    const engineStatus = getStabilizedEngineStatus(rawEngineStatus);
    await applyEngineStatus(engineStatus);

    return engineStatus;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
};

const resolvePendingRequest = (requestId: string, response: QueryResponse) => {
  const sendResponse = pendingRequests.get(requestId);

  if (!sendResponse) {
    return;
  }

  pendingRequests.delete(requestId);
  sendResponse(response);
};

const rejectPendingRequest = (request: QueryRequest['body'], error: unknown) => {
  console.error('❌ 翻译请求失败:', error);

  resolvePendingRequest(request.requestId, {
    func: 'QueryResponse',
    body: {
      requestId: request.requestId,
      source: request.source,
      translation: '',
      url: request.url,
    },
  });

  void refreshEngineStatus().then(engineStatus => {
    if (engineStatus.lastError) {
      console.warn(engineStatus.lastError);
    }
  });
};

const updateQueuedTranslationPriorities = (updates: Array<{ requestId: string; priority: number }>) => {
  if (updates.length === 0 || queuedTranslationTasks.length === 0) {
    return;
  }

  const priorityByRequestId = new Map(updates.map(update => [update.requestId, update.priority]));
  let changed = false;

  for (const task of queuedTranslationTasks) {
    const priority = priorityByRequestId.get(task.request.requestId);
    if (priority === undefined || task.request.priority === priority) {
      continue;
    }

    task.request.priority = priority;
    changed = true;
  }

  if (!changed) {
    return;
  }

  sortQueuedTranslationTasks();
  scheduleTranslationQueueDrain();
};

const handleQueryRequest = async (request: QueryRequest['body'], tabContext: TranslationTabContext) => {
  let engineConfig: ExtensionEngineConfig | null = null;

  try {
    engineConfig = await engineConfigStorage.get();
    const engineStatus = await engineStatusStorage.get();
    const modelFingerprint = getTranslationCacheModelFingerprint(engineConfig, engineStatus);
    const cacheKey = await createTranslationCacheKey({
      source: request.source,
      modelFingerprint,
    });
    const cachedTranslation = await translationCacheStore.get(cacheKey);

    if (cachedTranslation !== null) {
      resolvePendingRequest(request.requestId, {
        func: 'QueryResponse',
        body: {
          requestId: request.requestId,
          source: request.source,
          translation: cachedTranslation.translation,
          url: request.url,
        },
      });
      return;
    }

    let translationPromise = inFlightTranslations.get(cacheKey);

    if (!translationPromise) {
      const resolvedEngineConfig = engineConfig;
      translationPromise = enqueueTranslation(request, tabContext, () =>
        translateWithResolvedConfig(resolvedEngineConfig, request),
      ).then(async translation => {
        if (translation !== '') {
          await translationCacheStore.set({
            key: cacheKey,
            source: request.source,
            translation,
            modelFingerprint,
          });
        }

        return translation;
      });
      inFlightTranslations.set(cacheKey, translationPromise);
      translationPromise.then(
        () => inFlightTranslations.delete(cacheKey),
        () => inFlightTranslations.delete(cacheKey),
      );
    }

    const translation = await translationPromise;

    void refreshEngineStatus();

    resolvePendingRequest(request.requestId, {
      func: 'QueryResponse',
      body: {
        requestId: request.requestId,
        source: request.source,
        translation,
        url: request.url,
      },
    });
  } catch (error) {
    recordEngineFailure('translation', engineConfig?.apiBaseUrl ?? '', error);
    rejectPendingRequest(request, error);
  }
};

const removeStreamSubscriber = (requestId: string) => {
  const subscriber = streamSubscribersByRequestId.get(requestId);
  if (!subscriber) {
    return;
  }

  streamSubscribersByRequestId.delete(requestId);
  const inFlight = inFlightStreamTranslations.get(subscriber.cacheKey);
  if (!inFlight) {
    return;
  }

  inFlight.subscribers.delete(requestId);
  if (inFlight.subscribers.size === 0) {
    inFlight.abortController.abort();
  }
};

const postStreamMessage = (subscriber: StreamSubscriber, message: QueryStreamMessage) => {
  try {
    subscriber.port.postMessage(message);
  } catch {
    removeStreamSubscriber(subscriber.request.requestId);
  }
};

const streamSnapshotMessage = (
  subscriber: StreamSubscriber,
  translation: string,
  options?: { fromCache?: boolean },
): QueryStreamSnapshot => ({
  func: 'QueryStreamSnapshot',
  body: {
    requestId: subscriber.request.requestId,
    source: subscriber.request.source,
    translation,
    url: subscriber.request.url,
    fromCache: options?.fromCache,
  },
});

const streamDeltaMessage = (subscriber: StreamSubscriber, delta: string): QueryStreamDelta => ({
  func: 'QueryStreamDelta',
  body: {
    requestId: subscriber.request.requestId,
    source: subscriber.request.source,
    delta,
    url: subscriber.request.url,
  },
});

const streamDoneMessage = (
  subscriber: StreamSubscriber,
  translation: string,
  options?: { fromCache?: boolean },
): QueryStreamDone => ({
  func: 'QueryStreamDone',
  body: {
    requestId: subscriber.request.requestId,
    source: subscriber.request.source,
    translation,
    url: subscriber.request.url,
    fromCache: options?.fromCache,
  },
});

const streamErrorMessage = (subscriber: StreamSubscriber, error: unknown): QueryStreamError => ({
  func: 'QueryStreamError',
  body: {
    requestId: subscriber.request.requestId,
    source: subscriber.request.source,
    error: getErrorMessage(error),
    url: subscriber.request.url,
  },
});

const broadcastStreamDelta = (inFlight: InFlightStreamTranslation, delta: string) => {
  for (const subscriber of Array.from(inFlight.subscribers.values())) {
    postStreamMessage(subscriber, streamDeltaMessage(subscriber, delta));
  }
};

const broadcastStreamDone = (inFlight: InFlightStreamTranslation, translation: string) => {
  for (const subscriber of Array.from(inFlight.subscribers.values())) {
    postStreamMessage(subscriber, streamDoneMessage(subscriber, translation));
  }
};

const broadcastStreamError = (inFlight: InFlightStreamTranslation, error: unknown) => {
  for (const subscriber of Array.from(inFlight.subscribers.values())) {
    postStreamMessage(subscriber, streamErrorMessage(subscriber, error));
  }
};

const addStreamSubscriber = (inFlight: InFlightStreamTranslation, subscriber: StreamSubscriber) => {
  inFlight.subscribers.set(subscriber.request.requestId, subscriber);
  streamSubscribersByRequestId.set(subscriber.request.requestId, subscriber);
  if (inFlight.translation !== '') {
    postStreamMessage(subscriber, streamSnapshotMessage(subscriber, inFlight.translation));
  }
};

const startStreamTranslation = ({
  engineConfig,
  request,
  cacheKey,
  modelFingerprint,
  subscriber,
  tabContext,
}: {
  engineConfig: ExtensionEngineConfig;
  request: QueryStreamRequest['body'];
  cacheKey: string;
  modelFingerprint: string;
  subscriber: StreamSubscriber;
  tabContext: TranslationTabContext;
}) => {
  const inFlight: InFlightStreamTranslation = {
    request,
    modelFingerprint,
    abortController: new AbortController(),
    subscribers: new Map(),
    translation: '',
  };
  inFlightStreamTranslations.set(cacheKey, inFlight);
  addStreamSubscriber(inFlight, subscriber);

  void enqueueTranslation(request, tabContext, async () => {
    try {
      if (inFlight.subscribers.size === 0) {
        return '';
      }

      const translation = await translateStreamWithResolvedConfig(engineConfig, request, {
        signal: inFlight.abortController.signal,
        onDelta: (delta, accumulated) => {
          inFlight.translation = accumulated;
          broadcastStreamDelta(inFlight, delta);
        },
      });

      inFlight.translation = translation;
      if (translation !== '') {
        await translationCacheStore.set({
          key: cacheKey,
          source: request.source,
          translation,
          modelFingerprint,
        });
      }
      broadcastStreamDone(inFlight, translation);
      void refreshEngineStatus();
      return translation;
    } catch (error) {
      const canceledWithoutSubscribers = inFlight.abortController.signal.aborted && inFlight.subscribers.size === 0;
      if (!canceledWithoutSubscribers) {
        recordEngineFailure('translation', engineConfig.apiBaseUrl, error);
        broadcastStreamError(inFlight, error);
        void refreshEngineStatus();
      }
      return '';
    } finally {
      for (const subscriber of Array.from(inFlight.subscribers.values())) {
        streamSubscribersByRequestId.delete(subscriber.request.requestId);
      }
      inFlight.subscribers.clear();
      inFlightStreamTranslations.delete(cacheKey);
    }
  });

  return inFlight;
};

const handleQueryStreamRequest = async (
  request: QueryStreamRequest['body'],
  tabContext: TranslationTabContext,
  port: chrome.runtime.Port,
  isClosed: () => boolean,
) => {
  let engineConfig: ExtensionEngineConfig | null = null;

  try {
    engineConfig = await engineConfigStorage.get();
    const engineStatus = await engineStatusStorage.get();
    const modelFingerprint = getTranslationCacheModelFingerprint(engineConfig, engineStatus);
    const cacheKey = await createTranslationCacheKey({
      source: request.source,
      modelFingerprint,
    });
    if (isClosed()) return;

    const subscriber: StreamSubscriber = {
      port,
      request,
      cacheKey,
    };
    const cachedTranslation = await translationCacheStore.get(cacheKey);
    if (isClosed()) return;

    if (cachedTranslation !== null) {
      postStreamMessage(
        subscriber,
        streamSnapshotMessage(subscriber, cachedTranslation.translation, { fromCache: true }),
      );
      postStreamMessage(subscriber, streamDoneMessage(subscriber, cachedTranslation.translation, { fromCache: true }));
      return;
    }

    const existingInFlight = inFlightStreamTranslations.get(cacheKey);
    if (existingInFlight) {
      addStreamSubscriber(existingInFlight, subscriber);
      return;
    }

    startStreamTranslation({
      engineConfig,
      request,
      cacheKey,
      modelFingerprint,
      subscriber,
      tabContext,
    });
  } catch (error) {
    if (engineConfig !== null) {
      recordEngineFailure('translation', engineConfig.apiBaseUrl, error);
    }
    const subscriber = streamSubscribersByRequestId.get(request.requestId) ?? {
      port,
      request,
      cacheKey: '',
    };
    postStreamMessage(subscriber, streamErrorMessage(subscriber, error));
    void refreshEngineStatus();
  }
};

const getTranslationCacheStatsAndRespond = (sendResponse: (response?: AllMessage) => void) => {
  void translationCacheStore.getStats().then(stats => {
    sendResponse({
      func: 'GetTranslationCacheStatsResponse',
      body: stats,
    });
  });
};

const clearTranslationCacheAndRespond = (
  scope: 'memory' | 'disk' | 'all',
  sendResponse: (response?: AllMessage) => void,
) => {
  void translationCacheStore.clear(scope).then(async () => {
    sendResponse({
      func: 'ClearTranslationCacheResponse',
      body: await translationCacheStore.getStats(),
    });
  });
};

const refreshAndRespond = (sendResponse: (response?: RefreshEngineStatusResponse) => void) => {
  void refreshEngineStatus().then(engineStatus => {
    sendResponse({
      func: 'RefreshEngineStatusResponse',
      body: engineStatus,
      recentFailure: lastEngineFailureSummary,
    });
  });
};

const runEngineProbe = async (): Promise<EngineProbeResult> => {
  const startedAt = Date.now();
  const checkedAt = new Date().toISOString();
  let apiBaseUrl = '';
  let port: number | null = null;
  let models: string[] = [];
  let stage: EngineProbeResult['stage'] = 'status';

  try {
    const engineConfig = await engineConfigStorage.get();
    const resolvedConnection = await resolveEngineConnection(engineConfig);
    const engineStatus = resolvedConnection.engineStatus;

    apiBaseUrl = normalizeApiBaseUrl(resolvedConnection.engineConfig.apiBaseUrl);
    port = engineStatus.port;
    models = engineStatus.models;

    await applyEngineStatus(engineStatus);

    if (engineStatus.lastError) {
      return createEngineProbeResult({
        ok: false,
        stage,
        apiBaseUrl,
        port,
        models,
        startedAt,
        checkedAt,
        error: engineStatus.lastError,
      });
    }

    if (!engineStatus.connected) {
      return createEngineProbeResult({
        ok: false,
        stage,
        apiBaseUrl,
        port,
        models,
        startedAt,
        checkedAt,
        error: 'API 未运行',
      });
    }

    if (models.length === 0) {
      return createEngineProbeResult({
        ok: false,
        stage,
        apiBaseUrl,
        port,
        models,
        startedAt,
        checkedAt,
        error: 'API 在线，未加载模型',
      });
    }

    stage = 'completion';
    const sampleOutput = await localInferenceClient.probeCompletion(resolvedConnection.engineConfig);

    return createEngineProbeResult({
      ok: true,
      stage: 'done',
      apiBaseUrl,
      port,
      models,
      startedAt,
      checkedAt,
      error: null,
      sampleOutputPreview: toPreview(sampleOutput),
    });
  } catch (error) {
    return createEngineProbeResult({
      ok: false,
      stage,
      apiBaseUrl: apiBaseUrl || 'unknown',
      port,
      models,
      startedAt,
      checkedAt,
      error: getErrorMessage(error),
    });
  }
};

const runEngineProbeAndRespond = (sendResponse: (response?: RunEngineProbeResponse) => void) => {
  void runEngineProbe().then(engineProbeResult => {
    sendResponse({
      func: 'RunEngineProbeResponse',
      body: engineProbeResult,
    });
  });
};

const refreshFocusedTabContext = async () => {
  try {
    const [activeTabs, highlightedTabs] = await Promise.all([
      chrome.tabs.query({ active: true, lastFocusedWindow: true }),
      chrome.tabs.query({ highlighted: true, lastFocusedWindow: true }),
    ]);
    const activeTab = activeTabs[0];

    activeTabId = typeof activeTab?.id === 'number' ? activeTab.id : null;
    focusedWindowId = typeof activeTab?.windowId === 'number' ? activeTab.windowId : null;
    highlightedTabIds = new Set(
      highlightedTabs.map(tab => tab.id).filter((tabId): tabId is number => typeof tabId === 'number'),
    );

    sortQueuedTranslationTasks();
    scheduleTranslationQueueDrain();
  } catch (error) {
    console.warn('刷新当前 tab 优先级失败:', error);
  }
};

const handleFocusedTabContextChanged = () => {
  void refreshFocusedTabContext();
};

const listenMessageForUI = (
  message: AllMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: AllMessage | RefreshEngineStatusResponse) => void,
): boolean => {
  try {
    switch (message.func) {
      case 'QueryRequest': {
        pendingRequests.set(message.body.requestId, sendResponse as (response?: AllMessage) => void);
        void handleQueryRequest(message.body, getTranslationTabContext(sender));
        return true;
      }
      case 'UpdateTranslationPriorities': {
        updateQueuedTranslationPriorities(message.body.priorities);
        return false;
      }
      case 'GetState': {
        sendResponse({
          func: 'GetStateResponse',
          ...state,
        });

        void refreshEngineStatus();
        return false;
      }
      case 'SetState': {
        state.interactionMode = message.interactionMode;
        state.demoMode = message.demoMode;
        state.inspecting = message.inspecting;
        state.showBBox = message.showBBox;

        void syncStateToContent();
        return false;
      }
      case 'SetTranslationEnabled': {
        void setTranslationEnabled(message.enabled);
        return false;
      }
      case 'RefreshEngineStatus': {
        refreshAndRespond(sendResponse as (response?: RefreshEngineStatusResponse) => void);
        return true;
      }
      case 'RunEngineProbe': {
        runEngineProbeAndRespond(sendResponse as (response?: RunEngineProbeResponse) => void);
        return true;
      }
      case 'GetTranslationCacheStats': {
        getTranslationCacheStatsAndRespond(sendResponse as (response?: AllMessage) => void);
        return true;
      }
      case 'ClearTranslationCache': {
        clearTranslationCacheAndRespond(message.scope, sendResponse as (response?: AllMessage) => void);
        return true;
      }
      case 'PositionSync': {
        const { positions, tabId } = message.body;
        const actualTabId = sender.tab?.id || tabId;

        if (actualTabId && actualTabId !== -1) {
          void chrome.tabs
            .sendMessage(actualTabId, {
              func: 'PositionSync',
              body: { positions, tabId: actualTabId },
            })
            .catch(error => {
              console.error(error);
            });
        }

        return false;
      }
      case 'QueryResponse':
      case 'QueryStreamRequest':
      case 'QueryStreamSnapshot':
      case 'QueryStreamDelta':
      case 'QueryStreamDone':
      case 'QueryStreamError':
      case 'QueryStreamCancel':
      case 'OnStateChanged':
      case 'GetStateResponse':
      case 'RefreshEngineStatusResponse':
      case 'RunEngineProbeResponse':
      case 'GetTranslationCacheStatsResponse':
      case 'ClearTranslationCacheResponse':
      case 'PositionSyncResponse': {
        return false;
      }
    }
  } catch (e) {
    console.error('❌ 处理消息失败:', e);
    return false;
  }

  return false;
};

const listenTranslationStreamPort = (port: chrome.runtime.Port) => {
  if (port.name !== translationStreamPortName) {
    return;
  }

  let requestId: string | null = null;
  let closed = false;

  port.onMessage.addListener((message: QueryStreamMessage) => {
    if (message.func === 'QueryStreamRequest') {
      requestId = message.body.requestId;
      void handleQueryStreamRequest(message.body, getTranslationTabContext(port.sender), port, () => closed);
      return;
    }

    if (message.func === 'QueryStreamCancel') {
      removeStreamSubscriber(message.body.requestId);
    }
  });

  port.onDisconnect.addListener(() => {
    closed = true;
    if (requestId !== null) {
      removeStreamSubscriber(requestId);
    }
  });
};

const startListenMessage = () => {
  stopListenMessage();
  chrome.runtime.onMessage.addListener(listenMessageForUI);
  chrome.runtime.onConnect.addListener(listenTranslationStreamPort);
  chrome.tabs.onActivated.addListener(handleFocusedTabContextChanged);
  chrome.tabs.onHighlighted.addListener(handleFocusedTabContextChanged);
  chrome.windows.onFocusChanged.addListener(handleFocusedTabContextChanged);
};

const stopListenMessage = () => {
  chrome.runtime.onMessage.removeListener(listenMessageForUI);
  chrome.runtime.onConnect.removeListener(listenTranslationStreamPort);
  chrome.tabs.onActivated.removeListener(handleFocusedTabContextChanged);
  chrome.tabs.onHighlighted.removeListener(handleFocusedTabContextChanged);
  chrome.windows.onFocusChanged.removeListener(handleFocusedTabContextChanged);
};

void initializeStateFromStorage().then(async () => {
  startListenMessage();
  await refreshFocusedTabContext();
  await syncStateToContent();
  await refreshEngineStatus();
});

setInterval(() => {
  void refreshEngineStatus();
}, enginePollIntervalMs);
