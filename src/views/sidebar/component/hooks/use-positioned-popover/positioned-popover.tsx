/**
 * PositionedPopover 组件
 * 通用的绝对定位弹窗，用于在光标附近展示内容（如 @ 提及文件选择器）。
 * 功能：
 * - 接收外部坐标 (x, y) 与显隐状态 (visible)；
 * - 支持自定义样式、类名与 z-index；
 * - 当 visible 为 false 时不渲染 DOM，避免事件穿透。
 * 边界处理：
 * - 未提供 style 时使用默认绝对定位样式；
 * - zIndex 默认为 1000，可通过 props 覆盖；
 * - 支持 ref 透传，方便父组件获取 DOM 引用。
 */

import { forwardRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./positioned-popover.module.css";

export interface PositionedPopoverProps {
  /** 是否显示弹窗 */
  visible: boolean;
  /** X 坐标位置 */
  x: number;
  /** Y 坐标位置 */
  y: number;
  /** 自定义 CSS 类名 */
  className?: string;
  /** 自定义样式 */
  style?: CSSProperties;
  /** 子组件 */
  children: ReactNode;
  /** z-index 层级，默认为 1000 */
  zIndex?: number;
}

export const PositionedPopover = forwardRef<
  HTMLDivElement,
  PositionedPopoverProps
>(({ visible, x, y, className, style, children, zIndex = 1000 }, ref) => {
  if (!visible) return null;

  const defaultStyle: CSSProperties = {
    position: "absolute", /* 原始逻辑：相对于容器定位 */
    left: `${x}px`,
    top: `${y}px`,
    opacity: visible ? 1 : 0,
    zIndex: visible ? zIndex : -1,
    pointerEvents: visible ? "auto" : "none",
    ...style,
  };

  return (
    <div
      ref={ref}
      className={[styles.popover, className].filter(Boolean).join(" ")}
      style={defaultStyle}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {children}
    </div>
  );
});

PositionedPopover.displayName = "PositionedPopover";