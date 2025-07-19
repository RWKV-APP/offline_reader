import inlineCss from '../../../dist/example/index.css?inline';
import { initAppWithShadow } from '@extension/shared';
import App from '@src/matches/example/App';
import { startListen } from '@src/startListen';

initAppWithShadow({ id: 'CEB-extension-example', app: <App />, inlineCss });

startListen();
