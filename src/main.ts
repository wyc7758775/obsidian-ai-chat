import { Editor, MarkdownView, Plugin, View, WorkspaceLeaf } from "obsidian";
import "highlight.js/styles/github.css";
import { SettingTab } from "./core/setting/plugin-setting";
import { YoranSidebarView } from "./sidebar-view";

// 定义视图类型常量
export const VIEW_TYPE_YORAN_SIDEBAR = "yoran-sidebar-view";
// 插件文件夹名（用于在 Vault 中创建专属数据目录）。
// 说明：使用 manifest.json 中的 name 更贴近“插件名”，但为了文件夹安全性，
// 由存储服务进行清洗（转小写、空格转连字符、移除特殊字符）。
export const PLUGIN_FOLDER_NAME = "MCP Chat Yoran for kimi2";

export interface yoranChatSettings {
  appKey: string;
  apiBaseURL: string;
  model: string;
  systemPrompt: string;
  maxContextTokens: number; // 最大上下文 token 数量限制
  suggestionTemplates?: string[]; // 空状态建议提示词，最多10条
}

const DEFAULT_SETTINGS: yoranChatSettings = {
  appKey: "come on",
  apiBaseURL: "https://ark.cn-beijing.volces.com/api/v3",
  model: "kimi-k2-250905", // kimi-k2-250905
  systemPrompt: "简略的回答我的任何问题",
  maxContextTokens: 8000, // 默认上下文限制为 8000 tokens
  // 默认建议提示词（作为占位与回退）
  suggestionTemplates: [
    "请帮我总结这篇笔记的重点并给出行动项",
    "把这段文字润色为更流畅、自然的中文",
    "为这篇文章生成一个结构化大纲（含章节与要点）",
    "指出内容的逻辑问题并给出改进建议",
  ],
};

export default class yoranChat extends Plugin {
  settings: yoranChatSettings;
  private view: View;

  async onload() {
    await this.loadSettings();

    this.registerView(
      VIEW_TYPE_YORAN_SIDEBAR,
      (leaf: WorkspaceLeaf) =>
        (this.view = new YoranSidebarView(leaf, this.settings))
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
        // 检查选择是否在编辑器中
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeView && activeView.editor) {
          // this.handleSelectedText(selection.toString());
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
