import { NoteContext } from "../../../core/fs-context/note-context";
import { DeleteIcon, FileIcon } from "./icon";
import styles from "../css/selected-files.module.css";

export const SelectedFiles = ({
  nodes,
  onDeleteNote,
}: {
  nodes: NoteContext[];
  onDeleteNote: (note: NoteContext) => void;
}) => {
  return (
    <div className={styles.fileWrapper}>
      {nodes.map((note, index) => {
        return (
          <div
            className={styles.fileItem}
            key={`${note.path || note.file?.path || index}-${index}`}
          >
            <div className={styles.fileIconContainer}>
              <FileIcon />
            </div>
            <div className={styles.fileItemContent}>
              <span
                className={styles.fileClose}
                onClick={() => {
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
