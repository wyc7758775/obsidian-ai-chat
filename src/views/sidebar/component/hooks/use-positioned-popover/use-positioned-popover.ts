/**
 * usePositionedPopover
 * 管理基于光标/输入框的绝对定位弹窗（如 @ 提及文件选择器）
 * 功能：
 * - 监听输入框内容变化，检测 @ 符号并提取搜索关键字；
 * - 根据光标位置计算弹窗坐标，防止溢出；
 * - 提供选择文件、批量选择、删除的回调；
 * - 控制弹窗显隐与搜索结果状态。
 * 边界处理：
 * - 输入框未挂载或光标不可用时跳过；
 * - 关键字为空时展示“当前打开笔记”；
 * - 坐标计算时防止右侧/顶部溢出；
 * - 所有异步搜索失败时降级为空数组。
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { useCaretPosition } from "../../../hooks/use-caret-position";
import {
  NoteContext,
  NoteContextService,
} from "../../../../../core/fs-context/note-context";

export interface UsePositionedPopoverParams {
  /** 输入框 ref */
  textareaRef: React.RefObject<HTMLDivElement>;
  /** 当前会话 ID，用于去重与状态隔离 */
  currentId: string | undefined;
  /** 笔记上下文服务实例 */
  noteContextService: NoteContextService;
  /** 选中单个笔记的回调 */
  onSelectNote: (note: NoteContext) => void;
  /** 批量选中笔记的回调 */
  onSelectAllFiles: (notes: NoteContext[]) => void;
  /** 删除笔记的回调 */
  onDeleteNote: (note: NoteContext) => void;
  /** 设置输入值的回调，用于同步状态 */
  setInputValue: (value: string) => void;
}

export interface UsePositionedPopoverReturn {
  /** 是否展示弹窗 */
  visible: boolean;
  /** 弹窗 X 坐标 */
  x: number;
  /** 弹窗 Y 坐标 */
  y: number;
  /** 搜索结果列表 */
  searchResults: NoteContext[];
  /** 弹窗自身 ref，用于获取高度 */
  popoverRef: React.RefObject<HTMLDivElement>;
  /** 手动关闭弹窗 */
  close: () => void;
  /** 获取 div 光标位置的函数 */
  getDivCursorPosition: () => number;
  /** 输入变化处理函数，供外部调用 */
  handleInput: () => void;
  /** 内部事件处理器，供外部组件透传使用 */
  handlers: {
    handleSelectNote: (note: NoteContext) => void;
    handleSelectAllFiles: (notes: NoteContext[]) => void;
    handleDeleteNote: (note: NoteContext) => void;
  };
}

const PADDING = 12; // 与 chat.tsx 保持一致，防止贴边

