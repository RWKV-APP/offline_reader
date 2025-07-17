import { TranslationMode } from '../base/enums.js';
import { createStorage, StorageEnum } from '../base/index.js';
import type { TranslationModeStateType, TranslationModeStorageType } from '../base/index.js';

const storage = createStorage<TranslationModeStateType>(
  'translation-mode-storage-key',
  {
    enabled: false,
    mode: TranslationMode.None,
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
    }));
  },
  setMode: async (mode: TranslationMode) => {
    await storage.set(currentState => ({
      ...currentState,
      mode,
    }));
  },
  setTargetLanguage: async (language: string) => {
    await storage.set(currentState => ({
      ...currentState,
      targetLanguage: language,
    }));
  },
};
