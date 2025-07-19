/* eslint-disable arrow-body-style */
const normalizeString = (str: string): string => {
  // 移除 @ 符号、空格、点号等特殊字符，并转换为小写
  return str
    .toLowerCase()
    .replace(/[@\s\\.]/g, '') // 移除 @、空格、点号
    .replace(/[^\w]/g, ''); // 只保留字母和数字
};

// 主要针对 x.com 的 user 和 hashtag
export const simenticallyEqual = (a: string, b: string) => {
  const normalizedA = normalizeString(a);
  const normalizedB = normalizeString(b);

  return normalizedA === normalizedB;
};

//  ChatGPT 2.1 和 @chatgpt21 应该是相等的
