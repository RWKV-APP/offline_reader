import { TranslationMode } from '../base/enums.js';
import { createStorage, StorageEnum } from '../base/index.js';
import type { TranslationModeStateType, TranslationModeStorageType } from '../base/index.js';

const storage = createStorage<TranslationModeStateType>(
  'translation-mode-storage-key',
  {
    enabled: true,
    mode: TranslationMode.Immersive,
    targetLanguage: 'en',
  },
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
);

export const translationModeStorage: TranslationModeStorageType = {
  ...storage,
  toggle: async () => {
    await storage.set(currentState => ({
      ...currentState,
      enabled: !currentState.enabled,
      mode: currentState.enabled ? TranslationMode.None : TranslationMode.Immersive,
    }));
  },
  toggleEnabled: async () => {
    await storage.set(currentState => ({
      ...currentState,
      enabled: !currentState.enabled,
      mode: currentState.enabled ? TranslationMode.None : TranslationMode.Immersive,
    }));
  },
  setEnabled: async (enabled: boolean) => {
    await storage.set(currentState => ({
      ...currentState,
      enabled,
      mode: enabled ? TranslationMode.Immersive : TranslationMode.None,
    }));
  },
  setMode: async (mode: TranslationMode) => {
    await storage.set(currentState => ({
      ...currentState,
      mode,
      enabled: mode !== TranslationMode.None,
    }));
  },
  setTargetLanguage: async (language: string) => {
    await storage.set(currentState => ({
      ...currentState,
      targetLanguage: language,
    }));
  },
};
