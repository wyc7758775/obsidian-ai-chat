# 删除功能调试指南

## 🔧 调试步骤

### 1. 打开开发者工具
- 在 Obsidian 中按 `Ctrl+Shift+I` (Windows/Linux) 或 `Cmd+Option+I` (Mac)
- 切换到 Console 标签页

### 2. 尝试删除一个历史记录项
- 在侧边栏中选择一个历史记录
- 点击删除按钮
- 观察控制台输出

### 3. 查看详细日志
你应该能看到类似这样的日志：

```
[deleteHistoryMultiRecorder] Starting deletion of item: xxx
[deleteHistoryMultiRecorder] Debug info before deletion: {
  cacheInfo: { size: X, isLoaded: true, items: [...] },
  fileContent: "...",
  fileExists: true,
  filePath: "chat-history.json"
}
[FileStorage] Starting delete operation for item: xxx
[FileStorage] Item xxx deleted from cache, saving to file...
[FileStorage] File saved successfully with X items
[FileStorage] Verification - item xxx still exists after reload: false
```

### 4. 如果删除失败
如果看到 "CRITICAL ERROR" 消息，系统会自动尝试强制删除：

```
[deleteHistoryMultiRecorder] CRITICAL ERROR: Item xxx still exists after deletion!
[deleteHistoryMultiRecorder] Attempting FORCE deletion...
[FileStorage] FORCE DELETE: Starting for item xxx
[FileStorage] FORCE DELETE: File contains X items before deletion
[FileStorage] FORCE DELETE: Item xxx exists in file: true
[FileStorage] FORCE DELETE: File contains X items after deletion
```

### 5. 检查文件位置
数据文件位置：`{你的vault根目录}/chat-history.json`

你可以直接查看这个文件来确认删除是否生效。

## 🐛 常见问题

### 问题1：删除后项目仍然存在
**可能原因：**
- 文件写入权限问题
- 缓存同步问题
- 文件被其他进程锁定

**解决方案：**
1. 检查控制台日志中的错误信息
2. 确认文件路径是否正确
3. 重启 Obsidian 并重试

### 问题2：文件不存在
**可能原因：**
- 文件路径配置错误
- 权限问题

**解决方案：**
1. 检查 vault 根目录
2. 确认文件创建权限

## 📊 手动调试命令

如果你想手动检查状态，可以在控制台中运行：

```javascript
// 获取调试信息（需要在插件上下文中运行）
// 这些命令需要在插件代码中添加全局调试函数
```

## 🔍 文件内容示例

正常的 `chat-history.json` 文件应该看起来像这样：

```json
{
  "item-id-1": {
    "id": "item-id-1",
    "title": "对话标题",
    "messages": [...],
    "createdAt": 1234567890,
    "updatedAt": 1234567890
  },
  "item-id-2": {
    "id": "item-id-2",
    "title": "另一个对话",
    "messages": [...],
    "createdAt": 1234567891,
    "updatedAt": 1234567891
  }
}
```

删除项目后，对应的键值对应该完全消失。

## 📝 报告问题

如果问题仍然存在，请提供：

1. 控制台的完整日志输出
2. `chat-history.json` 文件的内容（删除敏感信息）
3. 操作系统和 Obsidian 版本
4. 具体的操作步骤

这将帮助我们更好地诊断和解决问题。