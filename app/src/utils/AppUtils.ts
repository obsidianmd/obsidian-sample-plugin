import {App, FrontMatterCache, TFile} from "obsidian";

export default class AppUtils {
	constructor(private app: App) {
	}

	async createFile(path: string, textContent: string) {
		await this.app.vault.create(path, textContent);
	}

	async openFile(file: TFile) {
		const leaf = this.app.workspace.getLeaf(false);
		await leaf.openFile(file);
	}

	getActiveFileOrThrow(): TFile {
		const file = this.getActiveFileOrNull();
		if (!file) {
			throw new Error('No note opened.');
		}

		return file;
	}

	getActiveFileOrNull(): TFile | null {
		return this.app.workspace.getActiveFile();
	}

	getFrontmatterOrNull(file: TFile): FrontMatterCache | null {
		try {
			return this.getFrontmatterOrThrow(file)
		} catch (e) {
			return null;
		}
	}

	getFrontmatterOrThrow(file: TFile): FrontMatterCache {
		let fileCache = this.app.metadataCache.getFileCache(file);
		if (!fileCache) {
			throw new Error(`File cache not found for ${file.path}`);
		}
		if (!fileCache.frontmatter) {
			throw new Error(`Frontmatter not found for ${file.path}`);
		}
		return fileCache.frontmatter;
	}

	getTagsFromFile(file: TFile): string[] {
		const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;

		if (frontmatter && frontmatter.tags) {
			if (typeof frontmatter.tags === "string") {
				return frontmatter.tags.split(",").map(tag => tag.trim());
			}

			if (Array.isArray(frontmatter.tags)) {
				return frontmatter.tags;
			}
		}
		return [];
	}

	getFileByName(parentFileName: string): TFile {
		return this.app.vault.getMarkdownFiles().filter(f => f.name == parentFileName)[0];
	}


}
