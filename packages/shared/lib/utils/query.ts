const port = 52345;
const url = `http://localhost:${port}`;
const method = 'POST';
const headers = {
  'Content-Type': 'application/json',
};

interface QueryBody {
  text: string;
  logic: 'translate' | 'loop';
}

interface QueryResponse {
  translation: string;
  source: string;
}

export const query = async (body: QueryBody): Promise<QueryResponse> => {
  const res = await fetch(url, {
    method,
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  const { translation, source } = data;
  return { translation, source };
};
