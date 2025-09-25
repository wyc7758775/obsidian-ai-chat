import { NoteContext } from "../../modules/fs-context/note-context";
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
          <div className="yoran-file-item-logo">📄</div>
          <div className="yoran-file-item-content">
            <span
              className="yoran-file-close"
              onClick={() => {
                onDeleteNote(note);
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 4L4 12M4 4L12 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div>{note.name}</div>
            <div className="yoran-file-line"></div>
            <div className="yoran-file-path">{note.path}</div>
          </div>
        </div>
      ))}
    </div>
  );
};
