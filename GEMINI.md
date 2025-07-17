# Project: RWKV 离线翻译阅读器

## 项目简介

我正在写一个 chrome 浏览器插件, 它监听鼠标悬停处的文本, 并且通过本地的网络协议交给本地的 LLM 去翻译

## Code Style

- 必须遵守 eslint.config.ts 中的要求
- 当构建 func 时, 必须使用 expression (const func = () => {}) 而非 declaration (function func() {})

## workflow

- 你编写完代码后, 不用运行 pnpm build, 因为我已经在运行 pnpm dev 了

## 我的主要工作代码包含

### 修改页面 DOM 的代码

path: pages/content

#### 功能

- 检测 DOM 中需要被翻译的文本, 发送翻译请求给 background
- 将翻译结果通过修改 DOM 的方式, 渲染到页面上

### 后台代码

path: chrome-extension/src/background

#### 功能

- 持久化状态
- 监听 tab changes
- 链接 Websocket 服务器

### 用户交互代码

path: pages/content-ui

#### 功能

- 渲染用户交互
- 讲翻译结果绘制到页面的最上册

### 共享代码

- packages/shared
