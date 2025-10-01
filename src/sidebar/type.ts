import { App } from "obsidian";
import { yoranChatSettings } from "src/main";

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
