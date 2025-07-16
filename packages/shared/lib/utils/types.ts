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
export interface ToBackground {
  func: 'query';
  body: {
    source: string;
    logic: 'translate' | 'loop';
    url: string;
  };
}

/**
 * 从后台环境返回的消息
 */
export interface FromBackground {
  func: 'query';
  body: {
    source: string;
    translation: string;
    url: string;
  };
}
