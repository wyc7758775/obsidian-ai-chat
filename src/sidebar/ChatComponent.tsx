import { App } from "obsidian";
import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { getOpenai } from "../modules/ai-chat/openai";
import { yoranChatSettings } from "src/main";
import { NoteContextService } from "../modules/fs-context/note-context";

interface Message {
  id: string;
  content: string;
  type: "user" | "assistant";
  username?: string;
}

interface ChatComponentProps {
  onSendMessage?: (message: string) => void;
  settings: yoranChatSettings;
  app: App;
}

export const ChatComponent: React.FC<ChatComponentProps> = ({
  onSendMessage,
  settings,
  app,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const cancelToken = useRef({ cancelled: false });

  const noteContextService = new NoteContextService(app);
  noteContextService.getAllNotes();

  const [selectedNotes, setSelectedNotes] = useState<any[]>([]);

  useEffect(() => {
    if (noteContextService.getCurrentNote()) {
      const context = noteContextService.getCurrentNote();
      setSelectedNotes([context]);
    }
  }, [noteContextService.getCurrentNote()]);

  const [isAtBottom, setIsAtBottom] = useState(true);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const observerRef = useRef<IntersectionObserver | null>(null);
  useEffect(() => {
    if (!messagesEndRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        // 当底部元素可见时，设置为在底部
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
  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [messages, isAtBottom]);

  // 完整的无限高度自适应函数
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
  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      type: "user",
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputValue("");

    onSendMessage?.(inputValue);

    const aiMessageId = (Date.now() + 1).toString();
    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      content: "",
      type: "assistant",
    };
    setMessages((prev) => [...prev, aiMessage]);

    const noteContext = selectedNotes.length
      ? await noteContextService.getNoteContent(selectedNotes[0])
      : undefined;

    // Call the OpenAI API
    getOpenai({
      settings,
      inputValue,
      notePrompts: [
        typeof noteContext === "string"
          ? noteContext
          : noteContext?.content ?? "",
      ],
      contextMessages: messages.map((msg) => ({
        role: msg.type === "user" ? "user" : "assistant",
        content: msg.content,
      })),
      callBacks: {
        onChunk: (chunk: string) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMessageId
                ? { ...msg, content: msg.content + chunk }
                : msg
            )
          );
        },
        onStart: () => {
          setIsStreaming(true);
        },
        onComplete: () => {
          cancelToken.current.cancelled = false;
          setIsStreaming(false);
        },
      },
      cancelToken: cancelToken.current,
    });
  };

  const handleCancelStream = () => {
    cancelToken.current.cancelled = true;
    setIsStreaming(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const [filePositionX, setFilePositionX] = useState(0);
  const [filePositionY, setFilePositionY] = useState(0);
  const [showFileSelector, setShowFileSelector] = useState(false);

  // ✅ 文件选择器的 ref，用于获取实际高度
  const fileSelectorRef = useRef<HTMLDivElement>(null);
  const getFileSelectorHeight = useCallback(() => {
    if (fileSelectorRef.current) {
      return fileSelectorRef.current.clientHeight;
    }
    return 200;
  }, []);

  // ✅ 更精确的光标位置获取方法（使用 Range API）
  const getCursorPositionAdvanced = useCallback(
    (textarea: HTMLTextAreaElement, cursorIndex: number) => {
      // 获取 textarea 的边界矩形
      const textareaRect = textarea.getBoundingClientRect();

      // 创建一个临时的可编辑 div
      const mirror = document.createElement("div");
      const style = window.getComputedStyle(textarea);

      // 复制所有相关样式
      [
        "fontFamily",
        "fontSize",
        "fontWeight",
        "fontStyle",
        "letterSpacing",
        "textTransform",
        "wordSpacing",
        "textIndent",
        "whiteSpace",
        "lineHeight",
        "padding",
        "border",
        "boxSizing",
        "width",
      ].forEach((prop) => {
        mirror.style[prop] = style[prop];
      });

      mirror.style.position = "absolute";
      mirror.style.visibility = "hidden";
      mirror.style.height = "auto";
      mirror.style.minHeight = "auto";
      mirror.style.overflow = "hidden";
      mirror.style.wordWrap = "break-word";
      mirror.style.whiteSpace = "pre-wrap";

      document.body.appendChild(mirror);

      // 分割文本：光标前和光标后
      const textBeforeCursor = textarea.value.substring(0, cursorIndex);
      const textAfterCursor = textarea.value.substring(cursorIndex);

      // 创建光标标记
      const cursorSpan = document.createElement("span");
      cursorSpan.style.position = "relative";
      cursorSpan.innerHTML = "|";

      // 设置内容
      mirror.textContent = textBeforeCursor;
      mirror.appendChild(cursorSpan);

      if (textAfterCursor) {
        const afterSpan = document.createElement("span");
        afterSpan.textContent = textAfterCursor;
        mirror.appendChild(afterSpan);
      }

      // 获取光标位置
      const cursorRect = cursorSpan.getBoundingClientRect();

      // 计算相对于页面的绝对位置
      const absoluteX = cursorRect.left;
      const absoluteY = cursorRect.top;

      // 计算相对于 textarea 的位置
      const relativeX = absoluteX - textareaRect.left;
      const relativeY = absoluteY - textareaRect.top;

      // 清理
      document.body.removeChild(mirror);

      return {
        absoluteX,
        absoluteY,
        relativeX,
        relativeY,
        textareaRect,
      };
    },
    []
  );

  // ✅ 当文件选择器显示时，重新计算位置以使用准确的高度
  useEffect(() => {
    if (showFileSelector && fileSelectorRef.current) {
      // 延迟一帧以确保 DOM 已渲染
      requestAnimationFrame(() => {
        const selectorHeight = getFileSelectorHeight();
        setFilePositionY((prev) => {
          // 重新计算 Y 位置，基于当前光标位置减去实际高度
          const textareaElement = document.querySelector(
            ".yoran-input-textarea"
          ) as HTMLTextAreaElement;
          if (textareaElement) {
            const cursorPos = getCursorPositionAdvanced(
              textareaElement,
              textareaElement.selectionStart
            );
            return cursorPos.absoluteY - selectorHeight;
          }
          return prev;
        });
      });
    }
  }, [showFileSelector, getFileSelectorHeight, getCursorPositionAdvanced]);

  // ✅ 监听输入框变化，精确获取光标位置
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      const currentPosition = e.target.selectionStart;

      const cursorPos = getCursorPositionAdvanced(e.target, currentPosition);
      setFilePositionX(cursorPos.absoluteX);

      setShowFileSelector(false);
      // 检查光标前一个字符是否为 "@"
      if (currentPosition > 0 && value[currentPosition - 1] === "@") {
        // 检查 "@" 之前的字符
        const charBeforeAt =
          currentPosition > 1 ? value[currentPosition - 2] : null;

        // "@" 之前只能是空格或者是行首
        const isValidPrefix =
          charBeforeAt === null ||
          charBeforeAt === " " ||
          charBeforeAt === "\n";

        // "@" 之后不能是空格
        const charAfterAt =
          currentPosition < value.length ? value[currentPosition] : null;
        const isValidSuffix = charAfterAt !== " ";

        if (isValidPrefix && isValidSuffix) {
          setShowFileSelector(true);
          setFilePositionY(cursorPos.absoluteY - getFileSelectorHeight() - 135);
        }
      }
    },
    [getCursorPositionAdvanced]
  );

	// 使用 opacity 控制文件选择器的显示与隐藏 是为了渲染的的周期
  const FileSelector = useCallback(() => {
    const notes = noteContextService.getOpenNotes();

    const handleSelectAllFiles = () => {
      // 选择所有打开的文件
      setSelectedNotes(notes);
      setShowFileSelector(false);
      // 清除输入框中的 @ 符号
      const textarea = textareaRef.current;
      if (textarea) {
        const value = textarea.value;
        const cursorPos = textarea.selectionStart;
        const newValue = value.slice(0, cursorPos - 1) + value.slice(cursorPos);
        setInputValue(newValue);
        // 设置新的光标位置
        setTimeout(() => {
          textarea.setSelectionRange(cursorPos - 1, cursorPos - 1);
        }, 0);
      }
    };

    const handleSelectNote = (note: any) => {
      setSelectedNotes((prev) => {
        const exists = prev.some((p) => p.path === note.file.path);
        if (exists) return prev;
        return [...prev, note.file];
      });
      setShowFileSelector(false);
      // 清除输入框中的 @ 符号
      const textarea = textareaRef.current;
      if (textarea) {
        const cursorPos = textarea.selectionStart;
        setInputValue(note.title);
        // 设置新的光标位置
        setTimeout(() => {
          textarea.setSelectionRange(cursorPos - 1, cursorPos - 1);
        }, 0);
      }
    };

    return (
      <div
        ref={fileSelectorRef}
        className="yoran-file-selector"
        style={{
          left: `${filePositionX}px`,
          top: `${filePositionY}px`,
					opacity: showFileSelector ? 1 : 0,
        }}
      >
        {/* 固定选项：当前所有活动文件 */}
        <div className="yoran-mention-all" onClick={handleSelectAllFiles}>
          <div className="yoran-mention-all-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 4H18C19.1046 4 20 4.89543 20 6V18C20 19.1046 19.1046 20 18 20H6C4.89543 20 4 19.1046 4 18V6C4 4.89543 4.89543 4 6 4H8M16 4V2M16 4V6M8 4V2M8 4V6M8 10H16M8 14H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="yoran-mention-all-text">当前所有活动文件</span>
        </div>

        {/* 分组标题 */}
        {notes.length > 0 && (
          <div className="yoran-file-group-title">打开的笔记</div>
        )}

        {/* 文件列表 */}
        <div className="yoran-file-list">
          {notes.length > 0 ? (
            notes.map((note, index) => (
              <div key={index} className="yoran-file-option" onClick={() => handleSelectNote(note)}>
                <div className="yoran-file-avatar">
                  <span className="yoran-file-icon">{note.icon}</span>
                </div>
                <span className="yoran-file-title">{note.title}</span>
              </div>
            ))
          ) : (
            <div className="yoran-file-option yoran-file-empty">
              <span>没有打开的笔记</span>
            </div>
          )}
        </div>
      </div>
    );
  }, [showFileSelector, filePositionX, filePositionY]);

  return (
    <div className="yoran-chat-container">
      {/* 消息区域 */}
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
        {messages.length === 0 && <div className="yoran-logo">😊</div>}
        <div ref={messagesEndRef}></div>
      </div>

      <FileSelector />
      {/* 输入区域 */}
      <div className="yoran-input-area">
        {selectedNotes.length > 0 && (
          <div className="yoran-file-wrapper">
            {selectedNotes.map((note) => (
              <div className="yoran-file-item" key={note.path}>
                <span
                  className="yoran-file-close"
                  onClick={() => {
                    setSelectedNotes(
                      selectedNotes.filter((n) => n.path !== note.path)
                    );
                  }}
                >
                  x
                </span>
                <span>{note.name}</span>
                <div className="yoran-file-line"></div>
                <span>{note.path}</span>
              </div>
            ))}
          </div>
        )}
        <div className="yoran-input-wrapper">
          <textarea
            ref={textareaRef}
            value={inputValue}
            rows={1}
            onChange={(e) => {
              setInputValue(e.target.value);
              setTimeout(() => adjustTextareaHeight(), 0);
              handleInputChange(e);
            }}
            onKeyPress={handleKeyPress}
            placeholder="输入消息... (Enter 发送, Shift+Enter 换行, @ 选择笔记)"
            className="yoran-input-field"
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
      </div>
    </div>
  );
};
