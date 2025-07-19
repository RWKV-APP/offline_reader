import { rwkvEvent } from '@extension/shared';
import type { AllMessage } from '@extension/shared';

const onMessage = (
  message: AllMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void,
) => {
  console.log('content-ui: 收到消息', message.func);

  const { func } = message;
  switch (func) {
    case 'GetStateResponse':
    case 'OnStateChanged': {
      console.log('content-ui: 状态变化', message);
      document.dispatchEvent(new CustomEvent(rwkvEvent.stateChanged, { detail: message }));
      break;
    }
    case 'QueryRequest': {
      break;
    }
    case 'QueryResponse': {
      break;
    }
    case 'SetState': {
      break;
    }
    case 'GetState': {
      break;
    }
    case 'PositionSync': {
      console.log('content-ui: 收到位置同步消息', message.body);
      // 触发自定义事件，让UI组件处理
      document.dispatchEvent(new CustomEvent('ceb-position-sync', { detail: message.body }));
      break;
    }
    case 'PositionSyncResponse': {
      break;
    }
  }
};

const stopListen = () => {
  console.log('content-ui: 停止监听消息');
  chrome.runtime.onMessage.removeListener(onMessage);
};

export const startListen = () => {
  stopListen();
  console.log('content-ui: 开始监听消息');
  chrome.runtime.onMessage.addListener(onMessage);

  // 延迟发送 GetState 消息，确保 background script 已准备就绪
  setTimeout(() => {
    console.log('content-ui: 发送 GetState 消息');
    try {
      chrome.runtime.sendMessage({ func: 'GetState' });
    } catch (error) {
      console.error('content-ui: 发送 GetState 消息失败', error);
    }
  }, 500);
};
