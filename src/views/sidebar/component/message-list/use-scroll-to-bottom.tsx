import { useRef, useEffect, useState, useCallback } from "react";

// 在视区到底部时，持续将列表滚动到底部
// 使用示例：
// const { endRef } = useScrollToBottom([messages]);
// ...
// <div ref={endRef}></div>

type Options = {
  // 可选：传入滚动容器的 ref（默认使用视口）
  containerRef?: React.RefObject<HTMLElement>;
  // 认为"接近底部"的距离（像素）
  nearBottomPx?: number;
  // 滚动行为：smooth/auto
  behavior?: ScrollBehavior;
};
export const useScrollToBottom = (
  triggerDeps: any[] = [],
  options: Options = {}
) => {
  const { containerRef, nearBottomPx = 120, behavior = "smooth" } = options;
  const endRef = useRef<HTMLDivElement>(null);
  // 这里用 isNearBottom 来表达"接近底部"的语义，并兼容旧的 isAtBottom 命名
  const [isNearBottom, setIsNearBottom] = useState(true);

  // 新增状态：用户是否主动滚动了
  const [userScrolled, setUserScrolled] = useState(false);
  // 记录上次自动滚动的时间，用于区分用户滚动和自动滚动
  const lastAutoScrollTime = useRef<number>(0);
  // 用于防抖的定时器
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  const scrollToBottom = useCallback(() => {
    const container = containerRef?.current;
    // 记录自动滚动时间
    lastAutoScrollTime.current = Date.now();

    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior });
    } else {
      endRef.current?.scrollIntoView({ behavior });
    }

    // 重置用户滚动状态，因为这是程序触发的滚动
    setUserScrolled(false);
  }, [containerRef, behavior]);

  // 当处于底部（或接近底部）且触发依赖更新时，自动滚动到底部
  // 新增条件：只有在用户没有主动滚动的情况下才自动滚动
  useEffect(() => {
    if (isNearBottom && !userScrolled) {
      // 在下一帧滚动，避免布局抖动（流式渲染时更稳定）
      requestAnimationFrame(() => scrollToBottom());
    }
  }, [isNearBottom, userScrolled, scrollToBottom, ...triggerDeps]);

  // 使用 IntersectionObserver 检测"接近底部"状态
  useEffect(() => {
    const sentinel = endRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        console.log("组织爆炸行为。", entry.isIntersecting);
        setIsNearBottom(entry.isIntersecting);
      },
      {
        root: containerRef?.current ?? null,
        rootMargin: `0px 0px ${nearBottomPx}px 0px`,
        threshold: 0,
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [containerRef, nearBottomPx, ...triggerDeps]);

  // 额外的滚动事件监听，作为兜底（确保在容器内准确计算"接近底部"）
  // 同时检测用户主动滚动
  useEffect(() => {
    const el = containerRef?.current;
    if (!el) return;

    const onScroll = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      const nearBottom = distance <= nearBottomPx;
      setIsNearBottom(nearBottom);

      // 检测用户主动滚动
      const now = Date.now();
      const timeSinceAutoScroll = now - lastAutoScrollTime.current;

      // 如果距离上次自动滚动超过100ms，且用户不在底部，认为是用户主动滚动
      if (timeSinceAutoScroll > 100 && !nearBottom) {
        setUserScrolled(true);

        // 清除之前的定时器
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }

        // 设置定时器：如果用户滚动到底部附近，重置用户滚动状态
        scrollTimeoutRef.current = setTimeout(() => {
          if (nearBottom) {
            setUserScrolled(false);
          }
        }, 500); // 500ms后检查是否在底部
      }

      // 如果用户滚动到底部附近，立即重置用户滚动状态
      if (nearBottom && userScrolled) {
        setUserScrolled(false);
      }
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    // 初始化一次状态
    onScroll();

    return () => {
      el.removeEventListener("scroll", onScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [containerRef, nearBottomPx, userScrolled]);

  return {
    endRef,
    isAtBottom: isNearBottom,
    isNearBottom,
    scrollToBottom,
    userScrolled, // 暴露用户滚动状态，供调试使用
  };
};
