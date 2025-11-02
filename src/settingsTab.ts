import { App, PluginSettingTab, Setting } from "obsidian";
import ArticleScraperPlugin from "../main";

export class ArticleScraperSettingTab extends PluginSettingTab {
	plugin: ArticleScraperPlugin;

	constructor(app: App, plugin: ArticleScraperPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "Article Scraper Settings" });

		new Setting(containerEl)
			.setName("Default Category")
			.setDesc("Default category for scraped articles")
			.addText((text) =>
				text
					.setPlaceholder("Article")
					.setValue(this.plugin.settings.defaultCategory)
					.onChange(async (value) => {
						this.plugin.settings.defaultCategory = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Default Read Status")
			.setDesc("Default read status for new articles")
			.addText((text) =>
				text
					.setPlaceholder("Unread")
					.setValue(this.plugin.settings.defaultReadStatus)
					.onChange(async (value) => {
						this.plugin.settings.defaultReadStatus = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Default Note Status")
			.setDesc("Default note status for new articles")
			.addText((text) =>
				text
					.setPlaceholder("baby")
					.setValue(this.plugin.settings.defaultNoteStatus)
					.onChange(async (value) => {
						this.plugin.settings.defaultNoteStatus = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Template Folder")
			.setDesc("Folder where article notes will be created (leave empty for root)")
			.addText((text) =>
				text
					.setPlaceholder("Articles/")
					.setValue(this.plugin.settings.templateFolder)
					.onChange(async (value) => {
						this.plugin.settings.templateFolder = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
