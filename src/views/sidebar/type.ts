import { App } from "obsidian";
import { yoranChatSettings } from "src/main";
import { NoteContext } from "src/core/fs-context/note-context";

export interface Message {
  id: string;
  content: string;
  type: "user" | "assistant";
  username?: string;
}

export interface ChatComponentProps {
  onSendMessage?: (message: string) => void;
  settings: yoranChatSettings;
  app: App;
}

export interface HistoryItem {
  id: string;
  messages: Message[];
  noteSelected?: NoteContext[] | Array<{ serialized: string; filePath?: string }>;
  createdAt?: number;
  title?: string; // 历史记录标题，默认为第一条消息内容
  systemMessage?: string; // AI系统信息
}
