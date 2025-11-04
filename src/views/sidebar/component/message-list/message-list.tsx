import React, {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { App } from "obsidian";
import { Message } from "../../type";
import { NoteContextService } from "../../../../core/fs-context/note-context";
import {
  CopyIcon,
  GenerateIcon,
  RegenerateIcon,
  ShareIcon,
  AddSmallIcon,
} from "../icon";
import styles from "../../css/message-list.module.css";
import { useMarkdownRenderer } from "../use-markdown-renderer";
import { useScrollToBottom } from "./use-scroll-to-bottom";

import ShareCard from "../share-card";
import ReactMarkdown from "react-markdown";
import { CatLogo } from "./cat-logo";

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

    const handleShare = async (question: string, answer: string) => {
      const cardElement = document.createElement("div");
      // Hide the element from the user's view
      cardElement.style.position = "absolute";
      cardElement.style.left = "-9999px";
      cardElement.style.width = "400px";
      document.body.appendChild(cardElement);

      const questionNode = (
        <ReactMarkdown {...(buildMarkdownProps(question) as any)}>
          {question}
        </ReactMarkdown>
      );
      const answerNode = (
        <ReactMarkdown {...(buildMarkdownProps(answer) as any)}>
          {answer}
        </ReactMarkdown>
      );

      const card = <ShareCard question={questionNode} answer={answerNode} />;

      const { default: ReactDOM } = await import("react-dom");
      ReactDOM.render(card, cardElement);

      // Give React time to render
      await new Promise((resolve) => setTimeout(resolve, 200));

      try {
        const domtoimage = (await import("dom-to-image-more")).default;
        const dataUrl = await domtoimage.toPng(cardElement, {
          // It is recommended to specify the pixel ratio of the device to ensure the image is clear
          pixelRatio: window.devicePixelRatio,
          // Set a background color to prevent transparency issues
          bgcolor:
            getComputedStyle(document.body)
              .getPropertyValue("--background-primary")
              .trim() || "#ffffff",
          // Copy all styles from the original document to the cloned one
          style: {
            // This ensures that all styles are copied
            ...Object.fromEntries(
              Array.from(document.styleSheets)
                .flatMap((sheet) => Array.from(sheet.cssRules))
                .filter((rule) => rule instanceof CSSStyleRule)
                .map((rule) => [
                  (rule as CSSStyleRule).selectorText,
                  rule.cssText,
                ])
            ),
          },
        });

        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = "yoran-chat-share.png";
        link.click();
      } catch (error) {
        console.error("Oops, something went wrong!", error);
      } finally {
        // Clean up the temporary element
        document.body.removeChild(cardElement);
      }
    };

    const noteContextService = new NoteContextService(app);
    // 创建新笔记
    const createFile = async (content: string, index: number) => {
      const confirmed = await new Promise<boolean>((resolve) => {
        // 使用 Obsidian 自带的确认对话框
        resolve(confirm("确定要将此条 AI 回复创建为新笔记吗？"));
      });
      if (!confirmed) return;

      noteContextService.createNote({
        title: messages[index - 1]?.content ?? "",
        content,
      });
    };

    // 保存当前滚动位置到缓存
    useEffect(() => {
      const el = containerRef.current;
      if (!el || !currentId) return;

      const saveScrollPosition = () => {
        scrollPositionCache.set(currentId, el.scrollTop);
      };

      el.addEventListener("scroll", saveScrollPosition, { passive: true });
      return () => el.removeEventListener("scroll", saveScrollPosition);
    }, [currentId]);

    // 恢复滚动位置
    useEffect(() => {
      const el = containerRef.current;
      if (!el || !currentId) return;

      const savedPosition = scrollPositionCache.get(currentId);
      if (savedPosition !== undefined) {
        // 使用 requestAnimationFrame 确保 DOM 已更新
        requestAnimationFrame(() => {
          el.scrollTop = savedPosition;
        });
      }
    }, [currentId, messages]);

    // 监听滚动并向父组件报告是否接近底部（或不可滚动）
    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      const hasScroll = el.scrollHeight > el.clientHeight;
      const near = isNearBottom || !hasScroll;
      onNearBottomChange?.(near);
    }, [isNearBottom, onNearBottomChange]);

    useImperativeHandle(
      ref,
      () => ({
        scrollToBottom,
        isNearBottom,
      }),
      [isNearBottom, scrollToBottom]
    );

    // 滚动到底部动画由父组件通过 ref 暴露的 scrollToBottom 触发

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
                  思考中
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
                  <GenerateIcon
                    onClick={() => createFile(message.content, index)}
                  />
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
     * 当消息列表为空时的占位区域：
     * - 展示猫咪 Logo
     * - 提供四条朴素建议，点击“添加”后将建议文本插入输入框
     */
    /**
     * 空消息状态渲染：优先使用设置中的建议（最多10条），否则使用默认建议。
     * @param message 当前消息列表
     */
    const messageEmpty = (message: Message[]) => {
      if (message.length === 0) {
        const defaultSuggestions: string[] = [
          "请帮我总结这篇笔记的重点并给出行动项",
          "把这段文字润色为更流畅、自然的中文",
          "为这篇文章生成一个结构化大纲（含章节与要点）",
          "指出内容的逻辑问题并给出改进建议",
        ];

        const suggestionsList: string[] =
          Array.isArray(suggestions) && suggestions.length > 0
            ? suggestions.slice(0, 10)
            : defaultSuggestions;

        return (
          <div className={styles.emptyWrap}>
            <CatLogo />
            <div className={styles.suggestionsWrap} aria-label="建议提示">
              {suggestionsList.map((text: string, idx: number) => (
                <div className={styles.suggestionItem} key={idx}>
                  <span className={styles.suggestionText}>{text}</span>
                  <AddSmallIcon onClick={() => onInsertSuggestion?.(text)} />
                </div>
              ))}
            </div>
          </div>
        );
      }
      return null;
    };

    return (
      <div className={styles.messagesContainer} ref={containerRef}>
        {messageList(messages)}
        {messageEmpty(messages)}
        <div ref={messagesEndRef}></div>
      </div>
    );
  }
);
