# TODO

## Features

### 高优先级

- [ ] Backend UI
- [ ] Test on Windows
- [ ] Bundle chrome extension files
- [ ] 使用教程
- [ ] 移除红框
- [ ] 确保转圈会消失

### 中优先级

- [ ] Store things in frontend
- [ ] 使用最新权重

### 低优先级

- [ ] Add feedback interactions
- [ ] Known words / sentences
- [ ] 我并不是所有网站都需要翻译
- [ ] 海量 Edge case 优化

### 已完成

- [x] 过滤 URL
- [x] 请求中的转圈
- [x] shelf 的最大并发数量只有 6, 需要换成 Websocket
- [x] 优先执行当前 URL 的翻译请求

## Bugs

- [ ] 🔥 有时候还有任务呢, 就自动停止了: https://github.com/
- [ ] 🔥 某些 circle progress 不会消失
  - [ ] https://github.com/
  - [ ] https://www.npmjs.com/package/cld3-asm
- [ ] 🔥 Can not copy-paste: https://chatgpt.com/

## Report to Algorithm coleague

- [ ] Japanese are also translated. Can we remove it so we can reduce the model size?
- [ ] 可否添加检测中文 / 不用翻译的功能? 这个好像是一个分类器了
