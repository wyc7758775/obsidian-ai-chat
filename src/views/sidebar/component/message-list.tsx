import React, { useRef, useEffect, useState } from "react";
import { App } from "obsidian";
import ReactMarkdown from "react-markdown";
import { Message } from "../type";
import { NoteContextService } from "../../../core/fs-context/note-context";
import { CopyIcon, GenerateIcon } from "./icon";
import styles from "../css/message-list.module.css";
import { useMarkdownRenderer } from "./use-markdown-renderer";

interface ChatMessageProps {
  messages: Message[];
  app: App;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ messages, app }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const buildMarkdownProps = useMarkdownRenderer();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [messages, isAtBottom]);

  const observerRef = useRef<IntersectionObserver | null>(null);
  useEffect(() => {
    if (!messagesEndRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        setIsAtBottom(entry.isIntersecting);
      },
      {
        rootMargin: "0px 0px 0px 0px",
        threshold: 1.0,
      }
    );

    observerRef.current.observe(messagesEndRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const noteContextService = new NoteContextService(app);
  // 创建新笔记
  const createFile = (content: string, index: number) => {
    noteContextService.createNote({
      title: messages[index - 1]?.content ?? "",
      content,
    });
  };

  return (
    <div className={styles.messagesContainer}>
      {messages.map((message, index) => (
        <div
          key={message.id}
          className={`${styles.messageWrapper} yoran-message-${message.type}`}
        >
          {message.type === "user" ? (
            <div className={styles.userMessage}>
              <div className={styles.userBubble}>
                <div className={styles.userContent}>{message.content}</div>
              </div>
            </div>
          ) : (
            <div className={styles.assistantMessage}>
              <div className={styles.assistantText}>
                {(() => {
                  const { remarkPlugins, rehypePlugins, components } = buildMarkdownProps(message.content);
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
              <div className={styles.messageActions}>
                <CopyIcon
                  onClick={() =>navigator.clipboard.writeText(message.content)}
                />
                <GenerateIcon
                  onClick={() => createFile(message.content, index)}
                />
              </div>
            </div>
          )}
        </div>
      ))}
      {messages.length === 0 && (
        <div className={styles.logo}>
          <span className={styles.logoTitle}>😊</span>
          <span>请相信美好的事情即将到来。</span>
        </div>
      )}
      <div ref={messagesEndRef}></div>
    </div>
  );
};
