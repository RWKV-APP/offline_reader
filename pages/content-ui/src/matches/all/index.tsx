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
  console.log('onMessage', message, sender, sendResponse);
};

const startListen = () => {
  stopListen();
  console.log('startListen');
  chrome.runtime.onMessage.addListener(onMessage);
};

const stopListen = () => {
  console.log('stopListen');
  chrome.runtime.onMessage.removeListener(onMessage);
};

startListen();
