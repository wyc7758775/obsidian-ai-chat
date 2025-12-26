import {
  useRef,
  useState,
  useLayoutEffect,
  useEffect,
  useCallback,
} from "react";
import styles from "./css/styles.module.css";

export type UseWaterfallLayoutOptions = {
  /** 是否处于激活状态（仅历史视图展开时计算布局） */
  active: boolean;
  /** 卡片数量，用于在列表变化时触发布局重新计算 */
  itemsCount: number;
  /** 可选的卡片引用数组，如果不提供则内部创建 */
  cardRefs?: React.MutableRefObject<(HTMLDivElement | null)[]>;
};

/**
 * useWaterfallLayout
 * 封装历史记录卡片的瀑布流布局逻辑。
 */
export const useWaterfallLayout = (options: UseWaterfallLayoutOptions) => {
  const {
    active,
    itemsCount,
    cardRefs: externalCardRefs,
  } = options || { active: false, itemsCount: 0 };

  const containerRef = useRef<HTMLDivElement>(null);
  const internalCardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cardRefs = externalCardRefs || internalCardRefs;
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
      Math.floor((containerWidth + gap) / (cardWidth + gap)),
    );
    const actualCardWidth = (containerWidth - gap * (columns - 1)) / columns;

    const columnHeights = new Array(columns).fill(0);

    cardRefs.current.forEach((cardEl) => {
      if (!cardEl) return;
      const shortestColumnIndex = columnHeights.indexOf(
        Math.min(...columnHeights),
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

export const WaterfallWrapper = ({
  itemsCount,
  children,
  cardRefs,
}: {
  itemsCount: number;
  children: React.ReactNode;
  cardRefs?: React.MutableRefObject<(HTMLDivElement | null)[]>;
}) => {
  const { containerRef, containerHeight } = useWaterfallLayout({
    active: true,
    itemsCount,
    cardRefs,
  });
  return (
    <div
      ref={containerRef}
      className={styles.historyExpandList}
      style={{
        height: containerHeight > 0 ? `${containerHeight + 30}px` : "30vh",
        maxHeight: "50vh", // 最大高度限制，防止过高
      }}
    >
      {children}
    </div>
  );
};
