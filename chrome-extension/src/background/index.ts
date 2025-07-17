import 'webextension-polyfill';
import { startListenTabs } from './tabs';
import type { AllMessage, QueryRequest, QueryResponse } from '@extension/shared';

console.log('Background loaded');
console.log("Edit 'chrome-extension/src/background/index.ts' and save to reload.");

const WS_PORT = 52346;
const WS_URL = `ws://localhost:${WS_PORT}/ws`;
let ws: WebSocket | null = null;

// 标志：是否正在连接
let isConnecting = false;

const waitingQuery: { [key: string]: { resolves: [(value: QueryResponse) => void] } } = {};

const listenMessageForUI = (
  message: AllMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: QueryResponse) => void,
): boolean => {
  const { func } = message;

  switch (func) {
    case 'QueryRequest': {
      const { source, logic, url } = message.body;
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
      ws?.send(JSON.stringify({ source, logic, url, tabId }));
      return true;
    }
    case 'QueryResponse': {
      return true;
    }
    case 'setState': {
      return true;
    }
    case 'onStateChanged': {
      return true;
    }
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
