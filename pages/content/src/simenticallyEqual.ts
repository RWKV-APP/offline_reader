/* eslint-disable arrow-body-style */
const isComposedOfAllowedChars = (str: string): boolean => {
  // 检查字符串是否只包含英文字母、特殊符号和空格
  return /^[a-zA-Z\s!@#$%^&*()_+\-=\\[\]{};':"\\|,.<>\\/?`~]+$/.test(str);
};

// 主要针对 x.com 的 user 和 hashtag
export const simenticallyEqual = (a: string, b: string) => {
  // 检查 a 和 b 是否都由英文字母、特殊符号和空格组成
  const aIsValid = isComposedOfAllowedChars(a);
  const bIsValid = isComposedOfAllowedChars(b);

  const isEqual = aIsValid && bIsValid;
  if (isEqual) {
    console.log({ a, b }, isEqual);
  }
  return isEqual;
};
