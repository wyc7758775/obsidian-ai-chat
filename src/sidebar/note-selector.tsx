
import React, { useCallback } from "react";
import { NoteContextService, NoteContext  } from "../modules/fs-context/note-context";

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

  const handleSelectNote = useCallback((note: NoteContext) => {
    onSelectNote(note);
  }, [onSelectNote]);

  return (
    <>
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
    </>
  );
};