import styles from "./css/ai-chat.module.css";

export const useScrollToBottom = <T extends () => void>(onClickBack: T) => {
  const handleClick = () => {
    onClickBack();
    // messageListRef.current?.scrollToBottom?.();
  };

  const ScrollToBottomRender = ({ disabled }: { disabled: boolean }) => {
    return (
      <div className={styles.scrollToBottomBtnContainer}>
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
  };

  return {
    ScrollToBottomRender,
  };
};
