import '@src/Popup.css';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { contentUIStateStorage, engineConfigStorage, engineStatusStorage } from '@extension/storage';
import { cn, ErrorDisplay, LoadingSpinner } from '@extension/ui';
import { useEffect, useState } from 'react';
import type {
  ClearTranslationCache,
  ClearTranslationCacheResponse,
  EngineFailureSummary,
  EngineProbeResult,
  GetTranslationCacheStats,
  GetTranslationCacheStatsResponse,
  RefreshEngineStatus,
  RefreshEngineStatusResponse,
  RunEngineProbe,
  RunEngineProbeResponse,
  TranslationCacheClearScope,
  TranslationCacheStats,
} from '@extension/shared';

const cardClassName = 'rounded-2xl border border-stone-200/80 bg-white/80 p-4 shadow-sm backdrop-blur';
const actionButtonClassName =
  'rounded-xl border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60';

const getConnectionTone = (connected: boolean, hasModels: boolean) => {
  if (connected && hasModels) {
    return 'bg-emerald-100 text-emerald-700';
  }

  if (connected) {
    return 'bg-amber-100 text-amber-700';
  }

  return 'bg-stone-200 text-stone-700';
};

const getConnectionLabel = (connected: boolean, hasModels: boolean) => {
  if (connected && hasModels) {
    return '已连接';
  }

  if (connected) {
    return 'API 在线，未加载模型';
  }

  return '未连接';
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return '未知错误';
};

const formatTimestamp = (value: string | null) => {
  if (!value) {
    return '未刷新';
  }

  return new Date(value).toLocaleTimeString('zh-CN', { hour12: false });
};

const getProbeStageLabel = (stage: EngineProbeResult['stage']) => {
  switch (stage) {
    case 'status':
      return '状态';
    case 'completion':
      return '试译';
    case 'done':
      return '完成';
  }
};

const getFailureStageLabel = (stage: EngineFailureSummary['stage']) => {
  switch (stage) {
    case 'translation':
      return '翻译';
    case 'status':
    case 'completion':
    case 'done':
      return getProbeStageLabel(stage);
  }
};

const formatBytes = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size = size / 1024;
    unitIndex++;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

const getProbeSummary = (probeResult: EngineProbeResult | null) => {
  if (!probeResult) {
    return '未执行';
  }

  if (probeResult.ok) {
    return `成功 ${probeResult.durationMs}ms`;
  }

  return `${getProbeStageLabel(probeResult.stage)}失败`;
};

const StatusRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between gap-3 border-b border-stone-100 py-2 last:border-b-0 last:pb-0">
    <span className="text-sm text-stone-500">{label}</span>
    <span className="max-w-[190px] text-right text-sm font-medium text-stone-900">{value}</span>
  </div>
);

const ToggleAction = ({
  title,
  value,
  onClick,
}: {
  title: string;
  value: boolean;
  onClick: () => Promise<void> | void;
}) => (
  <button
    className={cn(
      'flex items-center justify-between rounded-xl border px-3 py-3 text-left transition-colors',
      value
        ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
        : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100',
    )}
    onClick={() => void onClick()}>
    <div>
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs opacity-75">{value ? '已开启' : '已关闭'}</div>
    </div>
    <div
      className={cn(
        'flex h-6 w-11 items-center rounded-full p-1 transition-colors',
        value ? 'justify-end bg-emerald-500' : 'justify-start bg-stone-300',
      )}>
      <span className="block h-4 w-4 rounded-full bg-white shadow" />
    </div>
  </button>
);

