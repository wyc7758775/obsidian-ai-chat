import React, { forwardRef } from "react";
import styles from "../css/positioned-popover.module.css";

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
  style?: React.CSSProperties;
  /** 子组件 */
  children: React.ReactNode;
  /** z-index 层级，默认为 1000 */
  zIndex?: number;
}

/**
 * 通用的定位弹窗组件
 * 用于控制组件的绝对定位和显隐状态
 * 支持自定义位置、样式和层级
 */
export const PositionedPopover = forwardRef<
  HTMLDivElement,
  PositionedPopoverProps
>(({ visible, x, y, className, style, children, zIndex = 1000 }, ref) => {
  if (!visible) return;

  const defaultStyle: React.CSSProperties = {
    position: "absolute",
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
    >
      {children}
    </div>
  );
});

PositionedPopover.displayName = "PositionedPopover";
