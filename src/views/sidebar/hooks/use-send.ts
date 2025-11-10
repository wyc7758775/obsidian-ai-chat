import { useState, useCallback } from "react";
import { Message } from "../type";

export const useSend = ({
  textareaRef,
}: {
  textareaRef: React.RefObject<HTMLDivElement>;
}) => {
  const [inputValue, setInputValue] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  const adjustTextareaHeight = useCallback(() => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const minHeight = 20;

    // 重置高度
    textarea.style.height = "auto";

    // 获取内容高度
    const contentHeight = textarea.scrollHeight;

    // 设置新高度（不限制最大值）
    const newHeight = Math.max(minHeight, contentHeight);
    textarea.style.height = `${newHeight}px`;

    // 确保没有滚动条
    textarea.style.overflowY = "hidden";

    // 可选：如果高度变化很大，滚动到输入框位置
    if (contentHeight > 100) {
      setTimeout(() => {
        textarea.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }, 0);
    }
  }, []);

  const clearInput = useCallback(() => {
    setInputValue("");
    if (textareaRef.current) {
      textareaRef.current.textContent = "";
      textareaRef.current.innerHTML = "";
      // 重新设置焦点
      textareaRef.current.focus();
    }
  }, []);

  const getMessageParams = (): Message => {
    return {
      id: Date.now().toString(),
      content: inputValue,
      type: "user",
    };
  };
  const getAiMessageParams = (): Message => {
    return {
      id: (Date.now() + 1).toString(),
      content: "",
      type: "assistant",
    };
  };
  const onSend = (): { userParams: Message; aiParams: Message } | undefined => {
    if (!inputValue.trim()) return;
    if (isStreaming) return;

    setIsStreaming(true); // 在发送时立即设置为 streaming 状态
    clearInput();

    return {
      userParams: getMessageParams(),
      aiParams: getAiMessageParams(),
    };
  };

  const keyPressSend = (e: React.KeyboardEvent, callBack: () => void) => {
    if (isStreaming) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      callBack();
    }
  };
  return {
    isStreaming,
    setIsStreaming,
    onSend,
    keyPressSend,
    inputValue,
    setInputValue,
    adjustTextareaHeight,
  };
};
