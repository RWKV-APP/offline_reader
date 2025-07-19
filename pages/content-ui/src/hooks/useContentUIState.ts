import { useStorage, ignoreHref, rwkvEvent } from '@extension/shared';
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
        const { running, interactionMode, demoMode, inspecting, showBBox } = event.detail;
        console.log('content-ui: 收到状态更新', { running, interactionMode, demoMode, inspecting, showBBox });

        // 只更新从 background 传来的状态，保持本地状态不变
        contentUIStateStorage.updateGlobalState({
          running,
          ignored: ignoreHref.some(href => window.location.href.startsWith(href)),
          interactionMode,
          demoMode,
          inspecting,
          showBBox,
        });
      } catch (error) {
        console.error('Error updating global state:', error);
      }
    };

    document.addEventListener(rwkvEvent.stateChanged, handleStateChanged as EventListener);

    return () => {
      document.removeEventListener(rwkvEvent.stateChanged, handleStateChanged as EventListener);
    };
  }, [globalState.showBBox]); // 添加依赖项以确保状态变化时重新订阅

  // 初始化时获取状态
  useEffect(() => {
    const initializeState = async () => {
      try {
        console.log('content-ui: 初始化状态');
        chrome.runtime.sendMessage({ func: 'GetState' });
      } catch (error) {
        console.error('Error sending GetState message:', error);
      }
    };

    // 延迟初始化，确保 background script 已加载
    const timer = setTimeout(initializeState, 100);
    return () => clearTimeout(timer);
  }, []);

  return {
    // 全局状态
    ...globalState,

    // 本地UI状态
    hovered,
    hoveringOthers,

    // UI状态计算属性 - 诊断模式或HUD诊断模式开启时保持显示
    shouldShowOthers: hovered || hoveringOthers || globalState.inspecting || globalState.showBBox,

    // 调试信息
    debug: {
      globalState,
      hovered,
      hoveringOthers,
      shouldShowOthers: hovered || hoveringOthers || globalState.inspecting || globalState.showBBox,
    },

    // 全局操作方法
    toggleInteractionMode: () => {
      try {
        console.log('content-ui: 切换交互模式');
        contentUIStateStorage.toggleInteractionMode();
      } catch (error) {
        console.error('Error toggling interaction mode:', error);
      }
    },
    toggleDemoMode: () => {
      try {
        console.log('content-ui: 切换演示模式');
        contentUIStateStorage.toggleDemoMode();
      } catch (error) {
        console.error('Error toggling demo mode:', error);
      }
    },
    toggleDiagnoseMode: () => {
      try {
        console.log('content-ui: 切换诊断模式');
        contentUIStateStorage.toggleDiagnoseMode();
      } catch (error) {
        console.error('Error toggling diagnose mode:', error);
      }
    },
    toggleBBox: () => {
      try {
        console.log('content-ui: 切换HUD诊断模式', { currentState: globalState.showBBox });
        contentUIStateStorage.toggleBBox();
      } catch (error) {
        console.error('Error toggling HUD diagnose mode:', error);
      }
    },

    // 本地UI操作方法（同步，即时响应）
    setHovered,
    setHoveringOthers,
  };
};
