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

### 测试验证

1. **持久化测试**：
   - 开启诊断模式
   - 关闭浏览器
   - 重新打开浏览器
   - 验证诊断模式状态是否保持

2. **多页面同步测试**：
   - 打开多个标签页
   - 在其中一个页面开启诊断模式
   - 验证其他页面是否同步显示诊断状态

3. **实时同步测试**：
   - 在页面 A 开启诊断模式
   - 在页面 B 关闭诊断模式
   - 验证页面 A 是否立即同步关闭状态

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
