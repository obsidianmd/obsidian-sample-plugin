import { Notice, requestUrl } from "obsidian";
import { ArticleMetadata } from "./types";

export class ArticleScraper {
	async scrapeArticle(url: string): Promise<ArticleMetadata | null> {
		try {
			new Notice("Fetching article...");
			
			const response = await requestUrl({
				url: url,
				method: "GET",
				headers: {
					"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
				}
			});

			const html = response.text;
			const parser = new DOMParser();
			const doc = parser.parseFromString(html, "text/html");

			const metadata: ArticleMetadata = {
				title: this.extractTitle(doc),
				author: this.extractAuthor(doc),
				published: this.extractPublishDate(doc),
				description: this.extractDescription(doc),
				url: url,
				siteName: this.extractSiteName(doc),
				wordCount: this.estimateWordCount(doc)
			};

			new Notice("Article metadata extracted!");
			return metadata;
		} catch (error) {
			console.error("Error scraping article:", error);
			new Notice("Failed to fetch article. Please check the URL and try again.");
			return null;
		}
	}

	private extractTitle(doc: Document): string {
		// Try multiple meta tags and fallbacks
		return (
			this.getMetaContent(doc, 'property', 'og:title') ||
			this.getMetaContent(doc, 'name', 'twitter:title') ||
			this.getMetaContent(doc, 'property', 'title') ||
			doc.querySelector('title')?.textContent ||
			doc.querySelector('h1')?.textContent ||
			"Untitled"
		).trim();
	}

	private extractAuthor(doc: Document): string {
		return (
			this.getMetaContent(doc, 'name', 'author') ||
			this.getMetaContent(doc, 'property', 'article:author') ||
			this.getMetaContent(doc, 'name', 'twitter:creator') ||
			doc.querySelector('[rel="author"]')?.textContent ||
			doc.querySelector('.author')?.textContent ||
			doc.querySelector('[class*="author"]')?.textContent ||
			""
		).trim();
	}

	private extractPublishDate(doc: Document): string {
		const dateStr = (
			this.getMetaContent(doc, 'property', 'article:published_time') ||
			this.getMetaContent(doc, 'name', 'publishdate') ||
			this.getMetaContent(doc, 'name', 'date') ||
			this.getMetaContent(doc, 'property', 'og:published_time') ||
			doc.querySelector('time')?.getAttribute('datetime') ||
			doc.querySelector('[class*="date"]')?.textContent ||
			""
		).trim();

		if (dateStr) {
			try {
				const date = new Date(dateStr);
				if (!isNaN(date.getTime())) {
					return date.toISOString().split('T')[0]; // YYYY-MM-DD format
				}
			} catch (e) {
				// If parsing fails, return as-is
			}
		}
		return dateStr;
	}

	private extractDescription(doc: Document): string {
		return (
			this.getMetaContent(doc, 'property', 'og:description') ||
			this.getMetaContent(doc, 'name', 'description') ||
			this.getMetaContent(doc, 'name', 'twitter:description') ||
			""
		).trim();
	}

	private extractSiteName(doc: Document): string {
		return (
			this.getMetaContent(doc, 'property', 'og:site_name') ||
			this.getMetaContent(doc, 'name', 'application-name') ||
			new URL(doc.URL || "").hostname ||
			""
		).trim();
	}

	private estimateWordCount(doc: Document): number {
		// Try to find main content
		const article = doc.querySelector('article') || 
						doc.querySelector('[role="main"]') || 
						doc.querySelector('main') ||
						doc.body;
		
		if (!article) return 0;

		const text = article.textContent || "";
		const words = text.trim().split(/\s+/).filter(word => word.length > 0);
		return words.length;
	}

	private getMetaContent(doc: Document, attribute: string, value: string): string | null {
		const element = doc.querySelector(`meta[${attribute}="${value}"]`);
		return element?.getAttribute('content') || null;
	}
}
