import React, { useRef } from "react";
import { App } from "obsidian";
import ReactMarkdown from "react-markdown";
import { Message } from "../../type";
import { NoteContextService } from "../../../../core/fs-context/note-context";
import { CopyIcon, GenerateIcon } from "../icon";
import styles from "../../css/message-list.module.css";
import { useMarkdownRenderer } from "../use-markdown-renderer";
import { useScrollToBottom } from "./use-scroll-to-bottom";

interface ChatMessageProps {
  messages: Message[];
  app: App;
  isLoading: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  messages,
  app,
  isLoading,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { endRef: messagesEndRef } = useScrollToBottom([messages], {
    containerRef,
    nearBottomPx: 160,
    behavior: "smooth",
  });
  const buildMarkdownProps = useMarkdownRenderer();

  const noteContextService = new NoteContextService(app);
  // 创建新笔记
  const createFile = (content: string, index: number) => {
    noteContextService.createNote({
      title: messages[index - 1]?.content ?? "",
      content,
    });
  };

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
              message.type === "assistant" && (
                <div className={styles.typing} aria-label="AI生成中">
                  <span className={styles.dot}></span>
                  <span className={styles.dot}></span>
                  <span className={styles.dot}></span>
                </div>
              )}
            <div className={styles.messageActions}>
              <CopyIcon
                onClick={() => navigator.clipboard.writeText(message.content)}
              />
              <GenerateIcon
                onClick={() => createFile(message.content, index)}
              />
            </div>
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
          <span className={styles.logoTitle}>😊</span>
          <span>请相信美好的事情即将到来🙂</span>
        </div>
      );
    }
  };

  return (
    <div className={styles.messagesContainer} ref={containerRef}>
      {messageList(messages)}
      {messageEmpty(messages)}
      <div ref={messagesEndRef}></div>
    </div>
  );
};