const Popup = () => {
  const contentUIState = useStorage(contentUIStateStorage);
  const engineConfig = useStorage(engineConfigStorage);
  const engineStatus = useStorage(engineStatusStorage);
  const [apiBaseUrlDraft, setApiBaseUrlDraft] = useState(engineConfig.apiBaseUrl);
  const [timeoutDraft, setTimeoutDraft] = useState(String(engineConfig.requestTimeoutMs));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isProbing, setIsProbing] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState<string | null>(null);
  const [probeResult, setProbeResult] = useState<EngineProbeResult | null>(null);
  const [recentFailure, setRecentFailure] = useState<EngineFailureSummary | null>(null);
  const [cacheStats, setCacheStats] = useState<TranslationCacheStats | null>(null);
  const [clearingCacheScope, setClearingCacheScope] = useState<TranslationCacheClearScope | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  const hasModels = engineStatus.models.length > 0;
  const statusLabel = getConnectionLabel(engineStatus.connected, hasModels);
  const statusTone = getConnectionTone(engineStatus.connected, hasModels);

  const refreshCacheStats = async () => {
    const response = await chrome.runtime.sendMessage<GetTranslationCacheStats, GetTranslationCacheStatsResponse>({
      func: 'GetTranslationCacheStats',
    });
    setCacheStats(response.body);
    return response.body;
  };

  const clearTranslationCache = async (scope: TranslationCacheClearScope) => {
    setClearingCacheScope(scope);

    try {
      const response = await chrome.runtime.sendMessage<ClearTranslationCache, ClearTranslationCacheResponse>({
        func: 'ClearTranslationCache',
        scope,
      });
      setCacheStats(response.body);
    } finally {
      setClearingCacheScope(null);
    }
  };

  useEffect(() => {
    setApiBaseUrlDraft(engineConfig.apiBaseUrl);
  }, [engineConfig.apiBaseUrl]);

  useEffect(() => {
    setTimeoutDraft(String(engineConfig.requestTimeoutMs));
  }, [engineConfig.requestTimeoutMs]);

  const refreshEngineStatus = async () => {
    setIsRefreshing(true);

    try {
      const response = await chrome.runtime.sendMessage<RefreshEngineStatus, RefreshEngineStatusResponse>({
        func: 'RefreshEngineStatus',
      });
      setRecentFailure(response.recentFailure);
      setLastRefreshAt(new Date().toISOString());
      await refreshCacheStats();
      await chrome.runtime.sendMessage({ func: 'GetState' });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRunProbe = async () => {
    setIsProbing(true);
    setCopyState('idle');

    try {
      const response = await chrome.runtime.sendMessage<RunEngineProbe, RunEngineProbeResponse>({
        func: 'RunEngineProbe',
      });

      setProbeResult(response.body);
      setRecentFailure(response.body.recentFailure);
      setLastRefreshAt(response.body.checkedAt);
      await refreshCacheStats();
      await chrome.runtime.sendMessage({ func: 'GetState' });
    } catch (error) {
      const checkedAt = new Date().toISOString();
      setProbeResult({
        ok: false,
        stage: 'status',
        apiBaseUrl: engineConfig.apiBaseUrl,
        port: engineStatus.port,
        models: engineStatus.models,
        durationMs: 0,
        error: getErrorMessage(error),
        sampleOutputPreview: '',
        checkedAt,
        recentFailure,
      });
      setLastRefreshAt(checkedAt);
    } finally {
      setIsProbing(false);
    }
  };

  const handleCopyDiagnostics = async () => {
    const latestCacheStats = cacheStats ?? (await refreshCacheStats());
    const diagnosticInfo = {
      extensionVersion: chrome.runtime.getManifest().version,
      generatedAt: new Date().toISOString(),
      config: {
        apiBaseUrl: engineConfig.apiBaseUrl,
        requestTimeoutMs: engineConfig.requestTimeoutMs,
        transport: engineConfig.transport,
      },
      engineStatus: {
        connected: engineStatus.connected,
        port: engineStatus.port,
        modelCount: engineStatus.models.length,
        models: engineStatus.models,
        lastError: engineStatus.lastError,
      },
      contentState: {
        translationInjection: contentUIState.running,
        ignored: contentUIState.ignored,
        inspecting: contentUIState.inspecting,
        showBBox: contentUIState.showBBox,
      },
      lastRefreshAt,
      probe: probeResult,
      recentFailure,
      translationCache: latestCacheStats,
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(diagnosticInfo, null, 2));
      setCopyState('copied');
    } catch (error) {
      console.error('复制诊断信息失败', error);
      setCopyState('failed');
    }
  };

  useEffect(() => {
    const initialize = async () => {
      setIsRefreshing(true);

      try {
        const response = await chrome.runtime.sendMessage<RefreshEngineStatus, RefreshEngineStatusResponse>({
          func: 'RefreshEngineStatus',
        });
        setRecentFailure(response.recentFailure);
        setLastRefreshAt(new Date().toISOString());
        await refreshCacheStats();
        await chrome.runtime.sendMessage({ func: 'GetState' });
      } finally {
        setIsRefreshing(false);
      }
    };

    void initialize();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);

    try {
      await engineConfigStorage.setApiBaseUrl(apiBaseUrlDraft);
      await engineConfigStorage.setRequestTimeoutMs(Number(timeoutDraft));
      await refreshEngineStatus();
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setIsSaving(true);

    try {
      await engineConfigStorage.reset();
      await refreshEngineStatus();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="PopupRoot p-4 text-stone-900">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">RWKV Offline Reader</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">本地推理控制台</h1>
          <p className="mt-1 text-sm leading-5 text-stone-600">
            对齐 RWKV_APP 本地 OpenAI 兼容接口，管理连接状态与调试开关。
          </p>
        </div>
        <img
          src={chrome.runtime.getURL('icon-128.png')}
          className="h-14 w-14 rounded-2xl shadow-sm"
          alt="RWKV Offline Reader"
        />
      </div>

      <div className={cn(cardClassName, 'mb-4')}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">翻译缓存</div>
            <div className="text-xs text-stone-500">
              本机保存网页翻译结果，默认 {cacheStats?.ttlDays ?? 30} 天过期。
            </div>
          </div>
          <button
            className={cn(actionButtonClassName, 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50')}
            onClick={() => void refreshCacheStats()}>
            刷新
          </button>
        </div>

        <div className="space-y-1">
          <StatusRow
            label="内存"
            value={cacheStats ? `${cacheStats.memoryEntries} 条 / ${formatBytes(cacheStats.memoryBytes)}` : '读取中'}
          />
          <StatusRow
            label="硬盘"
            value={cacheStats ? `${cacheStats.diskEntries} 条 / ${formatBytes(cacheStats.diskBytes)}` : '读取中'}
          />
          <StatusRow
            label="上限"
            value={cacheStats ? `${cacheStats.maxEntries} 条 / ${formatBytes(cacheStats.maxBytes)}` : '—'}
          />
          <StatusRow
            label="本轮命中"
            value={
              cacheStats
                ? `内存 ${cacheStats.sessionMemoryHits} / 硬盘 ${cacheStats.sessionDiskHits} / 未命中 ${cacheStats.sessionMisses}`
                : '—'
            }
          />
          <StatusRow
            label="最近命中"
            value={cacheStats?.lastHitLevel === 'memory' ? '内存' : cacheStats?.lastHitLevel === 'disk' ? '硬盘' : '无'}
          />
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <button
            className={cn(actionButtonClassName, 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50')}
            onClick={() => void clearTranslationCache('memory')}
            disabled={clearingCacheScope !== null}>
            {clearingCacheScope === 'memory' ? '清理中...' : '清内存'}
          </button>
          <button
            className={cn(actionButtonClassName, 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50')}
            onClick={() => void clearTranslationCache('disk')}
            disabled={clearingCacheScope !== null}>
            {clearingCacheScope === 'disk' ? '清理中...' : '清硬盘'}
          </button>
          <button
            className={cn(actionButtonClassName, 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100')}
            onClick={() => void clearTranslationCache('all')}
            disabled={clearingCacheScope !== null}>
            {clearingCacheScope === 'all' ? '清理中...' : '清全部'}
          </button>
        </div>
      </div>

      <div className={cn(cardClassName, 'mb-4')}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">本地 API 状态</div>
            <div className="text-xs text-stone-500">默认连接 RWKV_APP 启动的本地 OpenAI 兼容服务</div>
          </div>
          <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', statusTone)}>{statusLabel}</span>
        </div>

        <div className="space-y-1">
          <StatusRow label="传输方式" value="OpenAI Local API" />
          <StatusRow label="端口" value={engineStatus.port === null ? '—' : String(engineStatus.port)} />
          <StatusRow label="翻译注入" value={contentUIState.running ? '已启用' : '待命'} />
          <StatusRow label="已加载模型" value={hasModels ? `${engineStatus.models.length} 个` : '无'} />
          <StatusRow label="最近刷新" value={formatTimestamp(lastRefreshAt)} />
          <StatusRow label="最近探测" value={getProbeSummary(probeResult)} />
        </div>

        {engineStatus.models.length > 0 && (
          <div className="mt-3 rounded-xl bg-stone-50 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Models</div>
            <div className="space-y-1 text-sm text-stone-700">
              {engineStatus.models.map(model => (
                <div key={model} className="truncate rounded-lg bg-white px-2 py-1">
                  {model}
                </div>
              ))}
            </div>
          </div>
        )}

        {engineStatus.lastError && (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700">
            {engineStatus.lastError}
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            className={cn(actionButtonClassName, 'border-stone-300 bg-stone-900 text-white hover:bg-stone-800')}
            onClick={() => void refreshEngineStatus()}
            disabled={isRefreshing}>
            {isRefreshing ? '刷新中...' : '刷新状态'}
          </button>
          <button
            className={cn(actionButtonClassName, 'border-amber-500 bg-amber-500 text-white hover:bg-amber-600')}
            onClick={() => void handleRunProbe()}
            disabled={isProbing}>
            {isProbing ? '探测中...' : '试译探测'}
          </button>
        </div>
        <button
          className={cn(
            actionButtonClassName,
            'mt-2 w-full border-stone-300 bg-white text-stone-700 hover:bg-stone-50',
          )}
          onClick={() => void handleCopyDiagnostics()}>
          {copyState === 'copied' ? '已复制诊断信息' : copyState === 'failed' ? '复制失败' : '复制诊断信息'}
        </button>

        {probeResult && (
          <div
            className={cn(
              'mt-3 rounded-xl border px-3 py-2 text-xs leading-5',
              probeResult.ok
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-rose-200 bg-rose-50 text-rose-700',
            )}>
            <div className="font-semibold">{probeResult.ok ? '试译探测成功' : '试译探测失败'}</div>
            <div>阶段：{getProbeStageLabel(probeResult.stage)}</div>
            <div>耗时：{probeResult.durationMs}ms</div>
            {probeResult.sampleOutputPreview && <div className="truncate">输出：{probeResult.sampleOutputPreview}</div>}
            {probeResult.error && <div>错误：{probeResult.error}</div>}
          </div>
        )}

        {recentFailure && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
            <div className="font-semibold">最近失败摘要</div>
            <div>阶段：{getFailureStageLabel(recentFailure.stage)}</div>
            <div>时间：{formatTimestamp(recentFailure.checkedAt)}</div>
            <div>错误：{recentFailure.error}</div>
          </div>
        )}
      </div>

      <div className={cn(cardClassName, 'mb-4')}>
        <div className="mb-3">
          <div className="text-sm font-semibold">引擎配置</div>
          <div className="text-xs text-stone-500">这里的地址会直接用于 background 发起本地 HTTP 请求。</div>
        </div>

        <label className="mb-3 block">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-500">API Base URL</div>
          <input
            className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
            value={apiBaseUrlDraft}
            onChange={event => setApiBaseUrlDraft(event.target.value)}
            placeholder="http://127.0.0.1:52345"
          />
        </label>

        <label className="block">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-500">Timeout (ms)</div>
          <input
            className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
            value={timeoutDraft}
            onChange={event => setTimeoutDraft(event.target.value)}
            inputMode="numeric"
            placeholder="30000"
          />
        </label>

        <div className="mt-3 flex gap-2">
          <button
            className={cn(actionButtonClassName, 'flex-1 border-stone-300 bg-white text-stone-700 hover:bg-stone-50')}
            onClick={() => void handleReset()}
            disabled={isSaving}>
            恢复默认
          </button>
          <button
            className={cn(actionButtonClassName, 'flex-1 border-amber-500 bg-amber-500 text-white hover:bg-amber-600')}
            onClick={() => void handleSave()}
            disabled={isSaving}>
            {isSaving ? '保存中...' : '保存并刷新'}
          </button>
        </div>
      </div>

      <div className={cardClassName}>
        <div className="mb-3">
          <div className="text-sm font-semibold">调试开关</div>
          <div className="text-xs text-stone-500">这些状态会同步到当前网页的 content / content-ui 层。</div>
        </div>

        <div className="space-y-2">
          <ToggleAction
            title="DOM 诊断模式"
            value={contentUIState.inspecting}
            onClick={contentUIStateStorage.toggleDiagnoseMode}
          />
          <ToggleAction
            title="HUD 诊断模式"
            value={contentUIState.showBBox}
            onClick={contentUIStateStorage.toggleBBox}
          />
        </div>
      </div>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Popup, <LoadingSpinner />), ErrorDisplay);
