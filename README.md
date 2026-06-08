# RWKV Offline Reader

Chrome 扩展，用于通过 `RWKV_APP` 暴露的本地 OpenAI 兼容接口翻译网页内容。

## 当前结构

- `chrome-extension`: background service worker 与 manifest
- `pages/content`: 页面文本扫描与翻译结果插入
- `pages/content-ui`: 页面内状态面板与诊断 HUD
- `pages/popup`: 本地 API 配置与连接状态控制台

## 开发

1. 安装依赖：`pnpm install`
2. 启动 `RWKV_APP`
3. 在 `RWKV_APP` 中启动本地 OpenAI 兼容服务器，默认地址为 `http://127.0.0.1:52345`
4. 运行扩展开发构建：`pnpm dev`

## 构建

- 生产构建：`pnpm build`
- 打包 zip：`pnpm zip`

## 说明

- 当前阶段只保证 Chrome
- popup 中可以直接修改本地 API 地址和超时
- 页面内翻译渲染仍沿用现有 `content` + `content-ui` 结构
