## 目标
- 让列表项标题过长时出现省略号，并在鼠标悬停时显示完整内容的工具提示，风格接近 el-tooltip。
- 适度收窄标题可视宽度，避免撑破布局。

## 拟改动文件
- 编辑：`src/views/sidebar/css/note-selector.module.css`（收窄 `.fileTitle` 最大宽度）
- 编辑：`src/views/sidebar/component/note-selector.tsx`（为标题包裹 Tooltip 组件）
- 新增：`src/views/sidebar/component/ellipsis-tooltip.tsx`（复用组件）
- 新增：`src/views/sidebar/css/ellipsis-tooltip.module.css`（组件样式）

## 技术实现
### EllipsisTooltip 组件
- Props：`content: string; children: ReactNode; maxWidth?: number`。
- 行为：
  - 渲染子元素（通常是标题 `span`），强制单行省略：由外层样式控制。
  - 在 `onMouseEnter` 时检测是否溢出：`el.scrollWidth > el.clientWidth`。
  - 若溢出，创建浮层：
    - 使用 `position: fixed`，根据 `getBoundingClientRect()` 定位到元素下方偏移 6–8px。
    - 浮层宽度自适应内容，最大宽度与容器保持一致（如 420px），支持换行；主题颜色遵循现有变量（`--background-secondary`、`--text-normal`、`--background-modifier-border`）。
  - `onMouseLeave`/滚动/窗口变化时隐藏或重算位置。
- 无障碍：为子元素补充 `title` 与 `aria-label`，在禁用浮层或无溢出时也能用原生 tooltip。
- 函数级注释：在组件与关键函数上添加，说明输入有效性与特殊情况。

### note-selector 集成
- 将文件标题处：`<span className={styles.fileTitle}>{note.title}</span>` 改为：
  - `<EllipsisTooltip content={note.title}><span className={styles.fileTitle}>{note.title}</span></EllipsisTooltip>`。
- 保持事件绑定和 DOM 结构不变，避免影响选择交互与 hover 高亮。

### 样式调整
- `.fileTitle`：
  - 收窄最大宽度到 `max-width: 28ch`（从当前 44ch，下调以提升紧凑度），继续保留 `overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`。
- `ellipsis-tooltip.module.css`：
  - 浮层容器：圆角 8px、边框 1px、阴影轻量（与现有按钮 hover 统一的灰底渐变），内边距 `8px 10px`；
  - 箭头（可选）：简单三角形或不显示，保持简洁；
  - z-index 高于弹层列表但低于全局模态。

## 边界与特殊情况
- 空内容或全空白：不显示浮层，仅保留原生 `title`。
- 无溢出：不显示浮层，避免无意义提示。
- 极窄容器：浮层宽度限制，必要时向上方显示以防遮挡。
- 可访问性：提供 `role="tooltip"`，并在触发元素设置 `aria-describedby`。

## 验证方案
- 使用多种长度标题（短/中/超长）检查省略号与 tooltip 展示。
- 在暗色与浅色主题下确认对比度与阴影表现。
- 滚动、窗口缩放、列表变更时，浮层位置重算正确且不抖动。
- 事件不干扰选择：`onMouseDown` 选择仍正常，hover 只影响展示。

## 交付结果
- 新增可复用的 `EllipsisTooltip` 组件，可在其他列表/标签中复用。
- Note Selector 标题更紧凑、长文本可悬浮查看完整内容，交互与视觉与现有体系一致。