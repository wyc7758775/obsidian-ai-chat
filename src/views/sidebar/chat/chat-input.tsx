import { RefObject, useEffect, useState } from "react";
import styles from "../css/chat-input.module.css";
import { useChatState } from "../machines/chatStateContext";

const PLACEHOLDER = " 询问一个问题... (按下@ 选择笔记)";

export const ChatInput = ({
  textareaRef,
  inputValue,
  handleInputChange,
  handleKeyPress,
  handleSend,
  handleCancelStream,
  blurCallBack,
}: {
  textareaRef: RefObject<HTMLDivElement>;
  inputValue: string;
  handleInputChange: (e: React.ChangeEvent<HTMLDivElement>) => void;
  handleKeyPress: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  handleSend: () => void;
  handleCancelStream: () => void;
  blurCallBack?: () => void;
}) => {
  const [chatState, chatSend] = useChatState();
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  useEffect(() => {
    const isEmpty =
      !inputValue.trim() &&
      (!textareaRef.current?.textContent?.trim() ||
        textareaRef.current?.textContent?.trim() === "");

    setShowPlaceholder(isEmpty);
  }, [inputValue, textareaRef]);

  useEffect(() => {
    const trimmed = inputValue.trim();
    if (trimmed) {
      chatSend({ type: "ENABLE_CLICK" });
    } else {
      chatSend({ type: "DISABLE_CLICK" });
    }
  }, [inputValue]);

  // TODO: textareaRef 这个是通过外面传进来的，因为要用到的时候很多，但是一看逻辑可以放到 hook
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
        onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
          if (e.key === "Enter" && !e.shiftKey) {
            chatSend({ type: "STREAM_START" });
          }
          handleKeyPress(e);
        }}
        onBlur={() => {
          blurCallBack?.();
        }}
        className={styles.inputDiv + " " + styles.inputField}
      />
      {chatState.matches("streaming") ? (
        <button
          onClick={() => {
            chatSend({ type: "INIT" });
            handleCancelStream();
          }}
          className={styles.cancelBtn + " " + styles.mr8}
          title="停止生成"
        >
          ⏸
        </button>
      ) : (
        <button
          onClick={() => {
            chatSend({ type: "STREAM_START" });
            handleSend();
          }}
          className={styles.sendBtn + " " + styles.mr8}
          disabled={chatState.matches("idle")}
          title="发送消息"
        >
          ➤
        </button>
      )}
    </div>
  );
};
