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
