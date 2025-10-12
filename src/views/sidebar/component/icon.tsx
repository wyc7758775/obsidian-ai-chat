import type { ReactNode } from "react";
import styles from "../css/icon.module.css";

export const IconWrap = ({
  label,
  color = 'currentColor',
  children,
  onClick,
}: {
  label: string;
  color?: string;
  children: ReactNode;
  onClick?: () => void;
}) => (
  <div style={{ color }} className={styles.actionBtn} aria-label={label} onClick={onClick}>
    {children}
  </div>
);

export const CopyIcon = ({ onClick }: { onClick?: () => void }) => (
  <IconWrap label="复制" onClick={onClick}>
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M32 12a2 2 0 012 2v28.222c0 .982-.836 1.778-1.867 1.778H7.867C6.836 44 6 43.204 6 42.222V13.778C6 12.796 6.836 12 7.867 12H32zm-2 4H10v24h20V16zM40 4a2 2 0 012 2v25a1 1 0 01-1 1h-2a1 1 0 01-1-1V8H19a1 1 0 01-1-1V5a1 1 0 011-1h21z"
        fill="currentColor"
      ></path>
    </svg>
  </IconWrap>
);
export const GenerateIcon = ({ onClick }: { onClick?: () => void }) => (
  <IconWrap label="生成" onClick={onClick}>
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM6 20V4h7v5h5v11H6z"
        fill="currentColor"
      ></path>
      <path d="M9 12h6v2H9zm0 4h6v2H9z" fill="currentColor"></path>
    </svg>
  </IconWrap>
);
export const BookIcon = () => (
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
);

export const CloseIcon = ({ onClick }: { onClick?: () => void }) => (
  <IconWrap label="删除" onClick={onClick}>
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
  </IconWrap>
);

export const FoldIcon = ({ onClick }: { onClick?: () => void }) => (
  <IconWrap label="收起" onClick={onClick}>
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 8L8 4L4 8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </IconWrap>
);

export const ExpandIcon = ({ onClick }: { onClick?: () => void }) => (
  <IconWrap label="展开" onClick={onClick}>
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 8L8 12L12 8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </IconWrap>
);
export const AddIcon = ({ onClick }: { onClick?: () => void }) => (
  <IconWrap label="新增" onClick={onClick}>
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8 4V12M12 8H4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </IconWrap>
);
// 聊天历史记录图标
export const HistoryIcon = ({ onClick }: { onClick?: () => void }) => (
  <IconWrap label="聊天历史记录" onClick={onClick}>
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M7 9l5 4 5-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </IconWrap>
);
