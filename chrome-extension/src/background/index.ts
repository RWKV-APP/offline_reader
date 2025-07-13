import 'webextension-polyfill';
import { exampleThemeStorage } from '@extension/storage';
import type { ToBackend, FromBackend } from '@extension/shared';

console.log('Background loaded');
console.log("Edit 'chrome-extension/src/background/index.ts' and save to reload.");

exampleThemeStorage.get().then(theme => {
  console.log('theme', theme);
});

const WS_PORT = 52346;
const WS_URL = `ws://localhost:${WS_PORT}/ws`; // ← 改成你自己的地址
let ws: WebSocket | null = null;

// 标志：是否正在连接
let isConnecting = false;

const waitingQuery: Record<string, { resolve: (value: FromBackend) => void }> = {};

const allTabs = new Map<number, chrome.tabs.Tab>();

const listenMessageForUI = (
  message: ToBackend,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: FromBackend) => void,
): boolean => {
  console.log('listenMessageForUI', message);
  const { func, body } = message;
  const { source, logic, url } = body;
  if (func === 'query') {
    waitingQuery[source] = { resolve: sendResponse };
    ws?.send(JSON.stringify({ source, logic, url }));
    return true;
  }
  return false;
};

const startListenMessage = () => {
  stopListenMessage();
  chrome.runtime.onMessage.addListener(listenMessageForUI);
};

const stopListenMessage = () => {
  chrome.runtime.onMessage.removeListener(listenMessageForUI);
};

const _onUpdated = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
  console.log('_onUpdated', { tabId, changeInfo, tab });
};

const _onRemoved = (tabId: number, removeInfo: chrome.tabs.TabRemoveInfo) => {
  console.log('_onRemoved', { tabId, removeInfo });
  allTabs.delete(tabId);
};

const _onCreated = (tab: chrome.tabs.Tab) => {
  console.log('_onCreated', { tab });
  const { id } = tab;
  if (!id) {
    console.warn('tab id is not found', tab);
    return;
  }
  allTabs.set(id, tab);
};

const _onActivated = (activeInfo: chrome.tabs.TabActiveInfo) => {
  console.log('_onActivated', { activeInfo });
  const { tabId } = activeInfo;
  const tab = allTabs.get(tabId);
  if (!tab) {
    console.warn('tab is not found', tabId);
    return;
  }
  allTabs.set(tabId, tab);
};

const _onReplaced = (addedTabId: number, removedTabId: number) => {
  console.log('_onReplaced', { addedTabId, removedTabId });
};

const _onAttached = (tabId: number, attachInfo: chrome.tabs.TabAttachInfo) => {
  console.log('_onAttached', { tabId, attachInfo });
};

const _onDetached = (tabId: number, detachInfo: chrome.tabs.TabDetachInfo) => {
  console.log('_onDetached', { tabId, detachInfo });
};

const _onHighlighted = (highlightInfo: chrome.tabs.TabHighlightInfo) => {
  console.log('_onHighlighted', { highlightInfo });
};

const _onZoomChange = (zoomChangeInfo: chrome.tabs.ZoomChangeInfo) => {
  console.log('_onZoomChange', { zoomChangeInfo });
  const { tabId } = zoomChangeInfo;
};

const _onMoved = (tabId: number, moveInfo: chrome.tabs.TabMoveInfo) => {
  console.log('_onMoved', { tabId, moveInfo });
};

const startListenTabs = () => {
  stopListenTabs();
  chrome.tabs.onActivated.addListener(_onActivated);
  chrome.tabs.onAttached.addListener(_onAttached);
  chrome.tabs.onCreated.addListener(_onCreated);
  chrome.tabs.onDetached.addListener(_onDetached);
  chrome.tabs.onDetached.addListener(_onDetached);
  chrome.tabs.onHighlighted.addListener(_onHighlighted);
  // chrome.tabs.onMoved.addListener(_onMoved);
  chrome.tabs.onRemoved.addListener(_onRemoved);
  chrome.tabs.onReplaced.addListener(_onReplaced);
  // chrome.tabs.onUpdated.addListener(_onUpdated);
  // chrome.tabs.onZoomChange.addListener(_onZoomChange);
};

const stopListenTabs = () => {
  chrome.tabs.onActivated.removeListener(_onActivated);
  chrome.tabs.onAttached.removeListener(_onAttached);
  chrome.tabs.onCreated.removeListener(_onCreated);
  chrome.tabs.onDetached.removeListener(_onDetached);
  chrome.tabs.onDetached.removeListener(_onDetached);
  chrome.tabs.onHighlighted.removeListener(_onHighlighted);
  // chrome.tabs.onMoved.removeListener(_onMoved);
  chrome.tabs.onRemoved.removeListener(_onRemoved);
  chrome.tabs.onReplaced.removeListener(_onReplaced);
  // chrome.tabs.onUpdated.removeListener(_onUpdated);
  // chrome.tabs.onZoomChange.removeListener(_onZoomChange);
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
    };

    ws.onmessage = event => {
      const { source, translation, timestamp, url } = JSON.parse(event.data);
      const promise = waitingQuery[source];
      if (promise) {
        promise.resolve({ func: 'query', body: { translation, source, url } });
        delete waitingQuery[source];
      }
    };

    ws.onerror = err => {
      console.error('❌ WebSocket 错误:', err);
      ws?.close(); // 主动触发 onclose
    };

    ws.onclose = () => {
      console.warn('⚠️ WebSocket 已关闭');
      isConnecting = false;
      ws = null;
    };

    success = true;
  } catch (e) {
    console.error('❌ 创建 WebSocket 失败:', e);
    isConnecting = false;
    success = false;
  }

  if (!success) return;
  startListenMessage();
};

// 每秒调用一次 connectWebSocket
setInterval(() => {
  connectWebSocket();
  startListenTabs();
}, 2000);
