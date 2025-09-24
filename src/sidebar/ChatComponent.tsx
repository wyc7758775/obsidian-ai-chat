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

  const textareaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const cancelToken = useRef({ cancelled: false });

  const noteContextService = new NoteContextService(app);

  const [selectedNotes, setSelectedNotes] = useState<any[]>([]);

  // useEffect(() => {
  //   if (noteContextService.getCurrentNote() && selectedNotes.length === 0) {
  //     const context = noteContextService.getCurrentNote();
  //     setSelectedNotes([context]);
  //   }
  // }, [noteContextService.getCurrentNote(), selectedNotes.length]);

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

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      type: "user",
    };

    setMessages((prev) => [...prev, newMessage]);
    clearInput();

    onSendMessage?.(inputValue);

    const aiMessageId = (Date.now() + 1).toString();
    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      content: "",
      type: "assistant",
    };
    setMessages((prev) => [...prev, aiMessage]);

    const notePrompts = [];
    for (let i = 0; i < selectedNotes.length; i++) {
      const context = await noteContextService.getNoteContent(selectedNotes[i]);
      notePrompts.push(
        typeof context === "string" ? context : context?.content ?? ""
      );
    }

    getOpenai({
      settings,
      inputValue,
      notePrompts,
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
  // 关键字
  const [searchResults, setSearchResults] = useState<any[]>([]); // 搜索结果

  // ✅ 文件选择器的 ref，用于获取实际高度
  const fileSelectorRef = useRef<HTMLDivElement>(null);
  const getFileSelectorHeight = useCallback(() => {
    if (fileSelectorRef.current) {
      return fileSelectorRef.current.clientHeight;
    }
    return 200;
  }, []);

  // 获取可编辑div中光标的屏幕位置
  const getDivCursorScreenPosition = useCallback(() => {
    if (!textareaRef.current) return { x: 0, y: 0 };

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return { x: 0, y: 0 };

    const range = selection.getRangeAt(0);

    // 创建一个临时的span元素来获取光标位置
    const span = document.createElement("span");
    span.appendChild(document.createTextNode("\u200b")); // 零宽度空格

    try {
      range.insertNode(span);
      const rect = span.getBoundingClientRect();
      const divRect = textareaRef.current.getBoundingClientRect();

      // 移除临时元素
      span.parentNode?.removeChild(span);

      // 合并相邻的文本节点
      textareaRef.current.normalize();
      console.log({
        rect,
        divRect,
        relativeX: rect.left - divRect.left,
        relativeY: rect.top - divRect.top,
      });

      return {
        x: rect.left,
        y: rect.top,
        absoluteX: rect.left || 0,
        absoluteY: rect.top || 0,
        relativeX: rect.left - divRect.left,
        relativeY: rect.top - divRect.top,
      };
    } catch (error) {
      console.error("获取光标位置失败:", error);
      return { x: 0, y: 0, absoluteX: 0, absoluteY: 0 };
    }
  }, []);

  // 获取 div 的光标位置
  const getDivCursorPosition = useCallback(() => {
    if (!textareaRef.current) return 0;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return 0;

    const range = selection.getRangeAt(0);
    const preCareRange = range.cloneRange();
    preCareRange.selectNodeContents(textareaRef.current);
    preCareRange.setEnd(range.endContainer, range.endOffset);
    return preCareRange.toString().length;
  }, [textareaRef]);

  const setDivCursorPosition = useCallback((position: number) => {
    if (!textareaRef.current) return;

    const div = textareaRef.current;
    const textNodes: Text[] = [];

    // 收集所有文本节点
    const walker = document.createTreeWalker(div, NodeFilter.SHOW_TEXT, null);

    let node;
    while ((node = walker.nextNode())) {
      textNodes.push(node as Text);
    }

    let currentPosition = 0;
    for (const textNode of textNodes) {
      const nodeLength = textNode.textContent?.length || 0;
      if (currentPosition + nodeLength >= position) {
        const range = document.createRange();
        const selection = window.getSelection();
        range.setStart(textNode, position - currentPosition);
        range.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(range);
        break;
      }
      currentPosition += nodeLength;
    }
  }, []);

  // 检查光标前是否有@符号（跳过空格）
  const checkAtSymbolBefore = (
    text: string,
    position: number
  ): { found: boolean; atIndex: number; searchKeyword: string } => {
    // 从当前位置向前查找最近的@符号
    let atIndex = -1;

    // 向前搜索@符号，但不能跨越空格
    for (let i = position - 1; i >= 0; i--) {
      const char = text[i];

      if (char === "@") {
        atIndex = i;
        break;
      } else if (char === " " || char === "\n" || char === "\t") {
        // 遇到空白字符，停止搜索
        break;
      }
    }

    if (atIndex === -1) {
      return { found: false, atIndex: -1, searchKeyword: "" };
    }

    // 检查@符号前面的字符
    const charBeforeAt = atIndex > 0 ? text[atIndex - 1] : null;

    // @符号前面必须是空格、换行或者文本开头
    const isValidPrefix =
      charBeforeAt === null ||
      charBeforeAt === " " ||
      charBeforeAt === "\n" ||
      charBeforeAt === "\t";

    if (!isValidPrefix) {
      return { found: false, atIndex: -1, searchKeyword: "" };
    }

    // 提取@符号后面的搜索关键字（从@符号后到当前光标位置）
    const searchKeyword = text.slice(atIndex + 1, position);

    // 确保搜索关键字中没有换行符（通常@提及不跨行）
    if (searchKeyword.includes("\n")) {
      return { found: false, atIndex: -1, searchKeyword: "" };
    }

    return { found: true, atIndex, searchKeyword };
  };

  // ✅ 监听输入框变化，精确获取光标位置
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLDivElement>) => {
      const value = e.target.innerText; // e.target.value;
      setInputValue(value);
      adjustTextareaHeight();

      const currentPosition = getDivCursorPosition();
      const cursorPos = getDivCursorScreenPosition();
      setFilePositionX(cursorPos.relativeX || 0);
      setShowFileSelector(false);

      const atResult = checkAtSymbolBefore(value, currentPosition);

      // 检查光标前一个字符是否为 "@"
      if (atResult.found) {
        // 提取@后面的搜索关键字
        const atIndex = value.lastIndexOf("@", currentPosition - 1);
        const searchKeyword = value.slice(atIndex + 1, currentPosition);

        setShowFileSelector(true);
        setFilePositionY(
          (cursorPos.absoluteY || 0) - getFileSelectorHeight() - 60
        );

        // 根据搜索关键字异步搜索笔记
        if (searchKeyword.trim() === "") {
          // 关键字为空时，显示当前打开的笔记
          const openNotes = noteContextService.getOpenNotes();
          setSearchResults(openNotes);
          console.log({openNotes})
        } else {
          // 有关键字时，进行搜索
          noteContextService
            .searchNotes(searchKeyword)
            .then((files) => {
              const searchNotes = files.map((file) => ({
                title: file.basename,
                file: file,
                icon: "📄",
              }));
              console.log({searchNotes})
              setSearchResults(searchNotes);
            })
            .catch((error) => {
              console.error("搜索笔记失败:", error);
              setSearchResults([]);
            });
        }
      } else {
        setSearchResults([]);
      }
    },
    [getDivCursorPosition]
  );

  // ✅ 当文件选择器显示时，重新计算位置以使用准确的高度
  useEffect(() => {
    if (showFileSelector && fileSelectorRef.current && textareaRef.current) {
      requestAnimationFrame(() => {
        const selectorHeight = getFileSelectorHeight();
        const cursorPos = getDivCursorScreenPosition();

        if (cursorPos.relativeY > 0) {
          setFilePositionX(cursorPos.relativeX || 0);
          setFilePositionY(cursorPos.absoluteY - selectorHeight - 60);
        }
      });
    }
  }, [showFileSelector, getFileSelectorHeight, getDivCursorScreenPosition]);

  // 使用 opacity 控制文件选择器的显示与隐藏 是为了渲染的的周期
  const FileSelector = useCallback(() => {
    const notes = searchResults.length > 0 ? searchResults : noteContextService.getOpenNotes();

    const handleSelectAllFiles = () => {
      // 选择所有打开的文件
      setSelectedNotes(notes);
      setShowFileSelector(false);
      // 清除输入框中的 @ 符号
      const textarea = textareaRef.current;
      if (textarea) {
        const value = textarea.textContent || "";
        const cursorPos = getDivCursorPosition();
        const newValue = value.slice(0, cursorPos - 1) + value.slice(cursorPos);
        setInputValue(newValue);
        // 设置新的光标位置
        setTimeout(() => {
          setDivCursorPosition(cursorPos - 1);
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

      // 清除输入框中的 @ 符号和搜索关键字，替换为选中的笔记标题
      const textarea = textareaRef.current;
      if (textarea) {
        const value = textarea.textContent || "";
        const cursorPos = getDivCursorPosition();

        // 找到@符号的位置
        const atIndex = value.lastIndexOf("@", cursorPos - 1);
        if (atIndex !== -1) {
          // 替换从@符号到光标位置的内容为笔记标题
          const newValue =
            value.slice(0, atIndex) +
            `@${note.title} ` +
            value.slice(cursorPos);
          textarea.textContent = newValue;
          setInputValue(newValue);

          // 设置新的光标位置（在插入的笔记标题后面）
          setTimeout(() => {
            setDivCursorPosition(atIndex + note.title.length + 2);
          }, 0);
        }
      }

      setSearchResults([]);
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
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M16 4H18C19.1046 4 20 4.89543 20 6V18C20 19.1046 19.1046 20 18 20H6C4.89543 20 4 19.1046 4 18V6C4 4.89543 4.89543 4 6 4H8M16 4V2M16 4V6M8 4V2M8 4V6M8 10H16M8 14H13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
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
              <div
                key={index}
                className="yoran-file-option"
                onClick={() => handleSelectNote(note)}
              >
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
  }, [showFileSelector, filePositionX, filePositionY, searchResults]);

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
        {messages.length === 0 && (
          <div className="yoran-logo">
            <span className="yoran-logo-title">😊</span>
            <span className="yoran-logo-sub">请相信美好的事情即将到来。</span>
          </div>
        )}
        <div ref={messagesEndRef}></div>
      </div>

      <FileSelector />
      {/* 输入区域 */}
      <div className="yoran-input-area">
        {selectedNotes.length > 0 && (
          <div className="yoran-file-wrapper">
            {selectedNotes.map((note, index) => (
              <div className="yoran-file-item" key={`${note.path}-${index}`}>
                <div className="yoran-file-item-logo">📄</div>
                <div className="yoran-file-item-content">
                  <span
                    className="yoran-file-close"
                    onClick={() => {
                      setSelectedNotes(
                        selectedNotes.filter((n) => n.path !== note.path)
                      );
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12 4L4 12M4 4L12 12"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <div>{note.name}</div>
                  <div className="yoran-file-line"></div>
                  <div className="yoran-file-path">{note.path}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="yoran-input-wrapper">
          <div
            ref={textareaRef}
            contentEditable
            suppressContentEditableWarning={true}
            onInput={handleInputChange}
            onKeyDown={handleKeyPress}
            data-placeholder="输入消息... (Enter 发送, Shift+Enter 换行, @ 选择笔记)"
            className="yoran-input-field yoran-input-div"
            style={{
              minHeight: "20px",
              maxHeight: "none",
              overflowY: "hidden",
              whiteSpace: "pre-wrap",
              wordWrap: "break-word",
            }}
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
