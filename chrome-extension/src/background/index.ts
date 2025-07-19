import 'webextension-polyfill';
import { startListenTabs } from './tabs';
import { ignoreHref } from '@extension/shared';
import { exampleThemeStorage, translationModeStorage, contentUIStateStorage } from '@extension/storage';
import type { AllMessage, QueryResponse, State, ElementPosition } from '@extension/shared';

console.log('Background loaded');
console.log("Edit 'chrome-extension/src/background/index.ts' and save to reload.");

exampleThemeStorage.get().then(theme => {
  console.log('theme', theme);
});

translationModeStorage.get().then(mode => {
  console.log('mode', mode);
});

const WS_PORT = 52346;
const WS_URL = `ws://localhost:${WS_PORT}/ws`;
let ws: WebSocket | null = null;

// 标志：是否正在连接
let isConnecting = false;

const waitingQuery: { [key: string]: { resolves: [(value: AllMessage) => void] } } = {};

// 初始化状态，从 storage 中恢复
const state: State = {
  interactionMode: 'full',
  demoMode: false,
  ignored: false,
  running: false,
  ignoreHref,
  inspecting: false,
  showBBox: false,
};

// 从 storage 中恢复状态
const initializeStateFromStorage = async () => {
  try {
    console.log('background: 从 storage 中恢复状态');
    const storedState = await contentUIStateStorage.get();
    console.log('background: 恢复的状态', storedState);

    // 更新状态，但保持 running 状态为 false（需要 WebSocket 连接）
    state.interactionMode = storedState.interactionMode;
    state.demoMode = storedState.demoMode;
    state.inspecting = storedState.inspecting;
    state.showBBox = storedState.showBBox;
    state.ignored = storedState.ignored;
    state.running = false; // 初始时设为 false，等 WebSocket 连接成功后再设为 true

    console.log('background: 状态已恢复', state);
  } catch (error) {
    console.error('background: 恢复状态失败', error);
  }
};

// 在 background script 启动时恢复状态
initializeStateFromStorage();

const syncStateToContent = async () => {
  const tabs = await chrome.tabs.query({});
  tabs.forEach(tab => {
    if (tab.id) {
      try {
        chrome.tabs.sendMessage(tab.id, { func: 'OnStateChanged', ...state });
      } catch (e) {
        console.warn('background.syncStateToContent', e);
      }
    }
  });
};

const listenMessageForUI = (
  message: AllMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: AllMessage) => void,
): boolean => {
  try {
    const { func } = message;

    switch (func) {
      case 'QueryRequest': {
        const { source, logic, url, nodeName, priority, tick } = message.body;
        const tabId = sender.tab?.id;
        const v = waitingQuery[source];
        if (v === undefined) {
          waitingQuery[source] = { resolves: [sendResponse] };
        } else {
          if (v.resolves == undefined || v.resolves == null) {
            v.resolves = [sendResponse];
          } else {
            v.resolves.push(sendResponse);
          }
        }
        const data = { source, logic, url, tabId, nodeName, priority, tick };
        ws?.send(JSON.stringify(data));
        return true;
      }
      case 'GetState': {
        console.log('Background.Send: GetStateResponse', state);
        sendResponse({
          func: 'GetStateResponse',
          ...state,
        });
        syncStateToContent();
        return true;
      }
      case 'SetState': {
        const { interactionMode, demoMode, inspecting, showBBox } = message;
        console.log('background: 收到 SetState', { interactionMode, demoMode, inspecting, showBBox });

        state.interactionMode = interactionMode;
        state.demoMode = demoMode;
        state.inspecting = inspecting;
        state.showBBox = showBBox;

        // 同步到 storage
        contentUIStateStorage.updateGlobalState({
          running: state.running,
          ignored: state.ignored,
          interactionMode,
          demoMode,
          inspecting,
          showBBox,
        });

        syncStateToContent();
        return false;
      }
      case 'QueryResponse': {
        break;
      }
      case 'OnStateChanged': {
        break;
      }
      case 'GetStateResponse': {
        break;
      }
      case 'PositionSync': {
        const { positions, tabId } = message.body;
        const actualTabId = sender.tab?.id || tabId;

        if (actualTabId && actualTabId !== -1) {
          // 转发位置信息到content-ui
          try {
            chrome.tabs.sendMessage(actualTabId, {
              func: 'PositionSync',
              body: { positions, tabId: actualTabId },
            });
          } catch (e) {
            console.warn('background: 转发位置同步消息失败', e);
          }
        }

        // 发送响应
        sendResponse({
          func: 'PositionSyncResponse',
          body: { success: true },
        });
        return true;
      }
      case 'PositionSyncResponse': {
        break;
      }
    }
    return false;
  } catch (e) {
    console.error('❌ 处理消息失败:', e);
    return false;
  }
};

