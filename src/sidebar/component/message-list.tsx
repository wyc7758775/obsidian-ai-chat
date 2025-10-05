import React, { useRef, useEffect, useState } from "react";
import { App } from "obsidian";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Message } from "../type";
import { NoteContextService } from "../../modules/fs-context/note-context";
import { CopyIcon, GenerateIcon } from "./icon";

interface ChatMessageProps {
  messages: Message[];
  app: App;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ messages, app }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

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
    <div className="yoran-messages-container">
      {messages.map((message, index) => (
        <div
          key={message.id}
          className={`yoran-message-wrapper yoran-message-${message.type}`}
        >
          {message.type === "user" ? (
            <div className="yoran-user-message">
              <div className="yoran-user-bubble">
                <div className="yoran-user-content">{message.content}</div>
              </div>
            </div>
          ) : (
            <div className="yoran-assistant-message">
              <div className="yoran-assistant-text">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
              <div className="yoran-message-actions">
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
        <div className="yoran-logo">
          <span className="yoran-logo-title">😊</span>
          <span className="yoran-logo-sub">请相信美好的事情即将到来。</span>
        </div>
      )}
      <div ref={messagesEndRef}></div>
    </div>
  );
};
