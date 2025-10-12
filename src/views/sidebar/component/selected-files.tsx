import { NoteContext } from "../../../core/fs-context/note-context";
import { CloseIcon } from "./icon";
import styles from "../css/selected-files.module.css";

export const SelectedFiles = ({
  nodes,
  onDeleteNote
}: {
  nodes: NoteContext[];
  onDeleteNote: (note: NoteContext) => void;
}) => {
  return (
    <div className={styles.fileWrapper}>
      {nodes.map((note, index) => (
        <div className={styles.fileItem} key={`${note.path}-${index}`}>
          <div className={styles.fileItemLogo}>📒</div>
          <div className={styles.fileItemContent}>
            <span
              className={styles.fileClose}
              onClick={() => {
                onDeleteNote(note);
              }}
            >
              <CloseIcon />
            </span>
            <div className={styles.filePath}>{note.name}</div>
            <div className={styles.fileLine}></div>
            <div className={styles.filePath}>{note.path}</div>
          </div>
        </div>
      ))}
    </div>
  );
};
