import { Notice, Plugin, TFile } from 'obsidian';
import { ArticleScraperModal } from './src/modal';
import { ArticleScraperSettings, DEFAULT_SETTINGS } from './src/settings';
import { ArticleScraperSettingTab } from './src/settingsTab';

export default class ArticleScraperPlugin extends Plugin {
	settings: ArticleScraperSettings;

	async onload() {
		await this.loadSettings();

		// Add ribbon icon
		this.addRibbonIcon('link', 'Scrape Article', () => {
			this.openScraperModal();
		});

		// Add command to open scraper modal
		this.addCommand({
			id: 'scrape-article',
			name: 'Scrape article from URL',
			callback: () => {
				this.openScraperModal();
			}
		});

		// Add command to scrape from clipboard
		this.addCommand({
			id: 'scrape-article-from-clipboard',
			name: 'Scrape article from clipboard URL',
			callback: async () => {
				const clipboardText = await navigator.clipboard.readText();
				if (clipboardText && this.isValidUrl(clipboardText)) {
					new Notice('Scraping article from clipboard...');
					const modal = new ArticleScraperModal(
						this.app,
						this.settings,
						(content: string, filename: string) => this.createNote(content, filename)
					);
					modal.url = clipboardText;
					modal.handleSubmit();
				} else {
					new Notice('No valid URL found in clipboard');
				}
			}
		});

		// Add settings tab
		this.addSettingTab(new ArticleScraperSettingTab(this.app, this));
	}

	openScraperModal() {
		new ArticleScraperModal(
			this.app,
			this.settings,
			(content: string, filename: string) => this.createNote(content, filename)
		).open();
	}

	async createNote(content: string, filename: string) {
		try {
			// Determine the folder path
			let folderPath = this.settings.templateFolder;
			if (folderPath && !folderPath.endsWith('/')) {
				folderPath += '/';
			}

			// Create folder if it doesn't exist
			if (folderPath) {
				const folder = this.app.vault.getAbstractFileByPath(folderPath.slice(0, -1));
				if (!folder) {
					await this.app.vault.createFolder(folderPath.slice(0, -1));
				}
			}

			// Ensure unique filename
			const basePath = folderPath + filename;
			let finalPath = basePath + '.md';
			let counter = 1;

			while (this.app.vault.getAbstractFileByPath(finalPath)) {
				finalPath = `${basePath} ${counter}.md`;
				counter++;
			}

			// Create the file
			const file = await this.app.vault.create(finalPath, content);

			// Open the file
			const leaf = this.app.workspace.getLeaf(false);
			await leaf.openFile(file as TFile);

			new Notice(`Article note created: ${filename}`);
		} catch (error) {
			console.error('Error creating note:', error);
			new Notice('Failed to create note. Check console for details.');
		}
	}

	private isValidUrl(text: string): boolean {
		try {
			new URL(text);
			return true;
		} catch {
			return false;
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
