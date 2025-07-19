# Content UI Script

This tool allows you to inject React Components into all pages specified by you.

## 诊断模式功能

### 功能特性

1. **持久化存储**：诊断模式状态会保存在 Chrome 扩展的本地存储中，浏览器重启后状态不会丢失
2. **多页面同步**：在一个页面开启诊断模式后，所有打开的页面都会同步显示诊断状态
3. **实时状态更新**：通过 Chrome 扩展的消息传递机制实现实时状态同步

### 状态管理流程

```
用户点击诊断模式按钮
    ↓
更新本地 Storage (Chrome.storage.local)
    ↓
发送 SetState 消息到 Background Script
    ↓
Background Script 更新全局状态
    ↓
同步状态到所有打开的标签页
    ↓
Content Script 接收状态更新
    ↓
触发 state-changed 事件
    ↓
UI 组件更新显示状态
```

### 问题修复记录

#### 修复的问题：浏览器重启后诊断模式状态未恢复

**问题原因**：

1. Background script 中的状态是硬编码的，没有从 storage 中恢复
2. Content script 没有监听来自 background 的消息
3. Dashboard 组件缺少 `inspecting` 状态的解构

**修复方案**：

1. ✅ 在 background script 中添加 `initializeStateFromStorage()` 函数，从 storage 中恢复状态
2. ✅ 在 content script 中添加 Chrome 扩展消息监听器
3. ✅ 修复 Dashboard 组件中缺失的 `inspecting` 状态
4. ✅ 添加详细的日志记录，便于调试

### 测试验证

#### 1. 持久化测试

1. 开启诊断模式
2. 关闭浏览器
3. 重新打开浏览器
4. 验证诊断模式状态是否保持

#### 2. 多页面同步测试

1. 打开多个标签页
2. 在其中一个页面开启诊断模式
3. 验证其他页面是否同步显示诊断状态

#### 3. 实时同步测试

1. 在页面 A 开启诊断模式
2. 在页面 B 关闭诊断模式
3. 验证页面 A 是否立即同步关闭状态

#### 4. 调试日志验证

打开浏览器开发者工具，查看控制台日志：

- `background: 从 storage 中恢复状态`
- `content: 收到状态更新`
- `content-ui: 收到状态更新`

### Add New Script

1. Copy `matches/example` folder and paste it with other name and edit content.

   > [!NOTE]
   > Remember to edit import:
   >
   > ```ts
   > import App from '@src/matches/{new_folder}/App';
   > ```

2. Edit `manifest.ts`:

- In `content-scripts` section add object with:

```ts
{
  matches: ['URL_FOR_INJECT'],
  js: ['content-ui/{matches_folder_name}.iife.js']
}
```
