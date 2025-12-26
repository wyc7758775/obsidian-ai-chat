import styles from "../../css/ai-chat.module.css";
import { useMemo, useCallback } from "react";

type BtnProps = { disabled: boolean; visibly: boolean };
// TODO: i18n
export const useScrollToBottom = ({ onClick }: { onClick: () => void }) => {
  const handleClick = useCallback(() => {
    onClick();
  }, [onClick]);
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
