## 问题原因定位
- 悬浮不出现：`ellipsis-tooltip.module.css` 文件首行存在无效选择器字符（开头一个孤立的 “.”），可能导致样式模块解析异常，进而影响锚点区域与浮层样式；同时溢出检测仅对子元素进行，但需确保包裹容器具备 `min-width: 0` 与正确的布局。
- 图标与文本不对齐：图标容器未设置统一尺寸与行高，且未使用 `inline-flex`，在不同字体行高下产生基线偏差。

## 修改方案
### 1. 修复 Tooltip 样式与触发区域
- 移除 `src/views/sidebar/css/ellipsis-tooltip.module.css` 首行的无效字符，确保 CSS Modules 正常输出 `ellipsisAnchor/tooltip` 等类。
- 保留 `inline-flex + flex: 1 + min-width: 0` 的锚点布局，确保整行可触发悬浮。
- 维持 `position: fixed; z-index: 9999; pointer-events: none` 的浮层设置，避免裁剪与交互冲突。

### 2. 加强溢出判断与定位稳健性（组件层）
- 已改为对子元素（标题 `span`）进行溢出检测：`scrollWidth > clientWidth`；继续保留基于子元素 `getBoundingClientRect()` 的定位，并对横向边界进行裁剪。
- 若内容为空或无溢出，保持不展示浮层，同时保留 `title/aria-label` 作为降级方案。

### 3. 图标与文本对齐调整（列表样式）
- 统一设置 `.mentionAllIcon`：`inline-flex`、`width/height: 16px`、`align-items: center`、`justify-content: center`、`line-height: 1`，与 SVG 尺寸一致。
- 确保 `.fileOption` 仍为 `display: flex; align-items: center;`，并保持 `gap` 一致性（如 `8px`），避免文本与图标挤压。

### 4. 宽度与省略号
- `.fileTitle` 保持 `max-width: 28ch; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`，确保在窄布局下稳定出现省略号。

## 交付文件
- 更新：`src/views/sidebar/css/ellipsis-tooltip.module.css`（移除无效首行，确保样式模块可用）
- 更新：`src/views/sidebar/css/note-selector.module.css`（图标对齐增强：添加 `line-height: 1` 与必要的间距）

## 验证
- 使用超长标题验证：出现省略号后，鼠标悬停显示完整浮层；滚动与窗口缩放时不抖动且自动关闭或重算位置。
- 检查暗/浅色主题对比度；检查图标与文本在所有项中的垂直居中对齐。

请确认后我立即实施上述修改并回归验证。