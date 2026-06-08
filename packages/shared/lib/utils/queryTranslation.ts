import { formatQueryText } from './formatQueryText.js';
import type { QueryRequest, QueryResponse } from './types.js';

type QueryTranslationBody = Omit<QueryRequest['body'], 'requestId'>;

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
