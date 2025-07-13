import { franc } from 'franc';

export const isChinese = (text: string) => {
  const result = franc(text);
  return result === 'cmn';
};
