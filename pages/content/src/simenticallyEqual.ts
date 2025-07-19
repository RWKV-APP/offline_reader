/* eslint-disable arrow-body-style */
const normalizeString = (str: string): string => {
  return str
    .replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '') // 移除首尾的非英文字母字符
    .toLowerCase(); // 转换为小写
};

// 主要针对 x.com 的 user 和 hashtag
export const simenticallyEqual = (a: string, b: string) => {
  const isEqual = normalizeString(a) === normalizeString(b);
  if (isEqual) {
    console.log({ a, b }, isEqual);
  }
  return isEqual;
};
