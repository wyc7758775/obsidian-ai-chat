import { Editor, MarkdownView, Plugin, View, WorkspaceLeaf } from "obsidian";
import "highlight.js/styles/github.css";
import { SettingTab } from "./core/setting/plugin-setting";
import { YoranSidebarView } from "./views/sidebar/sidebar-view";

// 定义视图类型常量
export const VIEW_TYPE_YORAN_SIDEBAR = "yoran-sidebar-view";

export interface yoranChatSettings {
  appKey: string;
  apiBaseURL: string;
  model: string;
  systemPrompt: string;
}

const DEFAULT_SETTINGS: yoranChatSettings = {
  appKey: "come on",
  apiBaseURL: "https://ark.cn-beijing.volces.com/api/v3",
  model: "kimi-k2-250905", // kimi-k2-250905
  systemPrompt: "你全知全能",
};

export default class yoranChat extends Plugin {
  settings: yoranChatSettings;
  private view: View;

  async onload() {
    await this.loadSettings();

    this.registerView(
      VIEW_TYPE_YORAN_SIDEBAR,
      (leaf: WorkspaceLeaf) =>
        (this.view = new YoranSidebarView(leaf, this.settings)),
    );

    this.app.workspace.onLayoutReady(() => {
      this.initLeaf();
    });

    // This adds a settings tab so the user can configure various aspects of the plugin
    this.addSettingTab(new SettingTab(this.app, this));

    // TODO: 测试 command 替换文章 的效果
    this.addCommand({
      id: "sample-editor-command",
      name: "Sample editor command",
      editorCallback: (editor: Editor, view: MarkdownView) => {
        editor.replaceSelection("Sample Editor Command");
      },
    });

    // TODO: 监听选中文本变化 出现 AI相关功能
    this.registerDomEvent(document, "selectionchange", () => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim()) {
        const selectedText = selection.toString();
        // 检查选择是否在编辑器中
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeView && activeView.editor) {
          console.log("编辑器中选中的文本:", selectedText);
          // this.handleSelectedText(selectedText);
        }
      }
    });
  }

  async initLeaf(): Promise<void> {
    if (this.app.workspace.getLeavesOfType(VIEW_TYPE_YORAN_SIDEBAR).length) {
      return;
    }
    await this.app.workspace.getRightLeaf(false)?.setViewState({
      type: VIEW_TYPE_YORAN_SIDEBAR,
    });
  }

  onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_YORAN_SIDEBAR);
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
