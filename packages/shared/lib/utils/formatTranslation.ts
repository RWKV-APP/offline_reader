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
