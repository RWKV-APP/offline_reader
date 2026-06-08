import type { COLORS } from './const.js';
import type { EngineStatus } from '@extension/storage';
import type { TupleToUnion } from 'type-fest';

export type * from 'type-fest';
export type ColorType = 'success' | 'info' | 'error' | 'warning' | keyof typeof COLORS;
export type ExcludeValuesFromBaseArrayType<B extends string[], E extends (string | number)[]> = Exclude<
  TupleToUnion<B>,
  TupleToUnion<E>
>[];
export type ManifestType = chrome.runtime.ManifestV3;

/**
 * 发送到后台环境的消息
 */
export interface QueryRequest {
  func: 'QueryRequest';
  body: {
    requestId: string;
    source: string;
    logic: 'translate' | 'loop';
    url: string;
    nodeName: string;
    priority: number;
    tick: number;
  };
}

/**
 * 从 background 返回的翻译结果
 */
export interface QueryResponse {
  func: 'QueryResponse';
  body: {
    requestId: string;
    source: string;
    translation: string;
    url: string;
  };
}

export interface SetState {
  func: 'SetState';
  interactionMode: 'hover' | 'full';
  demoMode: boolean;
  inspecting: boolean;
  showBBox: boolean;
}

export interface OnStateChanged extends State {
  func: 'OnStateChanged';
}

export interface GetState {
  func: 'GetState';
}

export interface GetStateResponse extends State {
  func: 'GetStateResponse';
}

export interface RefreshEngineStatus {
  func: 'RefreshEngineStatus';
}

export interface RefreshEngineStatusResponse {
  func: 'RefreshEngineStatusResponse';
  body: EngineStatus;
  recentFailure: EngineFailureSummary | null;
}

export type EngineProbeStage = 'status' | 'completion' | 'done';
export type EngineFailureStage = EngineProbeStage | 'translation';

export interface EngineFailureSummary {
  stage: EngineFailureStage;
  apiBaseUrl: string;
  error: string;
  checkedAt: string;
}

export interface EngineProbeResult {
  ok: boolean;
  stage: EngineProbeStage;
  apiBaseUrl: string;
  port: number | null;
  models: string[];
  durationMs: number;
  error: string | null;
  sampleOutputPreview: string;
  checkedAt: string;
  recentFailure: EngineFailureSummary | null;
}

export interface RunEngineProbe {
  func: 'RunEngineProbe';
}

export interface RunEngineProbeResponse {
  func: 'RunEngineProbeResponse';
  body: EngineProbeResult;
}

export type TranslationCacheClearScope = 'memory' | 'disk' | 'all';

export interface TranslationCacheStats {
  ttlDays: number;
  maxEntries: number;
  maxBytes: number;
  memoryEntries: number;
  memoryBytes: number;
  diskEntries: number;
  diskBytes: number;
  sessionMemoryHits: number;
  sessionDiskHits: number;
  sessionMisses: number;
  lastHitLevel: 'memory' | 'disk' | null;
  lastUpdatedAt: string | null;
}

export interface GetTranslationCacheStats {
  func: 'GetTranslationCacheStats';
}

export interface GetTranslationCacheStatsResponse {
  func: 'GetTranslationCacheStatsResponse';
  body: TranslationCacheStats;
}

export interface ClearTranslationCache {
  func: 'ClearTranslationCache';
  scope: TranslationCacheClearScope;
}

export interface ClearTranslationCacheResponse {
  func: 'ClearTranslationCacheResponse';
  body: TranslationCacheStats;
}

export type AllMessage =
  | QueryRequest
  | QueryResponse
  | SetState
  | OnStateChanged
  | GetState
  | GetStateResponse
  | RefreshEngineStatus
  | RefreshEngineStatusResponse
  | RunEngineProbe
  | RunEngineProbeResponse
  | GetTranslationCacheStats
  | GetTranslationCacheStatsResponse
  | ClearTranslationCache
  | ClearTranslationCacheResponse
  | PositionSync
  | PositionSyncResponse;

export interface State {
  interactionMode: 'hover' | 'full';
  demoMode: boolean;
  ignored: boolean;
  running: boolean;
  ignoreHref: string[];
  inspecting: boolean;
  showBBox: boolean;
}

/**
 * 元素位置信息
 */
export interface ElementPosition {
  id: string;
  rect: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  text: string;
  type: 'target' | 'result' | 'spinner' | 'done';
}

/**
 * 位置同步消息
 */
export interface PositionSync {
  func: 'PositionSync';
  body: {
    positions: ElementPosition[];
    tabId: number;
  };
}

/**
 * 位置同步响应
 */
export interface PositionSyncResponse {
  func: 'PositionSyncResponse';
  body: {
    success: boolean;
  };
}
