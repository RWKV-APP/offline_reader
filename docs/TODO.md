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

- [ ] 优先翻译 main 标签, See: [通常有哪些情况表明某些内容是网页的主要元素?](https://chatgpt.com/share/68740231-3100-8004-973e-b850038a27b7)
- [ ] Store things in frontend
- [ ] 使用最新权重
- [ ] 固定不翻译一些内容
  - [ ] github 的 files
  - [ ] Twitter 的左侧部分
- [ ] 不翻译已经关闭的标签
- [ ] 渲染 frontend 在线状态
- [ ] 根据 backend 在线状态决定是否启用翻译

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

### 高优先级

- [ ] 有时候还有任务呢, 就自动停止了
  - [ ] https://github.com/
- [x] 某些 circle progress 不会消失
  - [x] https://github.com/
  - [x] https://www.npmjs.com/package/cld3-asm
- [ ] 加载时间较长时, github.com 新 loading 出来的 DOM 不会被翻译
- [ ] 有一些内容会被重复翻译: https://en.wikipedia.org/wiki/Engram_(neuropsychology), 这里面某个段落的 "来源请求" 会被翻译两次, 造成排版错误

### 中优先级

- [ ] Can not copy-paste: https://chatgpt.com/

## Report to Algorithm coleague

- [ ] Japanese are also translated. Can we remove it so we can reduce the model size?
- [ ] 可否添加检测中文 / 不用翻译的功能? 这个好像是一个分类器了
