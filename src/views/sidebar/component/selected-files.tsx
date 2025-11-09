import { NoteContext, NoteContextService } from "../../../core/fs-context/note-context";
import { DeleteIcon, FileIcon } from "./icon";
import styles from "../css/selected-files.module.css";

export const SelectedFiles = ({
  nodes,
  onDeleteNote,
  noteContextService,
}: {
  nodes: NoteContext[];
  onDeleteNote: (note: NoteContext) => void;
  noteContextService: NoteContextService;
}) => {
  /**
   * 打开笔记（函数级注释）
   * - 说明：点击文件项时，在 Obsidian 中打开对应笔记。
   * - 输入有效性：当 note 缺少 file/path 时，回退提示并不抛错。
   * - 特殊情况：删除按钮点击需阻止事件冒泡避免触发打开。
   */
  const handleOpen = async (note: NoteContext) => {
    await noteContextService.openNote(note);
  };
  return (
    <div className={styles.fileWrapper}>
      {nodes.map((note, index) => {
        return (
          <div
            className={styles.fileItem}
            key={`${note.path || note.file?.path || index}-${index}`}
            onClick={() => handleOpen(note)}
          >
            <div className={styles.fileIconContainer}>
              <FileIcon />
            </div>
            <div className={styles.fileItemContent}>
              <span
                className={styles.fileClose}
                onClick={(e) => {
                  // 阻止触发文件项的打开操作
                  e.stopPropagation();
                  onDeleteNote(note);
                }}
              >
                <DeleteIcon variant="small" />
              </span>
              <div className={styles.fileName}>
                {note.title || note.name || note.file?.basename || "未知文件"}
              </div>
              <div className={styles.filePath}>
                {note.path || note.file?.path || "未知路径"}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
