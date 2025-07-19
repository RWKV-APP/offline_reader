import type { TranslationMode } from './enums.js';
import type { StorageEnum } from './index.js';

export type ValueOrUpdateType<D> = D | ((prev: D) => Promise<D> | D);

export type BaseStorageType<D> = {
  get: () => Promise<D>;
  set: (value: ValueOrUpdateType<D>) => Promise<void>;
  getSnapshot: () => D | null;
  subscribe: (listener: () => void) => () => void;
};

export type StorageConfigType<D = string> = {
  /**
   * Assign the {@link StorageEnum} to use.
   * @default Local
   */
  storageEnum?: StorageEnum;
  /**
   * Only for {@link StorageEnum.Session}: Grant Content scripts access to storage area?
   * @default false
   */
  sessionAccessForContentScripts?: boolean;
  /**
   * Keeps state live in sync between all instances of the extension. Like between popup, side panel and content scripts.
   * To allow chrome background scripts to stay in sync as well, use {@link StorageEnum.Session} storage area with
   * {@link StorageConfigType.sessionAccessForContentScripts} potentially also set to true.
   * @see https://stackoverflow.com/a/75637138/2763239
   * @default false
   */
  liveUpdate?: boolean;
  /**
   * An optional props for converting values from storage and into it.
   * @default undefined
   */
  serialization?: {
    /**
     * convert non-native values to string to be saved in storage
     */
    serialize: (value: D) => string;
    /**
     * convert string value from storage to non-native values
     */
    deserialize: (text: string) => D;
  };
};

export interface ThemeStateType {
  theme: 'light' | 'dark';
  isLight: boolean;
}

export type ThemeStorageType = BaseStorageType<ThemeStateType> & {
  toggle: () => Promise<void>;
};

export interface TranslationModeStateType {
  enabled: boolean;
  mode: TranslationMode;
  targetLanguage: string;
}

export type TranslationModeStorageType = BaseStorageType<TranslationModeStateType> & {
  toggle: () => Promise<void>;
  setMode: (mode: TranslationMode) => Promise<void>;
  setTargetLanguage: (language: string) => Promise<void>;
};

export interface ContentUIStateType {
  // Global state from background
  running: boolean;
  ignored: boolean;
  interactionMode: 'hover' | 'full';
  demoMode: boolean;
  inspecting: boolean;
}

export type ContentUIStorageType = BaseStorageType<ContentUIStateType> & {
  // Global state actions
  toggleInteractionMode: () => Promise<void>;
  toggleDemoMode: () => Promise<void>;
  toggleDiagnoseMode: () => Promise<void>;
  updateGlobalState: (state: {
    running: boolean;
    ignored: boolean;
    interactionMode: 'hover' | 'full';
    demoMode: boolean;
    inspecting: boolean;
  }) => Promise<void>;
};
