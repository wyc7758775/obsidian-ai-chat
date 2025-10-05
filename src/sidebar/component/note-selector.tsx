import React, { useCallback } from "react";
import { NoteContextService, NoteContext  } from "../../modules/fs-context/note-context";
import { BookIcon  } from './icon'

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
      <div className="yoran-mention-all" onMouseDown={handleSelectAllFiles}>
        <div className="yoran-mention-all-icon">
          <BookIcon  />
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
              onMouseDown={() => handleSelectNote(note)}
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
    </>
  );
};