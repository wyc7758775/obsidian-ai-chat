import React, { useCallback } from "react";
import { NoteContextService, NoteContext  } from "../../../core/fs-context/note-context";
import { BookIcon  } from './icon'
import styles from "../css/note-selector.module.css";

export interface FileSelectorProps {
  // 数据
  searchResults: NoteContext[];
  noteContextService: NoteContextService;
  // 回调函数
  onSelectAllFiles: (notes: NoteContext[]) => void;
  onSelectNote: (note: NoteContext  ) => void;
}

export const NoteSelector: React.FC<FileSelectorProps> = ({
  searchResults,
  noteContextService,
  onSelectAllFiles,
  onSelectNote,
}) => {
  const notes = (searchResults.length > 0 ? searchResults : noteContextService.getOpenNotes()) as NoteContext[];

  const handleSelectAllFiles = useCallback(() => {
    onSelectAllFiles(notes);
  }, [notes, onSelectAllFiles]);

  // 从 onclick 改为 onMouseDown 是为了处理 blur 事件处理: 事件触发顺序是 mousedown → blur（失焦） → click
  const handleSelectNote = useCallback((note: NoteContext) => {
    onSelectNote(note);
  }, [onSelectNote]);

  return (
    <>
      <div className={styles.mentionAll} onMouseDown={handleSelectAllFiles}>
        <div className={styles.mentionAllIcon}>
          <BookIcon  />
        </div>
        <span className={styles.mentionAllText}>当前所有活动文件</span>
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
              <div className={styles.fileAvatar}>
                <span className={styles.fileIcon}>{note.icon}</span>
              </div>
              <span className={styles.fileTitle}>{note.title}</span>
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