const startListenMessage = () => {
  stopListenMessage();
  chrome.runtime.onMessage.addListener(listenMessageForUI);
};

const stopListenMessage = () => {
  chrome.runtime.onMessage.removeListener(listenMessageForUI);
};

const connectWebSocket = () => {
  if (isConnecting || (ws && ws.readyState === WebSocket.OPEN)) {
    return;
  }

  console.log('🔌 尝试连接 WebSocket...');
  isConnecting = true;
  let success = false;

  try {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('✅ WebSocket 已连接');
      isConnecting = false;
      ws?.send(JSON.stringify({ type: 'ping' }));
      state.running = true;

      // 更新 storage 中的 running 状态
      contentUIStateStorage.updateGlobalState({
        running: true,
        ignored: state.ignored,
        interactionMode: state.interactionMode,
        demoMode: state.demoMode,
        inspecting: state.inspecting,
        showBBox: state.showBBox,
      });

      syncStateToContent();
    };

    ws.onmessage = event => {
      const { source, translation, url } = JSON.parse(event.data);
      const v = waitingQuery[source];
      if (v) {
        const data: QueryResponse = {
          func: 'QueryResponse',
          body: { translation, source, url },
        };
        v.resolves.forEach(resolve => resolve(data));
        delete waitingQuery[source];
      }
    };

    ws.onerror = err => {
      console.error('❌ WebSocket 错误:', err);
      ws?.close(); // 主动触发 onclose
      state.running = false;

      // 更新 storage 中的 running 状态
      contentUIStateStorage.updateGlobalState({
        running: false,
        ignored: state.ignored,
        interactionMode: state.interactionMode,
        demoMode: state.demoMode,
        inspecting: state.inspecting,
        showBBox: state.showBBox,
      });

      syncStateToContent();
    };

    ws.onclose = () => {
      console.warn('⚠️ WebSocket 已关闭');
      isConnecting = false;
      ws = null;
      state.running = false;

      // 更新 storage 中的 running 状态
      contentUIStateStorage.updateGlobalState({
        running: false,
        ignored: state.ignored,
        interactionMode: state.interactionMode,
        demoMode: state.demoMode,
        inspecting: state.inspecting,
        showBBox: state.showBBox,
      });

      syncStateToContent();
    };

    success = true;
  } catch (e) {
    console.error('❌ 创建 WebSocket 失败:', e);
    isConnecting = false;
    success = false;
    state.running = false;

    // 更新 storage 中的 running 状态
    contentUIStateStorage.updateGlobalState({
      running: false,
      ignored: state.ignored,
      interactionMode: state.interactionMode,
      demoMode: state.demoMode,
      inspecting: state.inspecting,
      showBBox: state.showBBox,
    });

    syncStateToContent();
  }

  if (!success) return;
  startListenMessage();
};

// 每秒调用一次 connectWebSocket
setInterval(() => {
  connectWebSocket();
}, 2000);

startListenTabs();

export { ws };
