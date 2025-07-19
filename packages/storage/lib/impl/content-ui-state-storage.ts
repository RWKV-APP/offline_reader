import { createStorage, StorageEnum } from '../base/index.js';
import type { ContentUIStateType, ContentUIStorageType } from '../base/index.js';

// 避免循环依赖，直接定义SetState接口
interface SetState {
  func: 'SetState';
  interactionMode: 'hover' | 'full';
  demoMode: boolean;
  inspecting: boolean;
}

const storage = createStorage<ContentUIStateType>(
  'content-ui-state-storage-key',
  {
    // Global state defaults
    running: false,
    ignored: false,
    interactionMode: 'hover',
    demoMode: false,
    inspecting: false,
  },
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
);

export const contentUIStateStorage: ContentUIStorageType = {
  ...storage,

  toggleInteractionMode: async () => {
    try {
      const currentState = await storage.get();
      const modes: ('hover' | 'full')[] = ['hover', 'full'];
      const currentIndex = modes.indexOf(currentState.interactionMode);
      const nextIndex = (currentIndex + 1) % modes.length;
      const newMode = modes[nextIndex];

      console.log('storage: 切换交互模式', { from: currentState.interactionMode, to: newMode });

      // Update local state
      await storage.set(prev => ({
        ...prev,
        interactionMode: newMode,
        inspecting: false,
      }));

      // Send message to background
      const msg: SetState = {
        func: 'SetState',
        inspecting: false,
        demoMode: currentState.demoMode,
        interactionMode: newMode,
      };
      chrome.runtime.sendMessage(msg);
    } catch (error) {
      console.error('storage: 切换交互模式失败', error);
    }
  },

  toggleDemoMode: async () => {
    try {
      const currentState = await storage.get();
      const newDemoMode = !currentState.demoMode;

      console.log('storage: 切换演示模式', { from: currentState.demoMode, to: newDemoMode });

      // Update local state
      await storage.set(prev => ({
        ...prev,
        demoMode: newDemoMode,
        inspecting: false,
      }));

      // Send message to background
      const msg: SetState = {
        func: 'SetState',
        interactionMode: currentState.interactionMode,
        demoMode: newDemoMode,
        inspecting: false,
      };
      chrome.runtime.sendMessage(msg);
    } catch (error) {
      console.error('storage: 切换演示模式失败', error);
    }
  },

  toggleDiagnoseMode: async () => {
    try {
      const currentState = await storage.get();
      const newInspecting = !currentState.inspecting;

      console.log('storage: 切换诊断模式', { from: currentState.inspecting, to: newInspecting });

      // Update local state
      await storage.set(prev => ({
        ...prev,
        inspecting: newInspecting,
      }));

      // Send message to background
      const msg: SetState = {
        func: 'SetState',
        interactionMode: currentState.interactionMode,
        demoMode: currentState.demoMode,
        inspecting: newInspecting,
      };
      chrome.runtime.sendMessage(msg);
    } catch (error) {
      console.error('storage: 切换诊断模式失败', error);
    }
  },

  updateGlobalState: async globalState => {
    try {
      console.log('storage: 更新全局状态', globalState);
      await storage.set(prev => ({
        ...prev,
        ...globalState,
      }));
    } catch (error) {
      console.error('storage: 更新全局状态失败', error);
    }
  },
};
