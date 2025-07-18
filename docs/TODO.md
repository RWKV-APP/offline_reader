# TODO

## Features

### 高优先级

- [ ] Bundle chrome extension files
- [ ] 使用教程
- [ ] 演示模式
- [ ] 坑爹的隐藏 Form, 给老子滚
- [x] 确保转圈会消失
  - [x] 如果没有运行, 就移除所有转圈
- [x] 移除红框
- [x] 状态同步
- [x] Test on Windows
- [x] Backend UI

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
- [x] 不在某些 URL 上执行:

### 低优先级

- [ ] Add feedback interactions
- [ ] Known words / sentences
- [ ] 我并不是所有网站都需要翻译
- [ ] 海量 Edge case 优化
- [ ] 按照窗口的激活顺序选择优先翻译的标签

### 已完成

- [x] 过滤 URL
- [x] 请求中的转圈
- [x] shelf 的最大并发数量只有 6, 需要换成 Websocket
- [x] 优先执行当前 URL 的翻译请求

## Bugs

### 高优先级

- [x] 哔哩哔哩的 header 没了
- [x] 加载时间较长时, github.com 新 loading 出来的 DOM 不会被翻译
  - [x] 其他的网站也会出现这种情况
- [x] 某些 circle progress 不会消失
  - [x] https://github.com/
  - [x] https://www.npmjs.com/package/cld3-asm
- [x] 有时候还有任务呢, 就自动停止了, 在小尺寸模型上频繁复现
  - [x] https://github.com/

### 中优先级

- [ ] 有一些内容会被重复翻译: https://en.wikipedia.org/wiki/Engram_(neuropsychology), 这里面某个段落的 "来源请求" 会被翻译两次, 造成排版错误, 可以通过 return false 来解决, return false 还能提高速度
- [ ] Can not copy-paste: https://chatgpt.com/

## Report to Algorithm coleague

- [ ] Japanese are also translated. Can we remove it so we can reduce the model size?
- [ ] 可否添加检测中文 / 不用翻译的功能? 这个好像是一个分类器了
