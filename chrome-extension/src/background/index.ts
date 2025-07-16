import 'webextension-polyfill';
import { startListenTabs } from './tabs';
import type { ToBackground, FromBackground } from '@extension/shared';

console.log('Background loaded');
console.log("Edit 'chrome-extension/src/background/index.ts' and save to reload.");

const WS_PORT = 52346;
const WS_URL = `ws://localhost:${WS_PORT}/ws`;
let ws: WebSocket | null = null;

// 标志：是否正在连接
let isConnecting = false;

const waitingQuery: { [key: string]: { resolves: [(value: FromBackground) => void] } } = {};

const listenMessageForUI = (
  message: ToBackground,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: FromBackground) => void,
): boolean => {
  const { func, body } = message;
  const { source, logic, url } = body;
  if (func === 'query') {
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

const _onUpdated = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {};

const _onRemoved = (tabId: number, removeInfo: chrome.tabs.TabRemoveInfo) => {};

const _onCreated = (tab: chrome.tabs.Tab) => {};

const _onActivated = (activeInfo: chrome.tabs.TabActiveInfo) => {
  chrome.tabs.get(activeInfo.tabId).then(tab => {
    const url = tab?.url;
    if (url) {
      ws?.send(JSON.stringify({ logic: 'url_highlighted', url }));
    }
  });
};

const _onReplaced = (addedTabId: number, removedTabId: number) => {};

const _onAttached = (tabId: number, attachInfo: chrome.tabs.TabAttachInfo) => {};

const _onDetached = (tabId: number, detachInfo: chrome.tabs.TabDetachInfo) => {};

const _onHighlighted = (highlightInfo: chrome.tabs.TabHighlightInfo) => {
  chrome.tabs.get(highlightInfo.tabIds[0]).then(tab => {
    const url = tab?.url;
    if (url) {
      ws?.send(JSON.stringify({ logic: 'url_highlighted', url }));
    }
  });
};

const _onZoomChange = (zoomChangeInfo: chrome.tabs.ZoomChangeInfo) => {};

const _onMoved = (tabId: number, moveInfo: chrome.tabs.TabMoveInfo) => {};

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
      const v = waitingQuery[source];
      if (v) {
        v.resolves.forEach(resolve => resolve({ func: 'query', body: { translation, source, url } }));
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
}, 2000);

startListenTabs();

export { ws };
