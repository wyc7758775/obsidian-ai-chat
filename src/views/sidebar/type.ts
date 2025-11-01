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

// 轻量级笔记引用，只存储路径和基本信息
export interface NoteReference {
  path: string; // 笔记文件路径
  title: string; // 笔记标题
  mtime?: number; // 文件修改时间戳，用于验证文件是否被修改
  ctime?: number; // 文件创建时间戳，用于更精确的文件标识
}

export interface HistoryItem {
  id: string;
  messages: Message[];
  noteSelected?: NoteReference[]; // 改为轻量级引用
  createdAt?: number;
  title?: string; // 历史记录标题，默认为第一条消息内容
  systemMessage?: string; // AI系统信息
  roleName?: string; // 关联角色名称（用于展示与切换）
}
