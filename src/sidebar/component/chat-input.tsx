import { RefObject } from "react";

export const ChatInput= ({
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

  return (
        <div className="yoran-input-wrapper">
          <div
            ref={textareaRef}
            contentEditable
            suppressContentEditableWarning={true}
            onInput={handleInputChange}
            onKeyDown={handleKeyPress}
            onBlur={blurCallBack}
            data-placeholder="输入消息... (Enter 发送, Shift+Enter 换行, @ 选择笔记)"
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
  )
}