export function usePositionedPopover({
  textareaRef,
  currentId,
  noteContextService,
  onSelectNote,
  onSelectAllFiles,
  onDeleteNote,
  setInputValue,
}: UsePositionedPopoverParams): UsePositionedPopoverReturn {
  const [visible, setVisible] = useState(false);
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [searchResults, setSearchResults] = useState<NoteContext[]>([]);
  const popoverRef = useRef<HTMLDivElement>(null);

  // 使用正确的useCaretPosition获取光标坐标
  const getCaretPosition = useCaretPosition(textareaRef);

  /** 获取 div 光标位置（字符偏移量） */
  const getDivCursorPosition = useCallback((): number => {
    const el = textareaRef.current;
    if (!el) return 0;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return 0;
    const range = selection.getRangeAt(0);
    const preCareRange = range.cloneRange();
    preCareRange.selectNodeContents(el);
    preCareRange.setEnd(range.endContainer, range.endOffset);
    return preCareRange.toString().length;
  }, [textareaRef]);

  /** 设置 div 光标位置（字符偏移量） */
  const setDivCursorPosition = useCallback(
    (position: number) => {
      const el = textareaRef.current;
      if (!el) return;
      const textNodes: Text[] = [];
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
      let node;
      while ((node = walker.nextNode())) textNodes.push(node as Text);
      let currentPos = 0;
      for (const textNode of textNodes) {
        const nodeLength = textNode.textContent?.length || 0;
        if (currentPos + nodeLength >= position) {
          const range = document.createRange();
          const selection = window.getSelection();
          range.setStart(textNode, position - currentPos);
          range.collapse(true);
          selection?.removeAllRanges();
          selection?.addRange(range);
          break;
        }
        currentPos += nodeLength;
      }
    },
    [textareaRef]
  );

  /** 检查光标前是否有 @ 符号（跳过空格） */
  const checkAtSymbolBefore = useCallback(
    (
      text: string,
      position: number
    ): {
      found: boolean;
      atIndex: number;
      searchKeyword: string;
    } => {
      // 检查 @ 符号前缀
      let atIndex = -1;
      // 向前搜索 @ 符号，但不能跨越空格
      for (let i = position - 1; i >= 0; i--) {
        const char = text[i];
        if (char === "@") {
          atIndex = i;
          break;
        } else if (char === " " || char === "\n" || char === "\t") {
          break;
        }
      }
      // 找到 @ 符号
      if (atIndex === -1) {
        return { found: false, atIndex: -1, searchKeyword: "" };
      }
      // 检查 @ 符号前面的字符
      const charBeforeAt = atIndex > 0 ? text[atIndex - 1] : null;
      const isValidPrefix =
        charBeforeAt === null ||
        charBeforeAt === " " ||
        charBeforeAt === "\n" ||
        charBeforeAt === "\t";
      // 验证前缀字符
      if (!isValidPrefix) {
        return { found: false, atIndex: -1, searchKeyword: "" };
      }
      const searchKeyword = text.slice(atIndex + 1, position);
      // 搜索关键字已提取
      // 确保搜索关键字中没有换行符（通常 @ 提及不跨行）
      if (searchKeyword.includes("\n")) {
        return { found: false, atIndex: -1, searchKeyword: "" };
      }
      return { found: true, atIndex, searchKeyword };
    },
    []
  );

  /** 获取弹窗自身高度 */
  const getPopoverHeight = useCallback(() => {
    return popoverRef.current?.clientHeight || 200;
  }, []);

  /** 计算并设置弹窗坐标（严格按原始逻辑） */
  const calculatePosition = useCallback(() => {
    const el = textareaRef.current;
    const popoverEl = popoverRef.current;
    if (!el || !popoverEl) return;

    // 使用 useCaretPosition 获取光标位置（原始逻辑）
    const cursorPos = getCaretPosition();
    const selectorHeight = getPopoverHeight();
    const popoverWidth = popoverEl.offsetWidth || 250;

    // 获取聊天容器：优先使用稳定的 data 属性，避免 CSS Modules 类名失效
    const container = el.closest("[data-chat-container]") || document.body;
    const containerRect = container.getBoundingClientRect();
    const containerRectWidthPadding = containerRect.width + PADDING;

    // X坐标计算（原始逻辑）：使用相对容器的relativeX
    let targetX = cursorPos.relativeX + 8;
    // 右侧防溢出
    if (targetX + popoverWidth > containerRectWidthPadding) {
      targetX = containerRectWidthPadding - popoverWidth;
    }
    // 左侧防溢出
    if (targetX < 0) {
      targetX = 0;
    }

    // Y坐标计算（原始逻辑）：弹窗在光标上方，预留30安全距离
    const targetY = cursorPos.absoluteY - selectorHeight - 50;

    setX(targetX);
    setY(targetY);
  }, [textareaRef, getPopoverHeight, getCaretPosition]);

  /** 处理输入变化的函数，由外部调用 */
  const handleInput = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;

    const text = el.textContent || "";
    const position = getDivCursorPosition();

    const atResult = checkAtSymbolBefore(text, position);

    if (!atResult.found) {
      setVisible(false);
      setSearchResults([]);
      return;
    }

    // 提取关键字并搜索
    const { searchKeyword } = atResult;
    // @ 符号检测成功，显示弹窗
    setVisible(true);

    // 立即计算位置，确保弹窗显示在正确位置
    setTimeout(() => {
      calculatePosition();
    }, 0);
    if (searchKeyword.trim() !== "") {
      // 搜索关键字
      noteContextService
        .searchNotes(searchKeyword)
        .then((files: any[]) => {
          // 搜索结果返回
          const notes = files.map((f: any) => ({
            title: f.basename || f.name || "未知文件",
            name: f.basename || f.name || "未知文件",
            file: f,
            iconType: "file" as const,
          }));
          setSearchResults(notes);
        })
        .catch(() => {
          // 搜索失败，显示空结果
          setSearchResults([]);
        });
    } else {
      // 空关键字时展示当前打开笔记
      const openNotes = noteContextService.getOpenNotes();
      setSearchResults(openNotes);
    }
  }, [
    textareaRef,
    getDivCursorPosition,
    checkAtSymbolBefore,
    noteContextService,
  ]);

  /** 弹窗显示后计算位置 */
  useEffect(() => {
    if (!visible) return;
    // 弹窗显示后计算位置
    // 延迟计算，确保弹窗已经渲染并获取正确尺寸
    const timer = setTimeout(() => {
      calculatePosition();
    }, 50); // 50ms 延迟确保 DOM 渲染完成

    return () => clearTimeout(timer);
  }, [visible, searchResults, calculatePosition]);

  /** 选中单个笔记并替换输入框 @ 片段 */
  const handleSelectNote = useCallback(
    (note: NoteContext) => {
      if (!currentId) return;
      // 调用外部回调
      onSelectNote(note);
      // 替换输入框内容
      const el = textareaRef.current;
      if (!el) return;
      const text = el.textContent || "";
      const position = getDivCursorPosition();
      const atResult = checkAtSymbolBefore(text, position);
      if (!atResult.found) return;
      const { atIndex } = atResult;
      const newText =
        text.slice(0, atIndex) + `@${note.title} ` + text.slice(position);
      el.textContent = newText;
      // 同步状态并调整光标
      setTimeout(() => {
        setDivCursorPosition(atIndex + (note.title?.length || 0) + 2);
        el.focus();
      }, 0);
      // 关闭弹窗
      setVisible(false);
      // 同步更新外部状态
      setInputValue(newText);
    },
    [
      currentId,
      textareaRef,
      getDivCursorPosition,
      checkAtSymbolBefore,
      setDivCursorPosition,
      onSelectNote,
      setInputValue,
    ]
  );

  /** 批量选中并替换 */
  const handleSelectAllFiles = useCallback(
    (notes: NoteContext[]) => {
      if (!currentId) return;
      onSelectAllFiles(notes);
      // 仅清除 @ 符号
      const el = textareaRef.current;
      if (!el) return;
      const text = el.textContent || "";
      const position = getDivCursorPosition();
      const atResult = checkAtSymbolBefore(text, position);
      if (!atResult.found) return;
      const { atIndex } = atResult;
      const newText = text.slice(0, atIndex) + text.slice(position);
      el.textContent = newText;
      setTimeout(() => {
        setDivCursorPosition(atIndex);
        el.focus();
      }, 0);
      setVisible(false);
      // 同步更新外部状态
      setInputValue(newText);
    },
    [
      currentId,
      textareaRef,
      getDivCursorPosition,
      checkAtSymbolBefore,
      setDivCursorPosition,
      onSelectAllFiles,
      setInputValue,
    ]
  );

  /** 删除笔记（仅关闭弹窗，不修改输入框） */
  const handleDeleteNote = useCallback(
    (note: NoteContext) => {
      onDeleteNote(note);
      // 删除后保持弹窗开启，方便继续选择
    },
    [onDeleteNote]
  );

  return {
    visible,
    x,
    y,
    searchResults,
    popoverRef,
    close: () => setVisible(false),
    // 把内部函数暴露给外部组件使用
    getDivCursorPosition,
    handleInput,
    // 把内部 handler 暴露给外部组件使用
    handlers: {
      handleSelectNote,
      handleSelectAllFiles,
      handleDeleteNote,
    },
  };
}
