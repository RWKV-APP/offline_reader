# Project: RWKV 离线翻译阅读器

## 项目简介

我正在写一个 chrome 浏览器插件, 它监听鼠标悬停处的文本, 并且通过本地的网络协议交给本地的 LLM 去翻译

## Code Style

- 必须遵守 eslint.config.ts 中的要求
- 当构建 func 时, 必须使用 expression 而非 declaration
- 尽量不要在 index.tsx 中绘制 UI. 如果可能的话, 尽量在 App.tsx 中绘制 UI


## workflow

- 你编写完代码后, 不用运行 pnpm build, 因为我已经运行 pnpm dev 了
