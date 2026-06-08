import { createStorage, StorageEnum } from '../base/index.js';
import type { EngineStatus, EngineStatusStorageType } from '../base/index.js';

const defaultEngineStatus: EngineStatus = {
  connected: false,
  models: [],
  port: null,
  lastError: null,
};

const storage = createStorage<EngineStatus>('engine-status-storage-key', defaultEngineStatus, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

export const engineStatusStorage: EngineStatusStorageType = {
  ...storage,
  updateStatus: async status => {
    await storage.set(status);
  },
  reset: async () => {
    await storage.set(defaultEngineStatus);
  },
};
