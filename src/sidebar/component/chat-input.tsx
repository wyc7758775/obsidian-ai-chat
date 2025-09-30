import { RefObject, useEffect, useState } from "react";

const PLACEHOLDER = "输入消息... (Enter 发送, Shift+Enter 换行, @ 选择笔记)";
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
    // 检查输入框是否真的为空
    const isEmpty =
      !inputValue.trim() &&
      (!textareaRef.current?.textContent?.trim() ||
        textareaRef.current?.textContent?.trim() === "");

    setShowPlaceholder(isEmpty);
    console.log("输入框状态：", {
      inputValue: `"${inputValue}"`,
      textContent: `"${textareaRef.current?.textContent || ""}"`,
      isEmpty,
    });
  }, [inputValue, textareaRef]);

  return (
    <div className="yoran-input-wrapper">
      {/* 占位符层 */}
      {showPlaceholder && (
        <div
          className="yoran-input-placeholder"
          style={{
            position: "absolute",
            top: "20px",
            left: "14px",
            color: "var(--text-muted)",
            pointerEvents: "none",
            userSelect: "none",
            fontSize: "var(--font-size-base)",
            lineHeight: "1.4",
            zIndex: 1,
          }}
        >
          {PLACEHOLDER}
        </div>
      )}

      <div
        ref={textareaRef}
        contentEditable
        suppressContentEditableWarning={true}
        onInput={handleInputChange}
        onKeyDown={handleKeyPress}
        onBlur={blurCallBack}
        className="yoran-input-field yoran-input-div"
        style={{
          minHeight: "20px",
          maxHeight: "none",
          overflowY: "hidden",
          whiteSpace: "pre-wrap",
          wordWrap: "break-word",
        }}
      />
      {isStreaming ? (
        <button onClick={handleCancelStream} className="yoran-cancel-btn">
          ||
        </button>
      ) : (
        <button
          onClick={handleSend}
          className="yoran-send-btn"
          disabled={!inputValue.trim()}
        >
          ➤
        </button>
      )}
    </div>
  );
};
