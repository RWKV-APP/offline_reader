import inlineCss from '../../../dist/all/index.css?inline';
import { initAppWithShadow } from '@extension/shared';
import App from '@src/matches/all/App';
import { startListen } from '@src/startListen';

initAppWithShadow({ id: 'CEB-extension-all', app: <App />, inlineCss });

startListen();
