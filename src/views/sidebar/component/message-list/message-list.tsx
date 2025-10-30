import React, {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { App } from "obsidian";
import { Message } from "../../type";
import { NoteContextService } from "../../../../core/fs-context/note-context";
import { CopyIcon, GenerateIcon, RegenerateIcon, ShareIcon } from "../icon";
import styles from "../../css/message-list.module.css";
import { useMarkdownRenderer } from "../use-markdown-renderer";
import { useScrollToBottom } from "./use-scroll-to-bottom";

import ShareCard from '../share-card';
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
}

export type ChatMessageHandle = {
  scrollToBottom: () => void;
  isNearBottom: boolean;
};

export const ChatMessage = forwardRef<ChatMessageHandle, ChatMessageProps>(
  ({ messages, app, isLoading, onNearBottomChange, currentId, onRegenerateMessage }, ref) => {
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
      const cardElement = document.createElement('div');
      // Hide the element from the user's view
      cardElement.style.position = 'absolute';
      cardElement.style.left = '-9999px';
      cardElement.style.width = '400px';
      document.body.appendChild(cardElement);

      const questionNode = <ReactMarkdown {...buildMarkdownProps(question) as any}>{question}</ReactMarkdown>;
      const answerNode = <ReactMarkdown {...buildMarkdownProps(answer) as any}>{answer}</ReactMarkdown>;

      const card = <ShareCard question={questionNode} answer={answerNode} />;

      const { default: ReactDOM } = await import('react-dom');
      ReactDOM.render(card, cardElement);

      // Give React time to render
      await new Promise(resolve => setTimeout(resolve, 200));

      try {
        const domtoimage = (await import('dom-to-image-more')).default;
        const dataUrl = await domtoimage.toPng(cardElement, {
          // It is recommended to specify the pixel ratio of the device to ensure the image is clear
          pixelRatio: window.devicePixelRatio,
          // Set a background color to prevent transparency issues
          bgcolor: getComputedStyle(document.body).getPropertyValue('--background-primary').trim() || '#ffffff',
          // Copy all styles from the original document to the cloned one
          style: {
            // This ensures that all styles are copied
            ...Object.fromEntries(
              Array.from(document.styleSheets)
                .flatMap(sheet => Array.from(sheet.cssRules))
                .filter(rule => rule instanceof CSSStyleRule)
                .map(rule => [(rule as CSSStyleRule).selectorText, rule.cssText])
            ),
          },
        });
        
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = 'yoran-chat-share.png';
        link.click();

      } catch (error) {
        console.error('Oops, something went wrong!', error);
      } finally {
        // Clean up the temporary element
        document.body.removeChild(cardElement);
      }
    };


    const noteContextService = new NoteContextService(app);
    // 创建新笔记
    const createFile = (content: string, index: number) => {
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
                  <ShareIcon onClick={() => handleShare(messages[index - 1]?.content, message.content)} />
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

    const messageEmpty = (message: Message[]) => {
      if (message.length === 0) {
        return (
          <div className={styles.logo}>
            <svg style={{ position: "absolute", width: 0, height: 0 }}>
              <filter id="pencilTexture">
                <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="3" result="noise" />
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" result="pencil" />
                <feGaussianBlur in="pencil" stdDeviation="0.2" result="blurred" />
                <feBlend in="SourceGraphic" in2="blurred" mode="multiply" />
              </filter>
            </svg>
            <div className={styles.container}>
              <div className={styles.cat}>
                <div className={styles.head}>
                  <div className={`${styles.ear} ${styles.left}`}></div>
                  <div className={`${styles.ear} ${styles.right}`}></div>
                  <div className={`${styles.eye} ${styles.left}`}></div>
                  <div className={`${styles.eye} ${styles.right}`}></div>
                  <div className={styles.nose}></div>
                  <div className={`${styles.mouth} ${styles.left}`}></div>
                  <div className={`${styles.mouth} ${styles.right}`}></div>
                  <div className={`${styles.whisker} ${styles.left1}`}></div>
                  <div className={`${styles.whisker} ${styles.left2}`}></div>
                  <div className={`${styles.whisker} ${styles.right1}`}></div>
                  <div className={`${styles.whisker} ${styles.right2}`}></div>
                  <div className={`${styles.blush} ${styles.left}`}></div>
                  <div className={`${styles.blush} ${styles.right}`}></div>
                </div>
                <div className={styles.body}>
                  <div className={styles.heart}></div>
                </div>
                <div className={styles.tail}></div>
              </div>
            </div>
            <div className={styles.gameText}>No messages, start a conversation!</div>
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
