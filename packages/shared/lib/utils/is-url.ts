/* eslint-disable import-x/no-named-as-default-member */
import validator from 'validator';

export const isUrl = (text: string) => validator.isURL(text);
