import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';

// 設定インターフェースの定義
interface MyPluginSettings {
	fleetingFolder: string;
	archiveFolder: string;
	daysThreshold: number;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	fleetingFolder: 'Fleeting',  // デフォルトのFleetingフォルダ名
	archiveFolder: 'Archives',   // デフォルトのArchivesフォルダ名
	daysThreshold: 7,            // デフォルトの期間（7日）
}

export default class AutoMoveFleetingNotesPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		// コマンドを追加
		this.addCommand({
			id: 'move-fleeting-to-archive',
			name: 'Move Fleeting Notes to Archive',
			callback: () => this.moveFleetingNotes(),
		});

		// 設定タブを追加
		this.addSettingTab(new AutoMoveFleetingNotesSettingTab(this.app, this));

		// その他のプラグイン機能
	}

	// 設定のロード
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	// 設定の保存
	async saveSettings() {
		await this.saveData(this.settings);
	}

	// Fleetingノートを移動する機能
	async moveFleetingNotes() {
		const { fleetingFolder, archiveFolder, daysThreshold } = this.settings;
		const now = Date.now();

		// ファイルを取得
		const files = this.app.vault.getFiles();

		for (const file of files) {
			// Fleetingフォルダにあるノートを対象
			if (file.path.startsWith(fleetingFolder)) {
				const created = this.getCreatedDate(file);  // created:: メタデータを取得
				if (created && now - created > daysThreshold * 86400000) {
					// 期間が経過している場合、移動
					const newPath = file.path.replace(fleetingFolder, archiveFolder);
					await this.app.vault.rename(file, newPath);  // ファイルを移動
					console.log(`Moved ${file.path} to ${newPath}`);
				}
			}
		}
	}

	// created:: メタデータを取得
	getCreatedDate(file: TFile): number | null {
		const metadata = this.app.metadataCache.getFileCache(file);
		const created = metadata?.frontmatter?.created;
		if (created && !isNaN(Date.parse(created))) {
			return Date.parse(created);
		}
		return null;
	}
}

// 設定タブの作成
class AutoMoveFleetingNotesSettingTab extends PluginSettingTab {
	plugin: AutoMoveFleetingNotesPlugin;

	constructor(app: App, plugin: AutoMoveFleetingNotesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		// Fleetingフォルダ名の設定
		new Setting(containerEl)
			.setName('Fleeting Folder')
			.setDesc('The folder where Fleeting notes are stored.')
			.addText(text => text
				.setPlaceholder('Enter Fleeting folder name')
				.setValue(this.plugin.settings.fleetingFolder)
				.onChange(async (value) => {
					this.plugin.settings.fleetingFolder = value;
					await this.plugin.saveSettings();
				}));

		// Archivesフォルダ名の設定
		new Setting(containerEl)
			.setName('Archive Folder')
			.setDesc('The folder where Fleeting notes will be moved to.')
			.addText(text => text
				.setPlaceholder('Enter Archive folder name')
				.setValue(this.plugin.settings.archiveFolder)
				.onChange(async (value) => {
					this.plugin.settings.archiveFolder = value;
					await this.plugin.saveSettings();
				}));

		// 移動までの日数の設定
		new Setting(containerEl)
			.setName('Days Threshold')
			.setDesc('The number of days after which Fleeting notes will be moved to the Archive.')
			.addText(text => text
				.setPlaceholder('Enter number of days')
				.setValue(this.plugin.settings.daysThreshold.toString())
				.onChange(async (value) => {
					const days = parseInt(value);
					if (!isNaN(days)) {
						this.plugin.settings.daysThreshold = days;
						await this.plugin.saveSettings();
					}
				}));
	}
}
