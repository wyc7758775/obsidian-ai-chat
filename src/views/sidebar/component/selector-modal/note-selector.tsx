import React, { useCallback } from "react";
import {
  NoteContextService,
  NoteContext,
} from "../../../../core/fs-context/note-context";
import { BookIcon, FolderIcon } from "../../../../ui/icon";
import styles from "./note-selector.module.css";
import { EllipsisTooltip } from "../../../../ui/ellipsis-tooltip";

export interface FileSelectorProps {
  // 数据
  searchResults: NoteContext[];
  noteContextService: NoteContextService;
  // 回调函数
  onSelectAllFiles: (notes: NoteContext[]) => void;
  onSelectNote: (note: NoteContext) => void;
  onClose?: () => void;
}

/**
 * 选择笔记弹出层（函数级注释）
 * - 说明：展示“当前所有活动文件”入口与打开笔记列表，支持选择。
 * - 输入有效性：当 `searchResults` 为空时，回退到 `noteContextService.getOpenNotes()`；回调均需存在。
 * - 特殊情况：选择事件用 `onMouseDown` 处理失焦顺序，避免点击后弹层提前失焦。
 */
export const NoteSelector: React.FC<FileSelectorProps> = ({
  searchResults,
  noteContextService,
  onSelectAllFiles,
  onSelectNote,
  onClose,
}) => {
  const notes = (
    searchResults.length > 0 ? searchResults : noteContextService.getOpenNotes()
  ) as NoteContext[];

  const handleSelectAllFiles = useCallback(() => {
    onSelectAllFiles(notes);
  }, [notes, onSelectAllFiles]);

  // 从 onclick 改为 onMouseDown 是为了处理 blur 事件处理: 事件触发顺序是 mousedown → blur（失焦） → click
  const handleSelectNote = useCallback(
    (note: NoteContext) => {
      onSelectNote(note);
    },
    [onSelectNote]
  );

  return (
    <>
      <div className={styles.selectorHeader}>
        <div className={styles.mentionAll} onMouseDown={handleSelectAllFiles}>
          <div className={styles.mentionAllIcon}>
            <BookIcon />
          </div>
          <span className={styles.mentionAllText}>当前所有活动文件</span>
        </div>
      </div>

      {/* 分组标题 */}
      {notes.length > 0 && (
        <div className={styles.fileGroupTitle}>打开的笔记</div>
      )}

      {/* 文件列表 */}
      <div className={styles.fileList}>
        {notes.length > 0 ? (
          notes.map((note, index) => (
            <div
              key={index}
              className={styles.fileOption}
              onMouseDown={() => handleSelectNote(note)}
            >
              <div className={styles.mentionAllIcon}>
                {note.iconType === "folder" ? <FolderIcon /> : <BookIcon />}
              </div>
              <EllipsisTooltip content={note.title || ""}>
                <span className={styles.fileTitle}>{note.title}</span>
              </EllipsisTooltip>
            </div>
          ))
        ) : (
          <div className={`${styles.fileOption} ${styles.fileEmpty}`}>
            <span>没有打开的笔记</span>
          </div>
        )}
      </div>
    </>
  );
};
