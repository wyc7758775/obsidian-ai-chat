import { useState, useCallback } from "react";
import { Message } from "../type";
import { yoranChatSettings } from "src/main";
import { ChatMessage } from "../../../core/ai/utils/token-utils";
import {
  manageContextMessages,
  manageArticleContent,
} from "../../../core/ai/openai";

export const useSend = ({
  textareaRef,
  isStreaming,
}: {
  textareaRef: React.RefObject<HTMLDivElement>;
  isStreaming: boolean;
}) => {
  const [inputValue, setInputValue] = useState<string>("");

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
    onSend,
    keyPressSend,
    inputValue,
    setInputValue,
    adjustTextareaHeight,
  };
};

/**
 * 构建消息数组
 * 将系统提示、笔记上下文、历史对话和用户输入组合成完整的消息数组
 */
export const constructMessage = (
  settings: yoranChatSettings,
  inputValue: string,
  notePrompts?: string[],
  contextMessages?: Array<ChatMessage>,
  systemMessage?: string,
): ChatMessage[] => {
  const messages: ChatMessage[] = [];

  // 添加系统提示（合并基础系统提示和自定义系统消息）
  const systemMessages: string[] = [];

  // 首先添加基础系统提示
  if (settings.systemPrompt) {
    systemMessages.push(settings.systemPrompt);
  }

  // 然后添加自定义系统消息
  if (systemMessage) {
    systemMessages.push(systemMessage);
  }

  // 如果有系统消息，合并后添加到消息数组
  if (systemMessages.length > 0) {
    messages.push({
      role: "system",
      content: systemMessages.join("\n\n"),
    });
  }

  // 计算token分配策略
  const totalTokens = settings.maxContextTokens;
  const articleTokenRatio = 0.65; // 文章内容占65%
  const contextTokenRatio = 0.25; // 历史对话占25%
  // 剩余10%留给系统消息和用户输入

  const maxArticleTokens = Math.floor(totalTokens * articleTokenRatio);
  const maxContextTokens = Math.floor(totalTokens * contextTokenRatio);

  // 添加笔记上下文（智能管理文章内容）
  if (notePrompts?.length) {
    const managedArticleMessages = manageArticleContent(
      notePrompts,
      maxArticleTokens,
      inputValue,
    );
    messages.push(...managedArticleMessages);
  }

  // 添加历史对话（智能管理上下文长度）
  if (contextMessages?.length) {
    const hasArticleContent = Boolean(notePrompts?.length);
    const managedContextMessages = manageContextMessages(
      contextMessages,
      maxContextTokens,
      hasArticleContent,
    );
    messages.push(...managedContextMessages);
  }

  // 添加用户输入
  messages.push({
    role: "user",
    content: inputValue,
  });

  return messages;
};
