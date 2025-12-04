## 方案概要
- 使用 React Context 承载 XState service，统一在 `index.tsx` 创建并提供，同一子树内任何组件可通过 Hook 直接获取 `[state, send]`。
- 移除通过 props 传递 `state/send` 的方式；`index.tsx`、`chat-input.tsx` 以及其子组件均通过 `useChatState()` 访问状态机。

## 新增与修改文件
- 新增 `src/views/sidebar/machines/chatStateContext.tsx`：定义 `ChatStateProvider`、`useChatService`、`useChatState`。
- 修改 `src/views/sidebar/index.tsx`：改用 `useInterpret + useActor` 创建并订阅同一个 service；用 `ChatStateProvider` 包裹整棵聊天视图。
- 修改 `src/views/sidebar/chat/chat-input.tsx`：引入并使用 `useChatState()`，在发送/停止时派发状态机事件，移除通过 props 传递的 `state/send`。
- 若 `chat-input.tsx` 有子组件，也在它们内部直接 `useChatState()` 获取状态，无需透传。

## 详细实现
### 1) 新增 Context Provider（含函数级注释）
- 路径：`src/views/sidebar/machines/chatStateContext.tsx`
- 内容要点：
  - 创建 `ChatStateContext`（默认值为 `null`）。
  - `ChatStateProvider({ children, service? })`：可接受父级传入的现有 service；若未提供则内部 `useInterpret(chatMachine)` 创建。
  - `useChatService()`：从 Context 取出 service，若未在 Provider 内使用则抛错，便于开发排查。
  - `useChatState()`：基于 `useActor(service)` 返回 `[state, send]`，供组件使用。

### 2) index.tsx 使用同一个 service 并提供给子树
- 替换 `useMachine(chatMachine)` 为：
  - `const chatService = useInterpret(chatMachine);`
  - `const [state, send] = useActor(chatService);`
- 用 `ChatStateProvider service={chatService}` 包裹原先返回的 JSX，这样 `index.tsx` 保留本地使用 `[state, send]` 的能力，同时子组件共享同一实例。
- 位置参考：`src/views/sidebar/index.tsx:693` 处原 `useMachine` 写法改为上述两行；在最外层 `return (...)` 的根处增加 Provider 包裹。

### 3) chat-input.tsx 及其子组件接入 Context
- 在 `chat-input.tsx` 顶部：`import { useChatState } from "../machines/chatStateContext";`
- 组件内部：
  - `const [chatState, chatSend] = useChatState();`
  - 用 `chatState.matches('streaming')` 控制 UI；点击“发送”时先 `chatSend({ type: 'SEND_MESSAGE' })` 再调用原有 `handleSend()`；点击“停止”时 `chatSend({ type: 'STREAM_END' })` 并调用 `handleCancelStream()`。
- 其子组件若需感知状态或派发事件，直接在组件内 `useChatState()`，不需要父级透传任何状态或函数。

## 边界条件与特殊处理
- Provider 缺失：`useChatService()` 抛出错误，避免静默失败；保证所有相关组件在 Provider 包裹范围内。
- 输入参数有效性：
  - `ChatStateProvider` 的 `service` 可选；若不传则内部创建，防止重复实例化导致状态不一致。
  - 在 `chat-input.tsx` 中，当 `chatState` 不存在（防御性）不应阻塞用户输入；但在本方案下保证存在。
- 状态控制与业务副作用分离：
  - 当前保持业务副作用（网络请求）在 `index.tsx` 中执行，事件在状态机内仅用于切换 UI；后续可将副作用迁移到状态机 `actions/invoke` 以获得更一致的状态管理。

## 验证方法
- 在 `index.tsx` 页面：
  - `idle` 状态下点击发送按钮：状态转为 `loading`，随后进入 `streaming`（真实流开始时派发 `STREAM_START`）。
  - 流式过程中显示“停止生成”按钮；点击后派发 `STREAM_END`，同时停止请求，进入 `success`。
- 断言：`index.tsx` 和 `chat-input.tsx` 的状态一致；子组件无需 props 即能拿到同一状态机实例。

## 代码位置与引用
- 状态机定义：`src/views/sidebar/machines/chatMachine.ts`
- 原始调用点：`src/views/sidebar/index.tsx:693`（`useMachine(chatMachine)`）将改为 `useInterpret/useActor` 并通过 Provider 共享。

确认后我将：
- 创建 `chatStateContext.tsx` 文件（含函数级注释）。
- 更新 `index.tsx` 引入 Provider、替换 `useMachine`。
- 更新 `chat-input.tsx` 及其子组件使用 `useChatState()`，移除 props 传参。