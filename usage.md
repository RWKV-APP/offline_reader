## 使用方法

1. 打开 `RWKV_APP`
2. 在 `RWKV_APP` 中启动 OpenAI 兼容的本地服务器
3. 确认默认地址为 `http://127.0.0.1:52345`
4. 安装本扩展
5. 打开扩展 popup，确认状态为“已连接”
6. 如果本地 API 地址不同，在 popup 中修改 `API Base URL`
7. 刷新目标网页

## 开发模式安装

1. 运行 `pnpm install`
2. 运行 `pnpm build`
3. 打开 Chrome 扩展管理页
4. 开启开发者模式
5. 选择 `Load unpacked`
6. 选择仓库里的 `dist` 目录
