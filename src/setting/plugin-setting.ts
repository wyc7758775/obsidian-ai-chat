import { App, PluginSettingTab, Setting } from "obsidian";
import yoranChat from "../main";

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
      .addText((text) =>
        text
          .setPlaceholder("System Prompt")
          .setValue(this.plugin.settings.systemPrompt)
          .onChange(async (value) => {
            this.plugin.settings.systemPrompt = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
