import type { COLORS } from './const.js';
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

export type AllMessage =
  | QueryRequest
  | QueryResponse
  | SetState
  | OnStateChanged
  | GetState
  | GetStateResponse
  | PositionSync
  | PositionSyncResponse
  | PageSizeSync
  | PageSizeSyncResponse;

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

/**
 * 页面尺寸信息
 */
export interface PageSizeInfo {
  innerHeight: number;
  outerHeight: number;
  innerWidth: number;
  outerWidth: number;
  scrollTop: number;
  scrollLeft: number;
  scrollHeight: number;
  scrollWidth: number;
  tabId: number;
}

/**
 * 页面尺寸同步消息
 */
export interface PageSizeSync {
  func: 'PageSizeSync';
  body: PageSizeInfo;
}

/**
 * 页面尺寸同步响应
 */
export interface PageSizeSyncResponse {
  func: 'PageSizeSyncResponse';
  body: {
    success: boolean;
  };
}
