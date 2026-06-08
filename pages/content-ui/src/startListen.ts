import { rwkvEvent } from '@extension/shared';
import type { AllMessage } from '@extension/shared';

const onMessage = (
  message: AllMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void,
) => {
  const { func } = message;
  switch (func) {
    case 'GetStateResponse':
    case 'OnStateChanged': {
      document.dispatchEvent(new CustomEvent(rwkvEvent.stateChanged, { detail: message }));
      break;
    }
    case 'QueryRequest': {
      break;
    }
    case 'QueryResponse': {
      break;
    }
    case 'QueryStreamRequest': {
      break;
    }
    case 'QueryStreamSnapshot': {
      break;
    }
    case 'QueryStreamDelta': {
      break;
    }
    case 'QueryStreamDone': {
      break;
    }
    case 'QueryStreamError': {
      break;
    }
    case 'QueryStreamCancel': {
      break;
    }
    case 'UpdateTranslationPriorities': {
      break;
    }
    case 'SetState': {
      break;
    }
    case 'SetTranslationEnabled': {
      break;
    }
    case 'GetState': {
      break;
    }
    case 'RefreshEngineStatus': {
      break;
    }
    case 'RefreshEngineStatusResponse': {
      break;
    }
    case 'RunEngineProbe': {
      break;
    }
    case 'RunEngineProbeResponse': {
      break;
    }
    case 'GetTranslationCacheStats': {
      break;
    }
    case 'GetTranslationCacheStatsResponse': {
      break;
    }
    case 'ClearTranslationCache': {
      break;
    }
    case 'ClearTranslationCacheResponse': {
      break;
    }
    case 'PositionSync': {
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
  chrome.runtime.onMessage.removeListener(onMessage);
};

export const startListen = () => {
  stopListen();
  chrome.runtime.onMessage.addListener(onMessage);

  // 延迟发送 GetState 消息，确保 background script 已准备就绪
  setTimeout(() => {
    try {
      chrome.runtime.sendMessage({ func: 'GetState' });
    } catch (error) {
      console.error('content-ui: 发送 GetState 消息失败', error);
    }
  }, 500);
};
