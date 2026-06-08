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
} from '@extension/storage';
import type {
  AllMessage,
  EngineFailureStage,
  EngineFailureSummary,
  EngineProbeResult,
  QueryRequest,
  QueryResponse,
  RefreshEngineStatusResponse,
  RunEngineProbeResponse,
  State,
} from '@extension/shared';
import type { EngineStatus, ExtensionEngineConfig } from '@extension/storage';

const localInferenceClient = new LocalInferenceClient();
const translationCacheStore = new TranslationCacheStore();
const inFlightTranslations = new Map<string, Promise<string>>();
const pendingRequests = new Map<string, (response?: AllMessage) => void>();
const enginePollIntervalMs = 1000;
const maxConcurrentTranslationRequests = 2;
const engineStatusTransientFailureThreshold = 3;
const builtinEngineApiBaseUrls: readonly string[] = BUILTIN_EXTENSION_ENGINE_API_BASE_URLS;
let refreshPromise: Promise<EngineStatus> | null = null;
let lastEngineFailureSummary: EngineFailureSummary | null = null;
let activeTranslationRequestCount = 0;
let consecutiveEngineStatusUnreadyCount = 0;
let lastReadyEngineStatus: EngineStatus | null = null;

interface QueuedTranslationTask {
  request: QueryRequest['body'];
  run: () => Promise<string>;
  resolve: (translation: string) => void;
  reject: (error: unknown) => void;
}

const queuedTranslationTasks: QueuedTranslationTask[] = [];

// 初始化状态，从 storage 中恢复
const state: State = {
  interactionMode: 'full',
  demoMode: false,
  ignored: false,
  running: false,
  ignoreHref,
  inspecting: false,
  showBBox: false,
};

const canRunTranslations = (engineStatus: EngineStatus) => engineStatus.connected && engineStatus.models.length > 0;

const compareQueuedTranslationTasks = (a: QueuedTranslationTask, b: QueuedTranslationTask) => {
  if (a.request.priority !== b.request.priority) {
    return b.request.priority - a.request.priority;
  }

  return a.request.tick - b.request.tick;
};

const drainTranslationQueue = () => {
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

const enqueueTranslation = (request: QueryRequest['body'], run: () => Promise<string>) =>
  new Promise<string>((resolve, reject) => {
    queuedTranslationTasks.push({
      request,
      run,
      resolve,
      reject,
    });
    queuedTranslationTasks.sort(compareQueuedTranslationTasks);
    drainTranslationQueue();
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

const persistState = async () => {
  await contentUIStateStorage.updateGlobalState({
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
    const [storedState, engineStatus] = await Promise.all([contentUIStateStorage.get(), engineStatusStorage.get()]);

    state.interactionMode = storedState.interactionMode;
    state.demoMode = storedState.demoMode;
    state.inspecting = storedState.inspecting;
    state.showBBox = storedState.showBBox;
    state.ignored = storedState.ignored;
    state.running = canRunTranslations(engineStatus);
    if (state.running) {
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
  state.running = canRunTranslations(engineStatus);
  await engineStatusStorage.updateStatus(engineStatus);
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

const handleQueryRequest = async (request: QueryRequest['body']) => {
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
      translationPromise = enqueueTranslation(request, () =>
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

const listenMessageForUI = (
  message: AllMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: AllMessage | RefreshEngineStatusResponse) => void,
): boolean => {
  try {
    switch (message.func) {
      case 'QueryRequest': {
        pendingRequests.set(message.body.requestId, sendResponse as (response?: AllMessage) => void);
        void handleQueryRequest(message.body);
        return true;
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

const startListenMessage = () => {
  stopListenMessage();
  chrome.runtime.onMessage.addListener(listenMessageForUI);
};

const stopListenMessage = () => {
  chrome.runtime.onMessage.removeListener(listenMessageForUI);
};

void initializeStateFromStorage().then(async () => {
  startListenMessage();
  await syncStateToContent();
  await refreshEngineStatus();
});

setInterval(() => {
  void refreshEngineStatus();
}, enginePollIntervalMs);
