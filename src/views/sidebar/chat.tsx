import React, { useState, useRef, useEffect, useCallback } from "react";
import styles from "./css/ai-chat.module.css";
import { sendChatMessage } from "../../core/ai/openai";
import {
  NoteContextService,
  NoteContext,
} from "../../core/fs-context/note-context";
import {
  ChatMessage,
  ChatMessageHandle,
} from "./component/message-list/message-list";
import { NoteSelector } from "./component/note-selector";
import { SelectedFiles } from "./component/selected-files";
import { ChatInput } from "./component/chat-input";
import { PositionedPopover } from "./component/positioned-popover";
import { useCaretPosition } from "./hooks/use-caret-position";
import { useSerializeJS, parseSerializeJS } from "./hooks/use-serialize-js";
import { Message, ChatComponentProps } from "./type";
import { useHistory } from "./component/use-history";
import { useContext } from "./hooks/use-context";

const PADDING = 12;
export const ChatComponent: React.FC<ChatComponentProps> = ({
  onSendMessage,
  settings,
  app,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const textareaRef = useRef<HTMLDivElement>(null);
  const cancelToken = useRef({ cancelled: false });
  const messageListRef = useRef<ChatMessageHandle>(null);

  const noteContextService = new NoteContextService(app);

  const [selectedNotes, setSelectedNotes] = useState<NoteContext[]>([]);

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

  const { historyRender, currentId } = useHistory();
  const { upsertHistoryItem, getHistoryItemById } = useContext();
  const serializeJS = useSerializeJS();

  useEffect(() => {
    if (!currentId) {
      setMessages([]);
      return;
    }

    (async () => {
      try {
        const item = (await getHistoryItemById(currentId)) ?? {
          id: currentId,
          messages: [],
        };
        setMessages(item.messages);
        // 读取历史时将字符串快照解析回对象，并补齐必要字段
        setSelectedNotes(parseSerializeJS(item.noteSelected as any) || []);
      } catch (e) {
        console.error("IndexedDB load failed:", e);
      }
    })();
  }, [currentId, getHistoryItemById]);

  // ChatComponent 组件内的保存 useEffect
  useEffect(() => {
    if (!currentId) return;

    // 改用第三方库 serialize-javascript：先快照，再字符串化，并记录 filePath
    const noteSelectedSerializable = (selectedNotes || []).map((n: any) => {
      const serializedStr = serializeJS(n, { maxDepth: 2 });
      const filePath = n?.file?.path ?? n?.path ?? undefined;
      return { serialized: serializedStr, filePath };
    });

    (async () => {
      try {
        // 先获取现有的历史记录，保留用户编辑的 title 和 systemMessage
        const existingItem = await getHistoryItemById(currentId);
        await upsertHistoryItem({
          id: currentId,
          messages,
          noteSelected: noteSelectedSerializable,
          title: existingItem?.title, // 保留现有的 title
          systemMessage: existingItem?.systemMessage, // 保留现有的 systemMessage
          createdAt: existingItem?.createdAt, // 保留创建时间
        });
      } catch (e) {
        console.error("IndexedDB save failed:", e);
      }
    })();
  }, [
    currentId,
    messages,
    selectedNotes,
    upsertHistoryItem,
    serializeJS,
    getHistoryItemById,
  ]);

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
      const context = await noteContextService.getNoteContent(
        selectedNotes[i] as any
      );
      notePrompts.push(
        typeof context === "string" ? context : context?.content ?? ""
      );
    }

    // 获取当前历史记录的系统消息
    const getCurrentSystemMessage = async () => {
      if (!currentId) return undefined;
      try {
        const currentItem = await getHistoryItemById(currentId);
        return currentItem?.systemMessage;
      } catch (e) {
        console.error("Failed to get system message:", e);
        return undefined;
      }
    };

    const systemMessage = await getCurrentSystemMessage();

    setIsLoading(true);
    sendChatMessage({
      settings,
      inputValue,
      notePrompts,
      contextMessages: messages.map((msg) => ({
        role: msg.type === "user" ? "user" : "assistant",
        content: msg.content,
      })),
      systemMessage, // 传递当前历史记录的系统消息
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
        onResponseStart: () => {
          setIsLoading(false);
        },
        onComplete: () => {
          cancelToken.current.cancelled = false;
          setIsStreaming(false);
        },
      },
      cancelToken: cancelToken.current,
    });
  };

  const blurCallBack = useCallback(() => {
    setShowFileSelector(false);
  }, []);

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

  const [filePosition, setFilePosition] = useState({ x: 0, y: 0 });
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

  const getDivCursorScreenPosition = useCaretPosition(textareaRef);

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
      setShowFileSelector(false);

      const currentPosition = getDivCursorPosition();

      const atResult = checkAtSymbolBefore(value, currentPosition);

      if (!atResult.found) {
        setSearchResults([]);
        return;
      }

      // 提取@后面的搜索关键字
      const atIndex = value.lastIndexOf("@", currentPosition - 1);
      const searchKeyword = value.slice(atIndex + 1, currentPosition);

      setShowFileSelector(true);
      // 根据搜索关键字异步搜索笔记
      if (searchKeyword.trim() !== "") {
        noteContextService
          .searchNotes(searchKeyword)
          .then((files) => {
            const searchNotes = files.map((file) => ({
              title: file.basename,
              file: file,
              icon: "📄",
            }));
            setSearchResults(searchNotes);
          })
          .catch((error) => {
            console.error("搜索笔记失败:", error);
            setSearchResults([]);
          });
        return;
      }

      // 关键字为空时，显示当前打开的笔记
      const openNotes = noteContextService.getOpenNotes();
      setSearchResults(openNotes);
    },
    [getDivCursorPosition]
  );

  const chatContainerRef = useRef<HTMLDivElement>(null);
  // ✅ 当文件选择器显示时，重新计算位置以使用准确的高度
  useEffect(() => {
    if (
      !chatContainerRef.current ||
      !fileSelectorRef.current ||
      !textareaRef.current
    )
      return;

    requestAnimationFrame(() => {
      const selectorHeight = getFileSelectorHeight();
      const cursorPos = getDivCursorScreenPosition();
      if (typeof cursorPos.relativeY === "number" && cursorPos.relativeY > 0) {
        const popoverWidth = fileSelectorRef.current?.offsetWidth ?? 250;
        const containerRect =
          chatContainerRef.current?.getBoundingClientRect() ?? { width: 0 };
        const containerRectWidthPadding = containerRect.width + PADDING;

        let targetX = cursorPos.relativeX ?? 0;

        // 防止右侧溢出：x + 弹窗宽度 ≤ 容器宽度
        if (targetX + popoverWidth > containerRectWidthPadding) {
          targetX = containerRectWidthPadding - popoverWidth;
        }
        // 防止左侧溢出：x ≥ 0
        if (targetX < 0) targetX = 0;

        setFilePosition({
          x: targetX,
          y: cursorPos.absoluteY - selectorHeight - 60,
        });
      }
    });
  }, [
    showFileSelector,
    getFileSelectorHeight,
    getDivCursorScreenPosition,
    searchResults,
  ]);

  const onSelectNote = (note: NoteContext) => {
    setSelectedNotes((prev: any) => {
      const exists = prev.some((p: any) => p.path === note.file?.path);
      if (exists) return prev;
      return [...prev, note.file];
    });

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
          value.slice(0, atIndex) + `@${note.title} ` + value.slice(cursorPos);
        textarea.textContent = newValue;
        setInputValue(newValue);

        // 设置新的光标位置（在插入的笔记标题后面）
        setTimeout(() => {
          setDivCursorPosition(atIndex + Number(note.title?.length) + 2);
        }, 0);
      }
    }
  };

  const onSelectAllFiles = (notes: NoteContext[]) => {
    setSelectedNotes((prev) => {
      const existingPaths = new Set(prev.map((p) => p.path));
      const merged = [...prev];
      for (const note of notes) {
        const file = note?.file ?? note; // 兼容 NoteContext 或已是文件对象
        const path = file?.path;
        if (path && !existingPaths.has(path)) {
          merged.push(file);
          existingPaths.add(path);
        }
      }
      return merged;
    });

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
  const onDeleteNote = (note: NoteContext) => {
    setSelectedNotes(selectedNotes.filter((n) => n.path !== note.path));
  };

  const handleScrollToBottom = () => {
    messageListRef.current?.scrollToBottom?.();
  };

  return (
    <div className={styles.container} ref={chatContainerRef}>
      {/* 信息历史 */}
      {historyRender({ app })}
      {/* 消息区域 */}
      <ChatMessage
        ref={messageListRef}
        messages={messages}
        app={app}
        isLoading={isLoading}
        onNearBottomChange={(near) => setShowScrollBtn(!near)}
        currentId={currentId} // 传递currentId用于滚动位置管理
      />
      {/* 文件选择器 */}
      <PositionedPopover
        ref={fileSelectorRef}
        className={styles.fileSelector}
        visible={showFileSelector}
        x={filePosition.x}
        y={filePosition.y}
        zIndex={1000}
      >
        <NoteSelector
          searchResults={searchResults}
          noteContextService={noteContextService}
          onSelectAllFiles={onSelectAllFiles}
          onSelectNote={onSelectNote}
        />
      </PositionedPopover>
      {/* 输入区域 */}
      <div className={styles.inputArea}>
        {showScrollBtn && (
          <div className={styles.scrollToBottomBtnContainer}>
            <button
              className={styles.scrollToBottomBtn}
              onClick={handleScrollToBottom}
              aria-label="滚动到底部"
              title="滚动到底部"
            >
              ↓
            </button>
          </div>
        )}
        {selectedNotes.length > 0 && (
          <SelectedFiles nodes={selectedNotes} onDeleteNote={onDeleteNote} />
        )}
        {
          <ChatInput
            textareaRef={textareaRef}
            handleInputChange={handleInputChange}
            handleKeyPress={handleKeyPress}
            handleSend={handleSend}
            blurCallBack={blurCallBack}
            handleCancelStream={handleCancelStream}
            inputValue={inputValue}
            isStreaming={isStreaming}
          />
        }
      </div>
    </div>
  );
};
