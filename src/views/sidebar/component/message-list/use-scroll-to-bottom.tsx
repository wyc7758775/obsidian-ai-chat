import { useRef, useEffect, useState } from "react";

type Options = {
  // 可选：传入滚动容器的 ref（默认使用视口）
  containerRef?: React.RefObject<HTMLElement>;
  // 认为“接近底部”的距离（像素）
  nearBottomPx?: number;
  // 滚动行为：smooth/auto
  behavior?: ScrollBehavior;
};

// 在视区到底部时，持续将列表滚动到底部
// 使用示例：
// const { endRef } = useScrollToBottom([messages]);
// ...
// <div ref={endRef}></div>
export const useScrollToBottom = (
  triggerDeps: any[] = [],
  options: Options = {}
) => {
  const { containerRef, nearBottomPx = 120, behavior = "smooth" } = options;
  const endRef = useRef<HTMLDivElement>(null);
  // 这里用 isNearBottom 来表达“接近底部”的语义，并兼容旧的 isAtBottom 命名
  const [isNearBottom, setIsNearBottom] = useState(true);

  const scrollToBottom = () => {
    const container = containerRef?.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior });
    } else {
      endRef.current?.scrollIntoView({ behavior });
    }
  };

  // 当处于底部（或接近底部）且触发依赖更新时，自动滚动到底部
  useEffect(() => {
    if (isNearBottom) {
      // 在下一帧滚动，避免布局抖动（流式渲染时更稳定）
      requestAnimationFrame(() => scrollToBottom());
    }
  }, [isNearBottom, ...triggerDeps]);

  // 使用 IntersectionObserver 检测“接近底部”状态
  useEffect(() => {
    const sentinel = endRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        setIsNearBottom(entry.isIntersecting);
      },
      {
        root: containerRef?.current ?? null,
        // 将 root 的底边下扩 nearBottomPx，使得接近底部就算“相交”
        rootMargin: `0px 0px ${nearBottomPx}px 0px`,
        threshold: 0,
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [containerRef, nearBottomPx]);

  // 额外的滚动事件监听，作为兜底（确保在容器内准确计算“接近底部”）
  useEffect(() => {
    const el = containerRef?.current;
    if (!el) return;

    const onScroll = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      setIsNearBottom(distance <= nearBottomPx);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    // 初始化一次状态
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, [containerRef, nearBottomPx]);

  return { endRef, isAtBottom: isNearBottom, isNearBottom, scrollToBottom };
};
