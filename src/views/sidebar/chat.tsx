import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
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
import { ChatInput } from "./chat/chat-input";
import { PositionedPopover } from "./component/positioned-popover";
import { Loading } from "./component/loading";
import { useCaretPosition } from "./hooks/use-caret-position";

import { Message, ChatComponentProps, NoteReference } from "./type";
import { useHistory } from "./component/chat-panel/index";
import { useContext } from "./hooks/use-context";
import { useScrollToBottom } from "./use-scroll-to-bottom";
import { useSend } from "./hooks/use-send";

const PADDING = 12;
export const ChatComponent: React.FC<ChatComponentProps> = ({
  onSendMessage,
  settings,
  app,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [messagesChanged, setMessagesChanged] = useState(false);
  const [sessions, setSessions] = useState<
    Record<string, { messages: Message[]; selectedNotes: NoteContext[] }>
  >({});

  const textareaRef = useRef<HTMLDivElement>(null);
  const cancelToken = useRef({ cancelled: false });

  // 使用 useMemo 确保 service 实例的稳定性
  const noteContextService = useMemo(() => new NoteContextService(app), [app]);

  const {
    historyRender: HistoryPanel,
    currentId,
    selectedRole,
    forceHistoryUpdate,
  } = useHistory();
  const { upsertHistoryItem, getHistoryItemById, fileStorageService } =
    useContext(app);

  const currentSession = useMemo(() => {
    if (!currentId || !sessions[currentId])
      return { messages: [], selectedNotes: [] };
    return sessions[currentId];
  }, [currentId, sessions]);
  const currentMessages: Message[] = currentSession.messages ?? [];
  const currentSelectedNotes: NoteContext[] =
    currentSession.selectedNotes ?? [];

  /**
   * 会话容器初始化与懒加载
   * 输入参数：依赖于 `currentId` 与会话存储 `sessions`
   * 边界处理：
   * - `currentId` 为空：跳过加载并结束初始化
   * - 已存在容器：直接结束初始化与重置变更标记
   * - 不存在容器：拉取历史与笔记引用并创建容器
   */
  useEffect(() => {
    if (!currentId) {
      setIsInitializing(false);
      setMessagesChanged(false);
      return;
    }

    if (sessions[currentId]) {
      setIsInitializing(false);
      setMessagesChanged(false);
      return;
    }

    setIsInitializing(true);
    (async () => {
      try {
        const item = (await getHistoryItemById(currentId)) ?? {
          id: currentId,
          messages: [],
        };
        let noteContexts: NoteContext[] = [];
        if (item.noteSelected && item.noteSelected.length > 0) {
          noteContexts = await fileStorageService.convertToNoteContexts(
            item.noteSelected
          );
        }
        setSessions((prev) => ({
          ...prev,
          [currentId]: {
            messages: item.messages ?? [],
            selectedNotes: noteContexts,
          },
        }));
        setMessagesChanged(false);
      } catch (e) {
        console.error("IndexedDB load failed:", e);
      } finally {
        setIsInitializing(false);
        if (pendingHideHistoryRef.current) {
          try {
            window.dispatchEvent(new Event("yoran-chat-initialized"));
          } catch (_e) {
            void 0;
          }
          pendingHideHistoryRef.current = false;
        }
      }
    })();
  }, [currentId, getHistoryItemById, fileStorageService, sessions]);

  // ChatComponent 组件内的保存 useEffect
  useEffect(() => {
    if (!currentId) return;

    const noteSelectedReferences: NoteReference[] = (currentSelectedNotes || [])
      .map((noteContext) =>
        fileStorageService.convertToNoteReference(noteContext)
      )
      .filter((ref): ref is NoteReference => ref !== null);

    (async () => {
      try {
        const existingItem = await getHistoryItemById(currentId);
        const itemToSave = {
          id: currentId,
          messages: currentMessages,
          noteSelected: noteSelectedReferences,
          title: existingItem?.title,
          systemMessage:
            messagesChanged && selectedRole?.systemPrompt
              ? selectedRole.systemPrompt
              : existingItem?.systemMessage,
          roleName:
            messagesChanged && selectedRole?.name
              ? selectedRole.name
              : existingItem?.roleName,
          createdAt: existingItem?.createdAt,
        };

        await upsertHistoryItem(itemToSave);
        forceHistoryUpdate();
      } catch (e) {
        console.error("保存失败:", e);
      }
    })();
  }, [
    currentId,
    currentMessages,
    currentSelectedNotes,
    upsertHistoryItem,
    getHistoryItemById,
    fileStorageService,
    messagesChanged,
    selectedRole,
  ]);

  // 获取当前历史记录的系统消息
  /**
   * 获取当前会话的系统提示
   * 特殊情况：`currentId` 为空时返回 `undefined`
   */
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
  /**
   * 构造笔记提示上下文
   * 边界处理：当无选中笔记时返回空数组
   */
  const getNotePrompts = async () => {
    const notePrompts = [];
    for (let i = 0; i < currentSelectedNotes.length; i++) {
      const context = await noteContextService.getNoteContent(
        currentSelectedNotes[i] as any
      );
      notePrompts.push(
        typeof context === "string" ? context : context?.content ?? ""
      );
    }
    return notePrompts;
  };

  const {
    onSend,
    keyPressSend,
    isStreaming,
    setIsStreaming,
    inputValue,
    setInputValue,
    adjustTextareaHeight,
  } = useSend({
    textareaRef,
  });
  // 已在顶部声明 messagesChanged，这里移除重复声明
  /**
   * 发送消息并创建 AI 回复占位
   * 输入参数有效性：需要有效 `currentId`
   * 特殊情况处理：当 `onSend()` 校验失败或 `currentId` 为空时中断
   */
  const handleSend = async () => {
    if (!onSend()) return;

    const { userParams, aiParams } = onSend()!;
    if (!currentId) return;
    setSessions((prev) => {
      const prevSession = prev[currentId] ?? {
        messages: [],
        selectedNotes: [],
      };
      return {
        ...prev,
        [currentId]: {
          ...prevSession,
          messages: [...prevSession.messages, userParams, aiParams],
        },
      };
    });
    setMessagesChanged(true);
    onSendMessage?.(inputValue);

    /**
     * 构建本次请求的系统提示：优先使用当前选择的角色。
     * 说明：历史持久化仍然受 messagesChanged 控制，这里只影响即时请求上下文。
     */
    const systemMessage =
      selectedRole?.systemPrompt ?? (await getCurrentSystemMessage());

    setIsLoading(true);
    sendChatMessage({
      settings,
      inputValue,
      notePrompts: await getNotePrompts(),
      contextMessages: currentMessages.map((msg) => ({
        role: msg.type === "user" ? "user" : "assistant",
        content: msg.content,
      })),
      systemMessage, // 传递当前历史记录的系统消息
      callBacks: {
        onChunk: (chunk: string) => {
          setSessions((prev) => {
            const prevSession = prev[currentId] ?? {
              messages: [],
              selectedNotes: [],
            };
            const updated = prevSession.messages.map((msg) =>
              msg.id === aiParams.id
                ? { ...msg, content: msg.content + chunk }
                : msg
            );
            return {
              ...prev,
              [currentId]: { ...prevSession, messages: updated },
            };
          });
        },
        onComplete: () => {
          setIsLoading(false);
          setIsStreaming(false); // 在接收完成后设置为非 streaming 状态
        },
        onError: (error: any) => {
          console.error("Stream error:", error);
          setIsLoading(false);
          setIsStreaming(false); // 在出错时也需要设置为非 streaming 状态
          setSessions((prev) => {
            const prevSession = prev[currentId] ?? {
              messages: [],
              selectedNotes: [],
            };
            const updated = prevSession.messages.map((msg) =>
              msg.id === aiParams.id
                ? { ...msg, content: `Error: ${error.message}` }
                : msg
            );
            return {
              ...prev,
              [currentId]: { ...prevSession, messages: updated },
            };
          });
        },
      },
      cancelToken: cancelToken.current,
    });
    adjustTextareaHeight();
  };

  const blurCallBack = useCallback(() => {
    setShowFileSelector(false);
  }, []);

  const handleCancelStream = () => {
    cancelToken.current.cancelled = true;
    setIsStreaming(false);
    setIsLoading(false);
  };

  /**
   * 重新生成指定 AI 消息
   * 输入参数有效性：`messageIndex` 应为当前会话消息范围内的索引
   * 特殊情况：
   * - 目标消息非 AI 类型则中断
   * - 找不到对应用户消息则中断
   */
  const handleRegenerateMessage = async (messageIndex: number) => {
    const targetMessage = currentMessages[messageIndex];

    // 只能重新生成AI消息
    if (targetMessage.type !== "assistant") return;

    // 找到对应的用户消息（通常是前一条消息）
    let userMessageIndex = messageIndex - 1;
    while (
      userMessageIndex >= 0 &&
      currentMessages[userMessageIndex].type !== "user"
    ) {
      userMessageIndex--;
    }

    if (userMessageIndex < 0) return; // 没有找到对应的用户消息

    const userMessage = currentMessages[userMessageIndex];

    // 删除从AI消息开始到最后的所有消息
    const newMessages = currentMessages.slice(0, messageIndex);
    if (!currentId) return;
    setSessions((prev) => {
      const prevSession = prev[currentId] ?? {
        messages: [],
        selectedNotes: [],
      };
      return {
        ...prev,
        [currentId]: { ...prevSession, messages: newMessages },
      };
    });
    setMessagesChanged(true);

    // 创建新的AI消息
    const aiMessageId = Date.now().toString();
    const aiMessage: Message = {
      id: aiMessageId,
      content: "",
      type: "assistant",
    };
    setSessions((prev) => {
      const prevSession = prev[currentId] ?? {
        messages: [],
        selectedNotes: [],
      };
      return {
        ...prev,
        [currentId]: {
          ...prevSession,
          messages: [...prevSession.messages, aiMessage],
        },
      };
    });

    // 准备笔记提示（使用当前选中的笔记）
    const notePrompts = [];
    for (let i = 0; i < currentSelectedNotes.length; i++) {
      const context = await noteContextService.getNoteContent(
        currentSelectedNotes[i] as any
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

    /**
     * 构建重新生成的系统提示：优先使用当前选择的角色。
     */
    const systemMessage =
      selectedRole?.systemPrompt ?? (await getCurrentSystemMessage());

    // 重新发送AI请求
    setIsLoading(true);
    sendChatMessage({
      settings,
      inputValue: userMessage.content, // 使用原始用户消息内容
      notePrompts,
      contextMessages: newMessages.map((msg) => ({
        role: msg.type === "user" ? "user" : "assistant",
        content: msg.content,
      })),
      systemMessage,
      callBacks: {
        onChunk: (chunk: string) => {
          setSessions((prev) => {
            const prevSession = prev[currentId] ?? {
              messages: [],
              selectedNotes: [],
            };
            const updated = prevSession.messages.map((msg) =>
              msg.id === aiMessageId
                ? { ...msg, content: msg.content + chunk }
                : msg
            );
            return {
              ...prev,
              [currentId]: { ...prevSession, messages: updated },
            };
          });
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

  /**
   * 选择单个笔记并追加到当前会话
   * 去重：按文件路径去重
   */
  const onSelectNote = (note: NoteContext) => {
    if (!currentId) return;
    setSessions((prev) => {
      const prevSession = prev[currentId] ?? {
        messages: [],
        selectedNotes: [],
      };
      const exists = prevSession.selectedNotes.some(
        (p: any) => p.path === note.file?.path
      );
      if (exists) return prev;
      return {
        ...prev,
        [currentId]: {
          ...prevSession,
          selectedNotes: [...prevSession.selectedNotes, note],
        },
      };
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

  /**
   * 批量选择笔记并合并到当前会话
   * 边界处理：按路径去重，保持稳定顺序
   */
  const onSelectAllFiles = (notes: NoteContext[]) => {
    if (!currentId) return;
    setSessions((prev) => {
      const prevSession = prev[currentId] ?? {
        messages: [],
        selectedNotes: [],
      };
      const existingPaths = new Set(
        prevSession.selectedNotes.map((p) => p.file?.path || p.path)
      );
      const merged = [...prevSession.selectedNotes];
      for (const note of notes) {
        const path = note.file?.path;
        if (path && !existingPaths.has(path)) {
          merged.push(note);
          existingPaths.add(path);
        }
      }
      return {
        ...prev,
        [currentId]: { ...prevSession, selectedNotes: merged },
      };
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
  /**
   * 从当前会话删除指定笔记
   * 删除条件：按 `file.path` 或 `path` 匹配
   */
  const onDeleteNote = (note: NoteContext) => {
    if (!currentId) return;
    setSessions((prev) => {
      const prevSession = prev[currentId] ?? {
        messages: [],
        selectedNotes: [],
      };
      const filtered = prevSession.selectedNotes.filter(
        (n) => (n.file?.path || n.path) !== (note.file?.path || note.path)
      );
      return {
        ...prev,
        [currentId]: { ...prevSession, selectedNotes: filtered },
      };
    });
  };

  const messageListRefs = useRef<Record<string, ChatMessageHandle | null>>({});
  const { ScrollToBottomRender } = useScrollToBottom(() => {
    if (!currentId) return;
    messageListRefs.current[currentId]?.scrollToBottom?.();
  });

  /**
   * 将建议文本插入到输入框：
   * - 写入 contentEditable 与本地状态
   * - 调整高度并将光标移至末尾，最后聚焦
   * @param text 建议文本内容
   */
  const handleInsertSuggestion = useCallback(
    (text: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      textarea.textContent = text;
      setInputValue(text);
      adjustTextareaHeight();

      setTimeout(() => {
        try {
          setDivCursorPosition(text.length);
        } catch (_) {
          const range = document.createRange();
          const selection = window.getSelection();
          const lastChild = textarea.lastChild;
          if (lastChild && lastChild.nodeType === Node.TEXT_NODE) {
            range.setStart(lastChild, (lastChild.textContent || "").length);
          } else {
            range.selectNodeContents(textarea);
            range.collapse(false);
          }
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
        textarea.focus();
      }, 0);
    },
    [adjustTextareaHeight, setDivCursorPosition]
  );

  return (
    <div
      className={styles.container}
      ref={chatContainerRef}
      style={{ overflowY: isInitializing ? "hidden" : "auto" }}
    >
      {/* 全局初始化 Loading */}
      {isInitializing && <Loading />}
      {/* 信息历史 */}
      <HistoryPanel app={app} />
      {/* 消息区域：仅中间聊天区域切换，顶部面板与底部输入固定 */}
      <ChatMessage
        ref={(inst) => currentId && (messageListRefs.current[currentId] = inst)}
        messages={sessions[currentId]?.messages ?? []}
        app={app}
        isLoading={isLoading}
        onNearBottomChange={(near) => setShowScrollBtn(!near)}
        currentId={currentId}
        onRegenerateMessage={handleRegenerateMessage}
        onInsertSuggestion={handleInsertSuggestion}
        suggestions={settings.suggestionTemplates}
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
        <ScrollToBottomRender disabled={isStreaming} isShow={showScrollBtn} />
        {currentSelectedNotes.length > 0 && (
          <SelectedFiles
            nodes={currentSelectedNotes}
            onDeleteNote={onDeleteNote}
            noteContextService={noteContextService}
          />
        )}
        {
          <ChatInput
            textareaRef={textareaRef}
            handleInputChange={handleInputChange}
            handleKeyPress={(e) => keyPressSend(e, handleSend)}
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
const pendingHideHistoryRef = useRef(false);
useEffect(() => {
  if (currentId) pendingHideHistoryRef.current = true;
}, [currentId]);
