import { NoteContext } from "../../../core/fs-context/note-context";
import { CloseIcon } from "./icon";
import styles from "../css/selected-files.module.css";

// 文件类型图标组件
const FileIcon = ({ type }: { type: 'note' | 'folder' }) => {
  if (type === 'folder') {
    return <span className={styles.fileIcon}>📁</span>;
  }
  return <span className={styles.fileIcon}>📄</span>;
};

export const SelectedFiles = ({
  nodes,
  onDeleteNote
}: {
  nodes: NoteContext[];
  onDeleteNote: (note: NoteContext) => void;
}) => {
  return (
    <div className={styles.fileWrapper}>
      {nodes.map((note, index) => {
        // 判断文件类型 - 目前只有笔记类型，为文件夹预留接口
        const fileType = 'note'; // 未来可以根据note的属性判断是否为文件夹
        
        return (
          <div className={styles.fileItem} key={`${note.path || note.file?.path || index}-${index}`}>
            <div className={styles.fileIconContainer}>
              <FileIcon type={fileType} />
            </div>
            <div className={styles.fileItemContent}>
              <span
                className={styles.fileClose}
                onClick={() => {
                  onDeleteNote(note);
                }}
              >
                <CloseIcon />
              </span>
              <div className={styles.fileName}>{note.title || note.name || note.file?.basename || '未知文件'}</div>
              <div className={styles.filePath}>{note.path || note.file?.path || '未知路径'}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
