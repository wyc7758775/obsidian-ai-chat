import { RefObject, useEffect, useState } from "react";
import styles from "../css/chat-input.module.css";

const PLACEHOLDER = " 询问一个问题... (按下@ 选择笔记)";
export const ChatInput = ({
  textareaRef,
  handleInputChange,
  handleKeyPress,
  handleSend,
  handleCancelStream,
  blurCallBack,
  inputValue,
  isStreaming,
}: {
  textareaRef: RefObject<HTMLDivElement>;
  handleInputChange: (e: React.ChangeEvent<HTMLDivElement>) => void;
  handleKeyPress: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  handleSend: () => void;
  handleCancelStream: () => void;
  blurCallBack?: () => void;
  inputValue: string;
  isStreaming: boolean;
}) => {
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  useEffect(() => {
    const isEmpty =
      !inputValue.trim() &&
      (!textareaRef.current?.textContent?.trim() ||
        textareaRef.current?.textContent?.trim() === "");

    setShowPlaceholder(isEmpty);
  }, [inputValue, textareaRef]);

  return (
    <div className={styles.inputWrapper}>
      {/* 占位符层 */}
      {showPlaceholder && (
        <div className={styles.inputPlaceholder}>{PLACEHOLDER}</div>
      )}

      <div
        ref={textareaRef}
        contentEditable
        suppressContentEditableWarning={true}
        onInput={(e: React.ChangeEvent<HTMLDivElement>) => {
          handleInputChange(e);
        }}
        onKeyDown={handleKeyPress}
        onBlur={() => {
          // 触发外部 blur 回调，延迟处理已在父组件中实现
          blurCallBack?.();
        }}
        className={styles.inputDiv + " " + styles.inputField}
      />
      {isStreaming ? (
        <button
          onClick={handleCancelStream}
          className={styles.cancelBtn + " " + styles.mr8}
          title="停止生成"
        >
          ⏸
        </button>
      ) : (
        <button
          onClick={handleSend}
          className={styles.sendBtn + " " + styles.mr8}
          disabled={!inputValue.trim()}
          title="发送消息"
        >
          ➤
        </button>
      )}
    </div>
  );
};
