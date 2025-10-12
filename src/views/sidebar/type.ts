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
  noteSelected?: NoteContext[];
  createdAt?: number;
}
