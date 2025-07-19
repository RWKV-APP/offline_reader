import type { QueryRequest, QueryResponse } from './types.js';

export const queryTranslation = async (body: QueryRequest['body']): Promise<QueryResponse> => {
  const msgBody: QueryRequest = {
    func: 'QueryRequest',
    body,
  };
  const res = await chrome.runtime.sendMessage<QueryRequest, QueryResponse>(msgBody);
  return res;
};
