# Project: RWKV 离线翻译阅读器

## 项目简介

我正在写一个 chrome 浏览器插件, 它监听鼠标悬停处的文本, 并且通过本地的网络协议交给本地的 LLM 去翻译

## Code Style

- 必须遵守 eslint.config.ts 中的要求
- 当构建 func 时, 必须使用 expression (const func = () => {}) 而非 declaration (function func() {})

## workflow

- 你编写完代码后, 不用运行 pnpm build, 因为我已经在运行 pnpm dev 了

## 我的主要工作代码包含

- pages/content
- pages/content-ui
- packages/shared
- chrome-extension
