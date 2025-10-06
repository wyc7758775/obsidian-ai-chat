import { Notice, ItemView, WorkspaceLeaf } from "obsidian";
import React from "react";
import { createRoot, Root } from "react-dom/client";
import { ChatComponent } from "./ai-chat";
import { yoranChatSettings, VIEW_TYPE_YORAN_SIDEBAR } from "../main";

// 创建自定义侧边栏视图
export class YoranSidebarView extends ItemView {
  private root: Root | null = null;
  private settings: yoranChatSettings;

  constructor(leaf: WorkspaceLeaf, settings: yoranChatSettings) {
    super(leaf);
    this.settings = settings;
  }

  getViewType() {
    return VIEW_TYPE_YORAN_SIDEBAR;
  }

  getDisplayText() {
    return "Yoran Chat";
  }

  getIcon() {
    return "message-circle";
  }

  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();

    // 创建 React 根节点
    this.root = createRoot(container);

    // 渲染 React 组件
    this.root.render(
      React.createElement(ChatComponent, {
        onSendMessage: this.handleSendMessage.bind(this),
        settings: this.settings,
        app: this.app,
      })
    );
  }

  private handleSendMessage(message: string) {
    console.log("发送消息:", message);
    // 这里可以添加发送消息到外部服务的逻辑
  }

  // 添加接收选中文本的方法
  public receiveSelectedText(text: string): void {
    // 这里可以通过 React 的状态管理来更新组件
    console.log("接收到选中文本:", text);
    new Notice(`接收到选中文本: ${text.substring(0, 50)}...`);
  }

  async onClose() {
    // 清理 React 根节点
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
  }
}
