import { formatQueryText } from './formatQueryText.js';
import type {
  QueryRequest,
  QueryResponse,
  QueryStreamDelta,
  QueryStreamDone,
  QueryStreamError,
  QueryStreamMessage,
  QueryStreamRequest,
  QueryStreamSnapshot,
} from './types.js';

type QueryTranslationBody = Omit<QueryRequest['body'], 'requestId'>;

type QueryTranslationStreamHandlers = {
  onSnapshot?: (message: QueryStreamSnapshot) => void;
  onDelta?: (message: QueryStreamDelta) => void;
  onDone?: (message: QueryStreamDone) => void;
  onError?: (message: QueryStreamError) => void;
};

type QueryTranslationStreamController = {
  requestId: string;
  cancel: () => void;
};

const translationStreamPortName = 'translation-stream';

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : '翻译连接失败');

export const queryTranslation = async (body: QueryTranslationBody): Promise<QueryResponse> => {
  const requestId = crypto.randomUUID();
  const msgBody: QueryRequest = {
    func: 'QueryRequest',
    body: {
      requestId,
      ...body,
      source: formatQueryText(body.source),
    },
  };

  try {
    return await chrome.runtime.sendMessage<QueryRequest, QueryResponse>(msgBody);
  } catch (error) {
    console.error('queryTranslation failed', error);

    return {
      func: 'QueryResponse',
      body: {
        requestId,
        source: msgBody.body.source,
        translation: '',
        url: msgBody.body.url,
      },
    };
  }
};

export const queryTranslationStream = (
  body: QueryTranslationBody,
  handlers: QueryTranslationStreamHandlers,
): QueryTranslationStreamController => {
  const requestId = crypto.randomUUID();
  const msgBody: QueryStreamRequest = {
    func: 'QueryStreamRequest',
    body: {
      requestId,
      ...body,
      source: formatQueryText(body.source),
    },
  };
  let closed = false;
  let port: chrome.runtime.Port | null = null;

  const emitError = (error: unknown) => {
    handlers.onError?.({
      func: 'QueryStreamError',
      body: {
        requestId,
        source: msgBody.body.source,
        error: errorMessage(error),
        url: msgBody.body.url,
      },
    });
  };

  const close = () => {
    if (closed) return;
    closed = true;
    try {
      port?.postMessage({
        func: 'QueryStreamCancel',
        body: { requestId },
      });
    } catch {
      // ignore a port that is already closed
    }
    try {
      port?.disconnect();
    } catch {
      // ignore a port that is already closed
    }
  };

  try {
    port = chrome.runtime.connect({ name: translationStreamPortName });
    port.onMessage.addListener((message: QueryStreamMessage) => {
      if (message.func === 'QueryStreamSnapshot') {
        handlers.onSnapshot?.(message);
        return;
      }
      if (message.func === 'QueryStreamDelta') {
        handlers.onDelta?.(message);
        return;
      }
      if (message.func === 'QueryStreamDone') {
        closed = true;
        handlers.onDone?.(message);
        try {
          port?.disconnect();
        } catch {
          // ignore a port that is already closed
        }
        return;
      }
      if (message.func === 'QueryStreamError') {
        closed = true;
        handlers.onError?.(message);
        try {
          port?.disconnect();
        } catch {
          // ignore a port that is already closed
        }
      }
    });
    port.onDisconnect.addListener(() => {
      if (closed) return;
      closed = true;
      emitError('翻译连接已断开');
    });
    port.postMessage(msgBody);
  } catch (error) {
    closed = true;
    emitError(error);
  }

  return {
    requestId,
    cancel: close,
  };
};
