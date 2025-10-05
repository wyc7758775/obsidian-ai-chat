import { NoteContext } from "../../modules/fs-context/note-context";
import { CloseIcon } from "./icon";

export const SelectedFiles = ({
  nodes,
  onDeleteNote
}: {
  nodes: NoteContext[];
  onDeleteNote: (note: NoteContext) => void;
}) => {
  return (
    <div className="yoran-file-wrapper">
      {nodes.map((note, index) => (
        <div className="yoran-file-item" key={`${note.path}-${index}`}>
          <div className="yoran-file-item-logo">📒</div>
          <div className="yoran-file-item-content">
            <span
              className="yoran-file-close"
              onClick={() => {
                onDeleteNote(note);
              }}
            >
              <CloseIcon />
            </span>
            <div className="yoran-file-path">{note.name}</div>
            <div className="yoran-file-line"></div>
            <div className="yoran-file-path">{note.path}</div>
          </div>
        </div>
      ))}
    </div>
  );
};
