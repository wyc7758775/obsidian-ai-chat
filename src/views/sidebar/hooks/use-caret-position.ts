import { RefObject, useCallback } from "react";

export interface CaretPosition {
  x: number;
  y: number;
  absoluteX: number;
  absoluteY: number;
  relativeX: number;
  relativeY: number;
}

/**
 * 获取 contentEditable DIV 中当前光标的屏幕坐标与相对坐标的 Hook
 * 参数：
 * - editableRef: 可编辑 DIV 的 ref（唯一参数，满足“参数不超过两个”的要求）
 * 返回：
 * - 一个稳定的函数（useCallback）用于在需要时读取光标位置
 * 说明：
 * - 通过在当前光标位置插入零宽度的 span 来测量其位置，然后清理该临时节点
 * - 同时返回相对 editable DIV 的相对坐标，便于进行弹窗定位与避让
 */
export function useCaretPosition(
  editableRef: RefObject<HTMLDivElement>
): () => CaretPosition {
  const getCaretPosition = useCallback((): CaretPosition => {
    const editable = editableRef.current;
    if (!editable) {
      return {
        x: 0,
        y: 0,
        absoluteX: 0,
        absoluteY: 0,
        relativeX: 0,
        relativeY: 0,
      };
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return {
        x: 0,
        y: 0,
        absoluteX: 0,
        absoluteY: 0,
        relativeX: 0,
        relativeY: 0,
      };
    }

    const range = selection.getRangeAt(0);
    const span = document.createElement("span");
    span.appendChild(document.createTextNode("\u200b")); // 零宽度空格

    try {
      range.insertNode(span);
      const rect = span.getBoundingClientRect();
      const divRect = editable.getBoundingClientRect();

      // 移除临时元素
      span.parentNode?.removeChild(span);
      // 合并相邻的文本节点，避免插入/删除产生碎片
      editable.normalize();

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
      return {
        x: 0,
        y: 0,
        absoluteX: 0,
        absoluteY: 0,
        relativeX: 0,
        relativeY: 0,
      };
    }
  }, [editableRef]);

  return getCaretPosition;
}
