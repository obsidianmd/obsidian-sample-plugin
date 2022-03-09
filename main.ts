import { CountData, CountsByFile, FileHelper } from "logic/file";
import {
	App,
	Plugin,
	PluginSettingTab,
	Setting,
	PluginManifest,
	WorkspaceLeaf,
} from "obsidian";

enum CountType {
	Word = "word",
	Page = "page",
}

interface NovelWordCountSettings {
	countType: CountType;
}

const DEFAULT_SETTINGS: NovelWordCountSettings = {
	countType: CountType.Word,
};

interface NovelWordCountSavedData {
	cachedCounts: CountsByFile;
	settings: NovelWordCountSettings;
}

interface FileItem {
	titleEl: HTMLElement;
}

export default class NovelWordCountPlugin extends Plugin {
	savedData: NovelWordCountSavedData;
	settings: NovelWordCountSettings;
	fileHelper: FileHelper;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);
		this.fileHelper = new FileHelper(this.app.vault);
	}

	// LIFECYCLE

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new NovelWordCountSettingTab(this.app, this));

		this.handleEvents();

		await this.refreshAllCounts();
		await this.updateDisplayedCounts();
	}

	async onunload() {
		this.saveSettings();
	}

	// SETTINGS

	async loadSettings() {
		this.savedData = Object.assign(
			{},
			await this.loadData()
		) as NovelWordCountSavedData;
		const settings: NovelWordCountSettings | null = this.savedData
			? this.savedData.settings
			: null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, settings);
	}

	async saveSettings() {
		await this.saveData(this.savedData);
	}

	// PUBLIC

	public async updateDisplayedCounts() {
		const fileExplorerLeaf = await this.getFileExplorerLeaf();
		const fileItems: { [path: string]: FileItem } = (
			fileExplorerLeaf.view as any
		).fileItems;

		for (const path in fileItems) {
			const counts = this.fileHelper.getCountDataForPath(
				this.savedData.cachedCounts,
				path
			);
			const item = fileItems[path];
			item.titleEl.setAttribute(
				"data-novel-word-count-plugin",
				this.getNodeLabel(counts)
			);
		}
	}

	// FUNCTIONALITY

	private async getFileExplorerLeaf(): Promise<WorkspaceLeaf> {
		return new Promise((resolve) => {
			let foundLeaf: WorkspaceLeaf | null = null;
			this.app.workspace.iterateAllLeaves((leaf) => {
				if (foundLeaf) {
					return;
				}

				const view = leaf.view as any;
				if (!view || !view.fileItems) {
					return;
				}

				foundLeaf = leaf;
				resolve(foundLeaf);
			});

			if (!foundLeaf) {
				throw new Error("Could not find file explorer leaf.");
			}
		});
	}

	private getNodeLabel(counts: CountData): string | undefined {
		if (!counts || typeof counts.wordCount !== "number") {
			return "";
		}

		switch (this.settings.countType) {
			case CountType.Word:
				return `${counts.wordCount.toLocaleString()} words`;
			case CountType.Page:
				return `${counts.pageCount.toLocaleString()} pages`;
		}
	}

	private handleEvents(): void {
		this.registerEvent(
			this.app.vault.on("modify", async (file) => {
				await this.fileHelper.updateFileCounts(
					file,
					this.savedData.cachedCounts
				);
				await this.updateDisplayedCounts();
			})
		);

		this.registerEvent(
			this.app.vault.on("rename", async () => {
				await this.refreshAllCounts();
				await this.updateDisplayedCounts();
			})
		);
	}

	private async refreshAllCounts() {
		this.savedData.cachedCounts = await this.fileHelper.getAllFileCounts();
	}
}

class NovelWordCountSettingTab extends PluginSettingTab {
	plugin: NovelWordCountPlugin;

	constructor(app: App, plugin: NovelWordCountPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h2", { text: "Novel word count settings" });

		new Setting(containerEl)
			.setName("Type of count to show")
			.setDesc("Word count or page count")
			.addDropdown((drop) =>
				drop
					.addOption(CountType.Word, "Word Count")
					.addOption(CountType.Page, "Page Count")
					.setValue(this.plugin.settings.countType)
					.onChange(async (value: CountType) => {
						this.plugin.settings.countType = value;
						await this.plugin.saveSettings();
						await this.plugin.updateDisplayedCounts();
					})
			);
	}
}
