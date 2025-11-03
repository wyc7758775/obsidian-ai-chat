import {
  useRef,
  useState,
  useLayoutEffect,
  useEffect,
  useCallback,
} from "react";

export type UseWaterfallLayoutOptions = {
  /** 是否处于激活状态（仅历史视图展开时计算布局） */
  active: boolean;
  /** 卡片数量，用于在列表变化时触发布局重新计算 */
  itemsCount: number;
};

/**
 * useWaterfallLayout
 * 封装历史记录卡片的瀑布流布局逻辑。
 *
 * 参数校验与边界处理：
 * - active 为 false 或容器未挂载时，不进行布局计算，避免不必要的操作。
 * - itemsCount 小于等于 0 时，容器高度重置为 0，避免残留高度影响滚动。
 * - 在窗口大小或容器尺寸变化时使用 ResizeObserver 自动重新计算布局。
 *
 * 返回值：
 * - containerRef：历史列表容器引用。
 * - cardRefs：每个历史卡片的引用数组（按索引顺序）。
 * - containerHeight：计算后的容器高度。
 */
export const useWaterfallLayout = (options: UseWaterfallLayoutOptions) => {
  const { active, itemsCount } = options || { active: false, itemsCount: 0 };

  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [containerHeight, setContainerHeight] = useState(0);

  /**
   * 计算瀑布流布局。
   * - 使用固定卡片宽度与间距计算列数与每列高度。
   * - 将每张卡片定位到最短列，更新其 CSS 位置与宽度。
   */
  const calculateWaterfallLayout = useCallback(() => {
    if (!active || !containerRef.current) {
      // 非激活状态或容器未挂载时跳过计算
      if (itemsCount <= 0) setContainerHeight(0);
      return;
    }

    const container = containerRef.current;
    const containerWidth = container.clientWidth - 32; // 左 20px + 右 12px 留白
    const cardWidth = 180;
    const gap = 12;
    const columns = Math.max(
      1,
      Math.floor((containerWidth + gap) / (cardWidth + gap))
    );
    const actualCardWidth = (containerWidth - gap * (columns - 1)) / columns;

    const columnHeights = new Array(columns).fill(0);

    cardRefs.current.forEach((cardEl) => {
      if (!cardEl) return;
      const shortestColumnIndex = columnHeights.indexOf(
        Math.min(...columnHeights)
      );
      const left = shortestColumnIndex * (actualCardWidth + gap) + 20; // 左边距 20px
      const top = columnHeights[shortestColumnIndex] + 24; // 容器上内边距 24px

      cardEl.style.left = `${left}px`;
      cardEl.style.top = `${top}px`;
      cardEl.style.width = `${actualCardWidth}px`;

      columnHeights[shortestColumnIndex] += cardEl.offsetHeight + gap;
    });

    const maxHeight = Math.max(...columnHeights);
    setContainerHeight(itemsCount > 0 ? maxHeight : 0);
  }, [active, itemsCount]);

  // 列表或激活状态变化时重新计算
  useLayoutEffect(() => {
    calculateWaterfallLayout();
  }, [calculateWaterfallLayout]);

  // 容器尺寸变化时重新计算
  useEffect(() => {
    if (!active) return;
    const resizeObserver = new ResizeObserver(() => {
      calculateWaterfallLayout();
    });
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [active, calculateWaterfallLayout]);

  return { containerRef, cardRefs, containerHeight };
};
