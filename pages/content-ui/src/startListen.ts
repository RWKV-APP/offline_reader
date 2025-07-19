import type { AllMessage } from '@extension/shared';

const onMessage = (
  message: AllMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void,
) => {
  console.log('onMessage: content-ui');
  const { func } = message;
  switch (func) {
    case 'GetStateResponse':
    case 'OnStateChanged': {
      console.log('state-changed: content-ui', message);
      document.dispatchEvent(new CustomEvent('state-changed', { detail: message }));
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
  }
};

const stopListen = () => {
  console.log('stopListen: content-ui');
  chrome.runtime.onMessage.removeListener(onMessage);
};

export const startListen = () => {
  stopListen();
  console.log('startListen: content-ui');
  chrome.runtime.onMessage.addListener(onMessage);
  setTimeout(() => {
    console.log('sendMessage: content-ui', { func: 'GetState' });
    chrome.runtime.sendMessage({ func: 'GetState' });
  }, 500);
};
