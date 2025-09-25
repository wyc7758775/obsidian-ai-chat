import React, { useRef, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Message } from "./ai-chat";

interface ChatMessageProps {
  messages: Message[]
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ messages }) => {
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

  return (
    <div className="yoran-messages-container">
      {messages.map((message) => (
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
              <div
                className="yoran-copy-btn"
                onClick={() => {
                  navigator.clipboard.writeText(message.content);
                }}
              >
                <svg
                  className="force-icon force-icon-copy "
                  width="1em"
                  height="1em"
                  viewBox="0 0 48 48"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M32 12a2 2 0 012 2v28.222c0 .982-.836 1.778-1.867 1.778H7.867C6.836 44 6 43.204 6 42.222V13.778C6 12.796 6.836 12 7.867 12H32zm-2 4H10v24h20V16zM40 4a2 2 0 012 2v25a1 1 0 01-1 1h-2a1 1 0 01-1-1V8H19a1 1 0 01-1-1V5a1 1 0 011-1h21z"
                    fill="currentColor"
                  ></path>
                </svg>
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
}