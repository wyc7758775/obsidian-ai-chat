import { App, PluginSettingTab, Setting } from "obsidian";
import yoranChat from "../../main";

export class SettingTab extends PluginSettingTab {
  plugin: yoranChat;

  constructor(app: App, plugin: yoranChat) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    // APP KEY config
    new Setting(containerEl)
      .setName("APP KEY")
      .setDesc("please type Kimi k2 APP KEY")
      .addText((text) =>
        text
          .setPlaceholder("Kimi k2 APP KEY")
          .setValue(this.plugin.settings.appKey)
          .onChange(async (value) => {
            this.plugin.settings.appKey = value;
            await this.plugin.saveSettings();
          })
      );

    // API Base URL config
    new Setting(containerEl)
      .setName("API Base URL")
      .setDesc("please type Kimi k2 API Base URL")
      .addText((text) =>
        text
          .setPlaceholder("Kimi k2 API Base URL")
          .setValue(this.plugin.settings.apiBaseURL)
          .onChange(async (value) => {
            this.plugin.settings.apiBaseURL = value;
            await this.plugin.saveSettings();
          })
      );

    // model config
    new Setting(containerEl)
      .setName("AI model")
      .setDesc("please select AI model")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("kimi-k2-250905", "Kimi K2 250905")
          .setValue(this.plugin.settings.model || "kimi-k2-250905")
          .onChange(async (value) => {
            this.plugin.settings.model = value;
            await this.plugin.saveSettings();
          })
      );

    // system prompt config
    new Setting(containerEl)
      .setName("System Prompt")
      .setDesc("please type system prompt")
      .addTextArea((text) =>
        text
          .setPlaceholder("System Prompt")
          .setValue(this.plugin.settings.systemPrompt)
          .onChange(async (value) => {
            this.plugin.settings.systemPrompt = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Max Context Tokens")
      .setDesc("Maximum number of tokens to keep in conversation context (default: 8000). Lower values save costs but may lose conversation history.")
      .addText((text) =>
        text
          .setPlaceholder("8000")
          .setValue(this.plugin.settings.maxContextTokens.toString())
          .onChange(async (value) => {
            const numValue = parseInt(value);
            if (!isNaN(numValue) && numValue > 0) {
              this.plugin.settings.maxContextTokens = numValue;
              await this.plugin.saveSettings();
            }
          })
      );

    // 自定义空状态建议提示词（最多10条）
    new Setting(containerEl)
      .setName("Suggestion Templates")
      .setDesc("每行一条，最多 10 条；留空则使用默认建议")
      .addTextArea((text) =>
        text
          .setPlaceholder("请在此输入建议提示词，每行一条，最多10条")
          .setValue((this.plugin.settings.suggestionTemplates || []).join("\n"))
          .onChange(async (value) => {
            // 将输入拆分为行，去除空白并限制最多10条
            const lines = value
              .split(/\r?\n/)
              .map((l) => l.trim())
              .filter((l) => l.length > 0)
              .slice(0, 10);

            this.plugin.settings.suggestionTemplates = lines;
            await this.plugin.saveSettings();
          })
      );
  }
}
