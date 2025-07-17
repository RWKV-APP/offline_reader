import inlineCss from '../../../dist/all/index.css?inline';
import { initAppWithShadow } from '@extension/shared';
import App from '@src/matches/all/App';
import type { AllMessage } from '@extension/shared';

initAppWithShadow({ id: 'CEB-extension-all', app: <App />, inlineCss });

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
  }
};

const startListen = () => {
  stopListen();
  console.log('startListen: content-ui');
  chrome.runtime.onMessage.addListener(onMessage);
  setTimeout(() => {
    console.log('sendMessage: content-ui', { func: 'GetState' });
    chrome.runtime.sendMessage({ func: 'GetState' });
  }, 1000);
};

const stopListen = () => {
  console.log('stopListen: content-ui');
  chrome.runtime.onMessage.removeListener(onMessage);
};

startListen();
