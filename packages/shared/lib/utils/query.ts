const port = 52345;
const url = `http://localhost:${port}`;
const method = 'POST';
const headers = {
  'Content-Type': 'application/json',
};

interface QueryBody {
  /**
   * The text to translate. The "\n\n" will be replaced with a "\n". The "\n\n" is the stop token of RWKV Translation model.
   */
  text: string;
  logic: 'translate' | 'loop';
}

interface QueryResponse {
  translation: string;
  source: string;
}

export const query = async (body: QueryBody): Promise<QueryResponse> => {
  let { text } = body;
  while (text.includes('\n\n')) {
    text = text.replace('\n\n', '\n');
  }
  body = {
    ...body,
    text,
  };
  const res = await fetch(url, {
    method,
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  const { translation, source } = data;
  return { translation, source };
};
