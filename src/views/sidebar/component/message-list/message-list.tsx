import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { App } from "obsidian";
import { Message } from "../../type";
import { NoteContextService } from "../../../../core/fs-context/note-context";
import {
  CopyIcon,
  GenerateIcon,
  RegenerateIcon,
  ShareIcon,
} from "../../../../ui/icon";
import styles from "../../css/message-list.module.css";
import { useMarkdownRenderer } from "../hooks/use-markdown-renderer";
import { useScrollToBottom } from "./use-scroll-to-bottom";
import { useShare } from "./use-share";
import { messageEmptyRender } from "./message-empty";

import ReactMarkdown from "react-markdown";

// 滚动位置缓存，用于保存每个历史记录的滚动位置
const scrollPositionCache = new Map<string, number>();

export interface ChatMessageProps {
  messages: Message[];
  app: App;
  isLoading: boolean;
  onNearBottomChange?: (near: boolean) => void;
  currentId?: string; // 当前历史记录ID，用于滚动位置管理
  onRegenerateMessage?: (messageIndex: number) => void; // 重新生成消息的回调
  onInsertSuggestion?: (text: string) => void; // 点击建议后插入到输入框
  suggestions?: string[]; // 设置中自定义的建议提示词（最多10条）
}

export type ChatMessageHandle = {
  scrollToBottom: () => void;
  isNearBottom: boolean;
};

export const ChatMessage = forwardRef<ChatMessageHandle, ChatMessageProps>(
  (
    {
      messages,
      app,
      isLoading,
      onNearBottomChange,
      currentId,
      onRegenerateMessage,
      onInsertSuggestion,
      suggestions,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const containersRef = useRef<Record<string, Message[]>>({});
    const shownIdsRef = useRef<Set<string>>(new Set());
    const {
      endRef: messagesEndRef,
      isNearBottom,
      scrollToBottom,
    } = useScrollToBottom([messages], {
      containerRef,
      nearBottomPx: 50,
      behavior: "smooth",
    });

    const buildMarkdownProps = useMarkdownRenderer();
    const { shareToImg } = useShare();

    const handleShare = async (question: string, answer: string) => {
      return await shareToImg(question, answer);
    };

    const noteContextService = new NoteContextService(app);
    // 创建新笔记
    const createFile = async (content: string, index: number) => {
      const confirmed = await new Promise<boolean>((resolve) => {
        resolve(
          confirm(
            "确定要将此条 AI 回复创建为新笔记吗？ 笔记名为：" +
              messages[index - 1]?.content
          )
        );
      });
      if (!confirmed) return;

      noteContextService.createNote({
        title: messages[index - 1]?.content ?? "",
        content,
      });
    };

    // 同步当前会话的消息到本地容器映射
    useEffect(() => {
      if (!currentId) return;
      containersRef.current[currentId] = messages ?? [];
      if (!shownIdsRef.current.has(currentId)) {
        shownIdsRef.current.add(currentId);
      }
    }, [currentId, messages]);

    // 保存当前滚动位置到缓存（仅针对激活容器）
    useEffect(() => {
      const el = containerRef.current;
      if (!el || !currentId) return;

      const saveScrollPosition = () => {
        scrollPositionCache.set(currentId, el.scrollTop);
      };

      el.addEventListener("scroll", saveScrollPosition, { passive: true });
      return () => el.removeEventListener("scroll", saveScrollPosition);
    }, [currentId]);

    // 恢复滚动位置（仅针对激活容器），无缓存时默认滚动到底部
    useEffect(() => {
      const el = containerRef.current;
      if (!el || !currentId) return;

      const savedPosition = scrollPositionCache.get(currentId);
      requestAnimationFrame(() => {
        if (savedPosition !== undefined) {
          el.scrollTop = savedPosition;
        } else {
          scrollToBottom();
        }
      });
    }, [currentId, messages]);

    // 监听滚动并向父组件报告是否需要显示“滚到底部”按钮
    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      const hasScroll = el.scrollHeight > el.clientHeight;

      const shouldShow = hasScroll && !isNearBottom;
      onNearBottomChange?.(shouldShow);
    }, [isNearBottom]);

    useImperativeHandle(
      ref,
      () => ({
        scrollToBottom,
        isNearBottom,
      }),
      [isNearBottom, scrollToBottom]
    );

    const messageList = (messages: Message[]) => {
      const messageItem = (message: Message, index: number) => {
        let render = null;

        if (message.type === "user") {
          render = (
            <div className={styles.userMessage}>
              <div className={styles.userBubble}>
                <div className={styles.userContent}>{message.content}</div>
              </div>
            </div>
          );
        }

        if (message.type === "assistant") {
          render = (
            <div className={styles.assistantMessage}>
              <div className={styles.assistantText}>
                {(() => {
                  const { remarkPlugins, rehypePlugins, components } =
                    buildMarkdownProps(message.content);
                  return (
                    <ReactMarkdown
                      remarkPlugins={remarkPlugins as any}
                      rehypePlugins={rehypePlugins as any}
                      components={components as any}
                    >
                      {message.content}
                    </ReactMarkdown>
                  );
                })()}
              </div>
              {isLoading &&
              index === messages.length - 1 &&
              message.type === "assistant" ? (
                <div className={styles.typing} aria-label="AI生成中">
                  thinking
                  <span className={styles.dot}></span>
                  <span className={styles.dot}></span>
                  <span className={styles.dot}></span>
                </div>
              ) : (
                <div className={styles.messageActions}>
                  <CopyIcon
                    onClick={() =>
                      navigator.clipboard.writeText(message.content)
                    }
                  />
                  {index === messages.length - 1 && (
                    <GenerateIcon
                      onClick={() => createFile(message.content, index)}
                    />
                  )}
                  <RegenerateIcon
                    onClick={() => onRegenerateMessage?.(index)}
                  />
                  <ShareIcon
                    onClick={() =>
                      handleShare(messages[index - 1]?.content, message.content)
                    }
                  />
                </div>
              )}
            </div>
          );
        }
        return render;
      };

      return (
        <>
          {messages.map((message, index) => (
            <div
              className={`${styles.messageWrapper} yoran-message-${message.type}`}
              key={message.id}
            >
              {messageItem(message, index)}
            </div>
          ))}
        </>
      );
    };

    /**
     * 空消息状态渲染：优先使用设置中的建议（最多10条），否则使用默认建议。
     * @param message 当前消息列表
     */
    const messageEmpty = (message: Message[]) => {
      if (message.length !== 0) return null;

      return messageEmptyRender();
    };

    const allIds = Object.keys(containersRef.current).length
      ? Object.keys(containersRef.current)
      : currentId
      ? [currentId]
      : [];

    return (
      <>
        {allIds.map((sid) => {
          const isActive = sid === currentId;
          const msgs = isActive ? messages : containersRef.current[sid] ?? [];
          const everShown = shownIdsRef.current.has(sid);
          return (
            <div
              key={sid}
              className={styles.messagesContainer}
              style={{
                display: isActive ? "block" : "none",
                animation: isActive && everShown ? "none" : undefined,
              }}
              ref={isActive ? containerRef : null}
            >
              {messageList(msgs)}
              {messageEmpty(msgs)}
              <div ref={isActive ? messagesEndRef : null}></div>
            </div>
          );
        })}
      </>
    );
  }
);
