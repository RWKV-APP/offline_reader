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
  func: 'setState';
  interactionMode: 'hover' | 'full';
  demoMode: boolean;
}

export interface OnStateChanged {
  func: 'onStateChanged';
  interactionMode: 'hover' | 'full';
  demoMode: boolean;
  ignored: boolean;
  running: boolean;
}

export interface GetState {
  func: 'getState';
}

export interface GetStateResponse {
  func: 'GetStateResponse';
  interactionMode: 'hover' | 'full';
  demoMode: boolean;
  ignored: boolean;
  running: boolean;
}

export type AllMessage = QueryRequest | QueryResponse | SetState | OnStateChanged | GetState | GetStateResponse;
