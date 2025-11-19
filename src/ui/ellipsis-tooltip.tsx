import React, { useEffect, useRef, useState } from "react";
import styles from "../views/sidebar/css/ellipsis-tooltip.module.css";

export type EllipsisTooltipProps = {
  /** 要展示的完整文本内容 */
  content: string;
  /** 子节点（通常是带省略号的文本元素） */
  children: React.ReactNode;
  /** 浮层最大宽度，默认 420px */
  maxWidth?: number;
};

/**
 * EllipsisTooltip（函数级注释）
 * - 说明：当子元素文本发生溢出（出现省略号）时，悬停显示完整内容的浮层。
 * - 输入有效性：`content` 必须为字符串；`maxWidth` 为正数时生效，默认 420。
 * - 特殊情况：
 *   1) 当子元素未溢出时，不展示浮层；
 *   2) 空内容或纯空白时不展示浮层，仅保留原生 title；
 *   3) 在滚动/窗口尺寸变化时自动隐藏或重算位置，避免遮挡和抖动。
 */
export const EllipsisTooltip: React.FC<EllipsisTooltipProps> = ({
  content,
  children,
  maxWidth = 420,
}) => {
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const childRef = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const compute = () => {
    const target = childRef.current || (anchorRef.current?.firstElementChild as HTMLElement);
    const overflow = target.scrollWidth > target.clientWidth;
    if (!overflow || !content || !content.trim()) {
      setVisible(false);
      return false;
    }
    const rect = target.getBoundingClientRect();
    const margin = 8;
    const x = Math.max(margin, Math.min(rect.left, window.innerWidth - margin - (maxWidth || 420)));
    const y = Math.round(rect.bottom + margin);
    setPos({ x: Math.round(x), y });
    return true;
  };

  useEffect(() => {
    const onScroll = () => setVisible(false);
    const onResize = () => {
      if (compute()) setVisible(true);
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const childWithHandlers = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement, {
        ref: (node: HTMLElement) => {
          // 支持函数式与对象式 ref
          childRef.current = node;
          const originalRef = (children as any).ref;
          if (typeof originalRef === "function") originalRef(node);
          else if (originalRef && typeof originalRef === "object") originalRef.current = node;
        },
        onMouseEnter: (e: React.MouseEvent) => {
          (children as any).props?.onMouseEnter?.(e);
          if (compute()) setVisible(true);
        },
        onMouseMove: (e: React.MouseEvent) => {
          (children as any).props?.onMouseMove?.(e);
          if (!visible) {
            if (compute()) setVisible(true);
          }
        },
        onMouseLeave: (e: React.MouseEvent) => {
          (children as any).props?.onMouseLeave?.(e);
          setVisible(false);
        },
        title: content,
        "aria-label": content,
      })
    : children;

  return (
    <span ref={anchorRef} className={styles.ellipsisAnchor}>
      {childWithHandlers}
      {visible && pos && (
        <div
          className={styles.tooltip}
          style={{ left: pos.x, top: pos.y, maxWidth }}
          role="tooltip"
          aria-label={content}
        >
          <div className={styles.tooltipContent}>{content}</div>
        </div>
      )}
    </span>
  );
};
