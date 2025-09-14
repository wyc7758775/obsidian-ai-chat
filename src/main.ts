import {
	App,
	Editor,
	MarkdownView,
	Plugin,
	PluginSettingTab,
	Setting,
	WorkspaceLeaf,
} from "obsidian";
import {
	YoranSidebarView,
	VIEW_TYPE_YORAN_SIDEBAR,
} from "./sidebar/sidebar-view";

// Remember to rename these classes and interfaces!

interface yoranChatSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: yoranChatSettings = {
	mySetting: "default",
};

export default class yoranChat extends Plugin {
	settings: yoranChatSettings;
	private view: any;

	async onload() {
		await this.loadSettings();

		this.registerView(
			VIEW_TYPE_YORAN_SIDEBAR,
			(leaf: WorkspaceLeaf) => (this.view = new YoranSidebarView(leaf))
		);

		this.app.workspace.onLayoutReady(() => {
			this.initLeaf();
		});

		this.addCommand({
			id: "sample-editor-command",
			name: "Sample editor command",
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection("Sample Editor Command");
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		this.registerDomEvent(document, "selectionchange", () => {
			const selection = window.getSelection();
			if (selection && selection.toString().trim()) {
				const selectedText = selection.toString();
				// 检查选择是否在编辑器中
				const activeView =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (activeView && activeView.editor) {
					console.log("编辑器中选中的文本:", selectedText);
					// this.handleSelectedText(selectedText);
				}
			}
		});
	}

	async initLeaf(): Promise<void> {
		if (
			this.app.workspace.getLeavesOfType(VIEW_TYPE_YORAN_SIDEBAR).length
		) {
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
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

/**
 * setting tab config
 */
class SampleSettingTab extends PluginSettingTab {
	plugin: yoranChat;

	constructor(app: App, plugin: yoranChat) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Setting #1")
			.setDesc("It's a secret")
			.addText((text) =>
				text
					.setPlaceholder("Enter your secret")
					.setValue(this.plugin.settings.mySetting)
					.onChange(async (value) => {
						this.plugin.settings.mySetting = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
