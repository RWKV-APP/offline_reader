import { createStorage, StorageEnum } from '../base/index.js';
import { DEFAULT_EXTENSION_ENGINE_CONFIG, normalizeApiBaseUrl } from '../helpers/index.js';
import type { EngineConfigStorageType, ExtensionEngineConfig } from '../base/index.js';

const storage = createStorage<ExtensionEngineConfig>('engine-config-storage-key', DEFAULT_EXTENSION_ENGINE_CONFIG, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

export const engineConfigStorage: EngineConfigStorageType = {
  ...storage,
  setApiBaseUrl: async apiBaseUrl => {
    await storage.set(currentState => ({
      ...currentState,
      apiBaseUrl: normalizeApiBaseUrl(apiBaseUrl),
    }));
  },
  setRequestTimeoutMs: async requestTimeoutMs => {
    const safeTimeoutMs = Number.isFinite(requestTimeoutMs) ? Math.max(1000, Math.trunc(requestTimeoutMs)) : 30000;

    await storage.set(currentState => ({
      ...currentState,
      requestTimeoutMs: safeTimeoutMs,
    }));
  },
  reset: async () => {
    await storage.set(DEFAULT_EXTENSION_ENGINE_CONFIG);
  },
};
