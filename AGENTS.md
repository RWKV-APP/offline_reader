# Project: RWKV 离线翻译阅读器

## 项目简介

我正在写一个 Chrome 浏览器插件，它扫描网页 DOM 中适合翻译的文本，并通过 `RWKV_APP` 暴露的本地 OpenAI 兼容 HTTP API 交给本地 LLM 翻译。页面 hover 主要用于目标高亮和诊断交互，不代表只有鼠标悬停处文本才会翻译。

## Code Style

- 当构建 func 时, 必须使用 const func = () => {}
  - 优先使用 async / await 而非 callback / then

## workflow

- 你编写完代码后，不用运行 `pnpm build`，因为我已经在运行 `pnpm dev` 了
- 禁止你自主运行 `pnpm dev`；除非用户明确要求

## 我的主要工作代码包含

### 修改页面 DOM 的代码

path: pages/content

#### 功能

- 扫描 DOM 中需要被翻译的文本，发送翻译请求给 background
- 将翻译结果通过修改 DOM 的方式渲染到页面上
- 处理 hover 高亮、右 Shift 触发、位置监控等页面侧交互

### 后台代码

path: chrome-extension/src/background

#### 功能

- 持久化 content-ui 状态、本地引擎配置和引擎状态
- 每 1 秒探测 RWKV_APP 本地 OpenAI 兼容服务状态
- 只有 `/v1/server/status` 返回 API running 且 models 非空时，才把页面翻译开关置为可运行
- 通过 `/v1/chat/completions` 发起翻译请求和固定试译探测
- 处理 popup 的刷新状态、试译探测、复制诊断信息所需的 background 消息
- 记录最近一次 sanitized 翻译失败摘要，禁止记录网页正文、完整 prompt、完整响应
- 当前 background 不再连接 WebSocket 服务器，也没有 tab changes 监听

### 用户交互代码

path: pages/content-ui

#### 功能

- 渲染页面内用户交互
- 渲染页面内状态面板、诊断 HUD、BBox、高亮、反馈入口
- 不负责把翻译文本插入 DOM；翻译结果插入由 `pages/content` 负责

### Popup 调试与配置代码

path: pages/popup

#### 功能

- 展示 RWKV_APP 本地 API 状态、最近刷新时间、模型状态和错误信息
- 修改本地 API Base URL 与请求超时
- 发起固定试译探测
- 复制不包含网页正文或用户选中文本的诊断信息

### 共享代码

- packages/shared
- packages/storage
- packages/ui

### 本地推理服务器

默认 API Base URL 是：

- `http://127.0.0.1:52345`

这个地址可以在 popup 中修改。当前代码也保留了 legacy fallback：

- `http://127.0.0.1:8080`

通常是在 wangce 的工作电脑上。如果需求涉及本地 OpenAI 兼容协议、`/v1/server/status` 字段、模型状态或 RWKV_APP 服务行为，可以同步检查或修改 `/Users/wangce/docs/repo/rwkv_app` 下的代码，以便让 RWKV APP 配合 Chrome extension 的 changes。

当我说 Flutter application 的时候，我指的也是 /Users/wangce/docs/repo/rwkv_app 中的离线翻译服务器实现
