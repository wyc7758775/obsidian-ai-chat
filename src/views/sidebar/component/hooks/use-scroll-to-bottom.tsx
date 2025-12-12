import styles from "../../css/ai-chat.module.css";
import { useMemo } from "react";

/**
 * useScrollToBottom
 * 回到底部按钮渲染与交互逻辑。
 * 输入参数：`onClickBack` 为点击按钮时的回调函数。
 * 边界处理：当回调不存在或抛错时不影响渲染；按钮禁用时不可交互。
 */
/**
 * useScrollToBottom
 * 渲染“回到底部”按钮，并提供稳定的点击回调与组件引用。
 * 输入参数：`onClickBack` 点击按钮回调函数。
 * 边界处理：按钮禁用时不可交互；渲染组件引用稳定，避免因输入导致的重复卸载/挂载。
 */
// UI 样式
// 状态：disabled 禁用状态，visibly 可见状态
// 事件：disabled === false && visibly === true 时点击按钮触发回调
export const useScrollToBottom = ({ onClick }: { onClick: () => void }) => {
  const handleClick = () => {
    onClick();
  };

  type BtnProps = { disabled: boolean; visibly: boolean };
  const ScrollToBottom = useMemo(() => {
    return ({ disabled, visibly }: BtnProps) => (
      <div
        className={`${styles.scrollToBottomBtnContainer} ${
          visibly ? styles.show : styles.hide
        }`}
      >
        <button
          className={styles.scrollToBottomBtn}
          onClick={handleClick}
          aria-label="滚动到底部"
          title="滚动到底部"
          disabled={disabled}
        >
          ↓
        </button>
      </div>
    );
  }, [handleClick]);

  return {
    ScrollToBottom,
  };
};
