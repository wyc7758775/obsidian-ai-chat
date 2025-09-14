# MCP Chat Yoran for Kimi2

一个基于 MCP (Model Context Protocol) 和 React 的 Obsidian 聊天插件，提供智能对话和文档交互功能。

## ✨ 功能特性

- 🎯 **智能聊天界面**：基于 React 构建的现代化聊天 UI
- 🔄 **MCP 协议支持**：集成 Model Context Protocol 实现智能对话
- 📱 **侧边栏集成**：可拖拽的侧边栏聊天面板
- 🎨 **主题适配**：完美适配 Obsidian 的明暗主题
- ⚡ **热重载开发**：支持开发时的实时预览
- 🛠️ **快捷工具**：内置多种实用工具按钮
- 📝 **文本选择交互**：支持选中文本直接发送到聊天

## 🚀 快速开始

### 环境要求

- Node.js >= 16
- npm 或 pnpm
- Obsidian >= 0.15.0

### 安装依赖

```bash
npm install
# 或使用 pnpm
pnpm install
```

### 开发模式

```bash
# 启动开发模式（文件监听 + 自动构建）
npm run dev

# 构建生产版本
npm run build
```

### 安装到 Obsidian

#### 方法 1：开发环境（推荐）

```bash
# 构建项目
npm run build

# 创建符号链接到你的 vault
ln -s $(pwd)/mcp-chat-yoran /path/to/your/vault/.obsidian/plugins/mcp-chat-yoran
```

#### 方法 2：直接复制

```bash
# 复制构建产物到插件目录
cp -r mcp-chat-yoran /path/to/your/vault/.obsidian/plugins/mcp-chat-yoran
```

#### 方法 3：在 Obsidian 中启用

1. 打开 Obsidian 设置
2. 进入「社区插件」
3. 找到 "MCP Chat Yoran" 并启用

## 🏗️ 项目结构

```
obsidian-sample-plugin/
├── src/                          # 源代码目录
│   ├── main.ts                   # 插件主入口
│   └── sidebar/                  # 侧边栏组件
│       ├── ChatComponent.tsx     # React 聊天组件
│       ├── sidebar-view.ts       # 侧边栏视图类
│       └── styles.css           # 组件样式
├── mcp-chat-yoran/              # 构建输出目录
│   ├── main.js                  # 编译后的主文件
│   ├── manifest.json            # 插件清单
│   └── styles.css              # 样式文件
├── esbuild.config.mjs           # 构建配置
├── tsconfig.json               # TypeScript 配置
├── manifest.json               # 插件清单（源文件）
├── package.json                # 项目配置
└── README.md                   # 项目文档
```

## 🎮 使用方法

### 基本操作

1. **打开聊天面板**：
   - 点击左侧功能区的游戏手柄图标
   - 或使用命令面板搜索相关命令

2. **发送消息**：
   - 在输入框中输入消息
   - 按 Enter 键或点击发送按钮
   - 支持 Shift + Enter 换行

3. **选中文本交互**：
   - 在编辑器中选中文本
   - 文本会自动发送到聊天面板

### 快捷工具

聊天面板底部提供多个快捷工具：
- 📝 **新建笔记**：快速创建新的笔记
- 🔍 **搜索**：在 vault 中搜索内容
- 📊 **统计**：查看文档统计信息
- ⚙️ **设置**：打开插件设置

## ⚙️ 配置选项

在 Obsidian 设置的插件配置页面中，你可以调整：

- 聊天行为设置
- UI 主题偏好
- MCP 连接配置
- 快捷键绑定

## 🛠️ 开发指南

### 技术栈

- **TypeScript**：类型安全的 JavaScript
- **React 18**：现代化的 UI 框架
- **esbuild**：快速的构建工具
- **Obsidian API**：插件开发接口

### 开发环境设置

1. **克隆项目**：
   ```bash
   git clone https://github.com/wyc7758775/obsidian-mcp-chat-yoran.git
   cd obsidian-mcp-chat-yoran
   ```

2. **安装依赖**：
   ```bash
   npm install
   ```

3. **启动开发**：
   ```bash
   npm run dev
   ```

### 构建流程

项目使用 esbuild 进行构建，支持：
- TypeScript 编译
- React JSX 转换
- 代码打包和优化
- 开发时热重载

### 添加新功能

1. **修改 React 组件**：编辑 `src/sidebar/ChatComponent.tsx`
2. **添加新的侧边栏功能**：修改 `src/sidebar/sidebar-view.ts`
3. **扩展插件功能**：在 `src/main.ts` 中添加新的命令或事件

## 🔧 故障排除

### 常见问题

**Q: 插件无法加载，提示找不到 main.js**

A: 确保运行了构建命令 `npm run build`，并且 `mcp-chat-yoran` 目录中存在 `main.js` 文件。

**Q: 热重载不工作**

A: 
1. 确保开发模式正在运行：`npm run dev`
2. 安装 Obsidian 的 "Hot Reload" 插件
3. 手动重新加载插件：禁用后重新启用

**Q: React 组件不显示**

A: 
1. 检查浏览器控制台是否有错误
2. 确保所有 React 依赖已正确安装
3. 验证 JSX 配置是否正确

**Q: 构建失败**

A:
1. 检查 Node.js 版本是否 >= 16
2. 删除 `node_modules` 重新安装依赖
3. 检查 TypeScript 语法错误

### 调试技巧

1. **使用开发者工具**：
   - 在 Obsidian 中按 `Ctrl/Cmd + Shift + I`
   - 查看 Console 中的错误信息

2. **检查构建输出**：
   ```bash
   ls -la mcp-chat-yoran/
   # 应该看到 main.js, manifest.json, styles.css
   ```

3. **验证插件安装**：
   ```bash
   ls -la /path/to/vault/.obsidian/plugins/mcp-chat-yoran/
   ```

## 📦 发布流程

1. **更新版本号**：
   ```bash
   npm version patch  # 或 minor, major
   ```

2. **构建生产版本**：
   ```bash
   npm run build
   ```

3. **创建 GitHub Release**：
   - 上传 `manifest.json`、`main.js`、`styles.css`
   - 使用语义化版本号作为标签

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本项目
2. 创建功能分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'Add amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 创建 Pull Request

### 开发规范

- 使用 TypeScript 进行类型检查
- 遵循 ESLint 代码规范
- 提交前运行测试和构建
- 编写清晰的提交信息

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Obsidian](https://obsidian.md/) - 强大的知识管理工具
- [React](https://reactjs.org/) - 用户界面库
- [esbuild](https://esbuild.github.io/) - 快速的构建工具
- [TypeScript](https://www.typescriptlang.org/) - 类型安全的 JavaScript

## 📞 联系方式

- 作者：Yoran
- GitHub：[wyc7758775](https://github.com/wyc7758775)
- 项目地址：[obsidian-mcp-chat-yoran](https://github.com/wyc7758775/obsidian-mcp-chat-yoran)

---

如果这个插件对你有帮助，请考虑给项目一个 ⭐️！
