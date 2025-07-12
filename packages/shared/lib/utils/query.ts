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

export const formatQueryText = (text: string) => {
  // 统一处理所有方括号引用格式：
  // - [12] 单个数字
  // - [1,2,3] 多个数字（无空格）
  // - [1, 2, 3] 多个数字（有空格）
  // - [citation needed] 引用需要
  // - [1-5] 数字范围
  // - [1, 2, 3; 4, 5] 复杂组合
  const citationRegex = /\[[^\]]*\]/g;
  let _text = text.replace(citationRegex, '').trim();
  _text = _text.replace(/\n\n/g, '\n');
  while (_text.includes('\n\n')) {
    _text = _text.replace('\n\n', '\n');
  }
  return _text;
};

export const formatTranslation = (translation: string) => {
  // 去掉 `[12]` 这种形式
  const regex = /\[(\d+)\]/g;
  // 去掉 `[citation needed]`
  const regex2 = /\[citation needed\]/g;
  // 在中文和英文之间添加空格
  const addSpaceBetweenChineseAndEnglish = (str: string) =>
    str.replace(/([a-zA-Z0-9])([\u4e00-\u9fa5])/g, '$1 $2').replace(/([\u4e00-\u9fa5])([a-zA-Z])/g, '$1 $2');

  return addSpaceBetweenChineseAndEnglish(translation.replace(regex, '').replace(regex2, '').trim());
};

export const query = async (body: QueryBody): Promise<QueryResponse> => {
  let { text } = body;
  text = formatQueryText(text);
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
  // eslint-disable-next-line prefer-const
  let { translation, source } = data;
  translation = formatTranslation(translation);
  return { translation, source };
};
