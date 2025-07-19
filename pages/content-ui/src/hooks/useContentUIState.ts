import { useStorage, ignoreHref } from '@extension/shared';
import { contentUIStateStorage } from '@extension/storage';
import { useEffect, useState } from 'react';

export const useContentUIState = () => {
  // 全局状态通过storage管理
  const globalState = useStorage(contentUIStateStorage);

  // 本地UI状态，需要即时响应，不需要持久化
  const [hovered, setHovered] = useState(false);
  const [hoveringOthers, setHoveringOthers] = useState(false);

  // 监听来自background的状态变化
  useEffect(() => {
    const handleStateChanged = (event: CustomEvent) => {
      try {
        const { running, interactionMode, demoMode, inspecting } = event.detail;
        contentUIStateStorage.updateGlobalState({
          running,
          ignored: ignoreHref.some(href => window.location.href.startsWith(href)),
          interactionMode,
          demoMode,
          inspecting,
        });
      } catch (error) {
        console.error('Error updating global state:', error);
      }
    };

    document.addEventListener('state-changed', handleStateChanged as EventListener);

    return () => {
      document.removeEventListener('state-changed', handleStateChanged as EventListener);
    };
  }, []);

  // 初始化时获取状态
  useEffect(() => {
    try {
      chrome.runtime.sendMessage({ func: 'GetState' });
    } catch (error) {
      console.error('Error sending GetState message:', error);
    }
  }, []);

  return {
    // 全局状态
    ...globalState,

    // 本地UI状态
    hovered,
    hoveringOthers,

    // UI状态计算属性
    shouldShowOthers: hovered || hoveringOthers,

    // 全局操作方法
    toggleInteractionMode: () => {
      try {
        contentUIStateStorage.toggleInteractionMode();
      } catch (error) {
        console.error('Error toggling interaction mode:', error);
      }
    },
    toggleDemoMode: () => {
      try {
        contentUIStateStorage.toggleDemoMode();
      } catch (error) {
        console.error('Error toggling demo mode:', error);
      }
    },
    toggleDiagnoseMode: () => {
      try {
        contentUIStateStorage.toggleDiagnoseMode();
      } catch (error) {
        console.error('Error toggling diagnose mode:', error);
      }
    },

    // 本地UI操作方法（同步，即时响应）
    setHovered,
    setHoveringOthers,
  };
};
