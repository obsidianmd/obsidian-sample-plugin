import { App, Modal, Notice, Setting } from "obsidian";
import { ArticleScraper } from "./scraper";
import { ArticleScraperSettings } from "./settings";
import { TemplateGenerator } from "./template";

export class ArticleScraperModal extends Modal {
	url: string = "";
	private scraper: ArticleScraper;
	private templateGenerator: TemplateGenerator;

	constructor(
		app: App,
		private settings: ArticleScraperSettings,
		private onSubmit: (content: string, filename: string) => void
	) {
		super(app);
		this.scraper = new ArticleScraper();
		this.templateGenerator = new TemplateGenerator(settings);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h2", { text: "Scrape Article" });

		new Setting(contentEl)
			.setName("Article URL")
			.setDesc("Enter the URL of the article to scrape")
			.addText((text) =>
				text
					.setPlaceholder("https://example.com/article")
					.setValue(this.url)
					.onChange((value) => {
						this.url = value;
					})
			);

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Scrape & Create Note")
					.setCta()
					.onClick(async () => {
						await this.handleSubmit();
					})
			)
			.addButton((btn) =>
				btn
					.setButtonText("Cancel")
					.onClick(() => {
						this.close();
					})
			);
	}

	async handleSubmit() {
		if (!this.url.trim()) {
			new Notice("Please enter a URL");
			return;
		}

		// Validate URL
		try {
			new URL(this.url);
		} catch (e) {
			new Notice("Please enter a valid URL");
			return;
		}

		const metadata = await this.scraper.scrapeArticle(this.url);
		
		if (metadata) {
			const content = this.templateGenerator.generate(metadata);
			const filename = this.sanitizeFilename(metadata.title || "Untitled Article");
			
			this.onSubmit(content, filename);
			this.close();
		}
	}

	private sanitizeFilename(filename: string): string {
		// Remove invalid filename characters
		return filename
			.replace(/[\\/:*?"<>|]/g, "-")
			.replace(/\s+/g, " ")
			.trim()
			.substring(0, 200); // Limit length
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
