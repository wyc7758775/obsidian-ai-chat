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
import {
  PositionedPopover,
  usePositionedPopover,
} from "./component/hooks/use-positioned-popover";
import { Loading } from "./component/loading";

import { Message, ChatComponentProps, NoteReference } from "./type";
import { useHistory } from "./component/chat-panel/index";
import { useContext } from "./hooks/use-context";
import { useScrollToBottom } from "./use-scroll-to-bottom";
import { useSend } from "./hooks/use-send";

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
    historyRender: HistoryRender,
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
    const notePrompts: string[] = [];
    const addedPaths = new Set<string>();

    for (let i = 0; i < currentSelectedNotes.length; i++) {
      const note = currentSelectedNotes[i];

      if (note.iconType === "folder" && note.file && "path" in note.file) {
        const folderPath = (note.file as any).path;
        const folderMap = await noteContextService.getNotesByFolder();
        const files = folderMap.get(folderPath) || [];
        for (const f of files) {
          if (addedPaths.has(f.path)) continue;
          const ctx = await noteContextService.getNoteContent(f);
          const content = typeof ctx === "string" ? ctx : ctx?.content ?? "";
          notePrompts.push(content);
          addedPaths.add(f.path);
        }
        continue;
      }

      const ctx = await noteContextService.getNoteContent(note as any);
      const content = typeof ctx === "string" ? ctx : ctx?.content ?? "";
      const p =
        (ctx && typeof ctx !== "string" ? ctx.path : note.path) ||
        note.file?.path;
      if (p && addedPaths.has(p)) continue;
      notePrompts.push(content);
      if (p) addedPaths.add(p);
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

  // 延后声明，避免 TDZ - 将在 usePositionedPopover 之后声明
  // const blurCallBack = useCallback(() => {
  //   closeFileSelector();
  // }, [closeFileSelector]);

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

    // 准备笔记提示（支持文件夹：读取该文件夹下的所有笔记）
    const notePrompts: string[] = [];
    const addedPaths = new Set<string>();
    for (let i = 0; i < currentSelectedNotes.length; i++) {
      const note = currentSelectedNotes[i];
      if (note.iconType === "folder" && note.file && "path" in note.file) {
        const folderPath = (note.file as any).path;
        const folderMap = await noteContextService.getNotesByFolder();
        const files = folderMap.get(folderPath) || [];
        for (const f of files) {
          if (addedPaths.has(f.path)) continue;
          const ctx = await noteContextService.getNoteContent(f);
          const content = typeof ctx === "string" ? ctx : ctx?.content ?? "";
          notePrompts.push(content);
          addedPaths.add(f.path);
        }
        continue;
      }
      const ctx = await noteContextService.getNoteContent(note as any);
      const content = typeof ctx === "string" ? ctx : ctx?.content ?? "";
      const p =
        (ctx && typeof ctx !== "string" ? ctx.path : note.path) ||
        note.file?.path;
      if (p && addedPaths.has(p)) continue;
      notePrompts.push(content);
      if (p) addedPaths.add(p);
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

  const {
    visible: showFileSelector,
    x: filePositionX,
    y: filePositionY,
    searchResults,
    popoverRef: fileSelectorRef,
    close: closeFileSelector,
    handleInput,
    handlers: popoverHandlers,
  } = usePositionedPopover({
    textareaRef,
    currentId,
    noteContextService,
    currentSelectedNotes,
    onSelectNote,
    onSelectAllFiles,
    onDeleteNote,
    setInputValue,
  });

  const chatContainerRef = useRef<HTMLDivElement>(null);

  /** 处理输入变化，更新状态并触发 @ 符号检测 */
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLDivElement>) => {
      const newValue = e.target.textContent || "";
      setInputValue(newValue);
      handleInput();
    },
    [setInputValue, handleInput]
  );

  // 延后声明，避免 TDZ
  const blurCallBack = useCallback(() => {
    // 延迟关闭，给用户时间进行弹窗交互
    setTimeout(() => {
      closeFileSelector();
    }, 300);
  }, [closeFileSelector]);

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
          // 使用 hook 暴露的光标设置方法
          // 这里暂时用 DOM 兜底，后续可再封装
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
        } catch (_) {
          /* ignore */
        }
        textarea.focus();
      }, 0);
    },
    [adjustTextareaHeight]
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
      {HistoryRender({ app })}
      {/* 消息区域：仅中间聊天区域切换，顶部面板与底部输入固定 */}
      <ChatMessage
        ref={(inst) => currentId && (messageListRefs.current[currentId] = inst)}
        messages={sessions[currentId]?.messages ?? []}
        app={app}
        isLoading={isLoading}
        onNearBottomChange={(shouldShow) => setShowScrollBtn(shouldShow)}
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
        x={filePositionX}
        y={filePositionY}
        zIndex={1000}
      >
        <NoteSelector
          searchResults={searchResults}
          noteContextService={noteContextService}
          onSelectAllFiles={popoverHandlers.handleSelectAllFiles}
          onSelectNote={popoverHandlers.handleSelectNote}
          onClose={closeFileSelector}
        />
      </PositionedPopover>
      {/* 输入区域 */}
      <div className={styles.inputArea}>
        <ScrollToBottomRender disabled={isStreaming} visibly={showScrollBtn} />
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
