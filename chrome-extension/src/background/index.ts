import 'webextension-polyfill';
import { exampleThemeStorage } from '@extension/storage';

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

const waitingQuery: Record<string, { resolve: (value: { translation: string; source: string }) => void }> = {};

const listenMessageForUI = (
  message: any,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void,
): void => {
  const { type, body } = message;
  if (type === 'query') {
    const { text } = body;
    waitingQuery[text] = { resolve: sendResponse };
    ws?.send(JSON.stringify(body));
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
    };

    ws.onmessage = event => {
      console.log('📩 收到消息:', event.data);
      const { type, body } = JSON.parse(event.data);
      if (type === 'query') {
        const { text } = body;
        const promise = waitingQuery[text];
        if (promise) {
          promise.resolve(body);
          delete waitingQuery[text];
        }
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
