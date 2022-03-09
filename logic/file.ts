import { TAbstractFile, TFile, TFolder, Vault } from "obsidian";

export interface CountData {
	pageCount: number;
	wordCount: number;
}

export type CountsByFile = {
	[path: string]: CountData;
};

export class FileHelper {
	constructor(private vault: Vault) {}

	public async getAllFileCounts(): Promise<CountsByFile> {
		const files = this.vault.getMarkdownFiles();
		const counts: CountsByFile = {};

		for (const file of files) {
			const contents = await this.vault.cachedRead(file);
			const wordCount = this.countWords(contents);
			this.setCounts(counts, file.path, wordCount);
		}

		return counts;
	}

	public getCountDataForPath(counts: CountsByFile, path: string): CountData {
		if (counts.hasOwnProperty(path)) {
			return counts[path];
		}

		const childPaths = Object.keys(counts).filter(
			(countPath) => path === "/" || countPath.startsWith(path + "/")
		);
		return childPaths.reduce(
			(total, childPath) => {
				const childCount = this.getCountDataForPath(counts, childPath);
				total.wordCount += childCount.wordCount;
				total.pageCount += childCount.pageCount;
				return total;
			},
			{
				wordCount: 0,
				pageCount: 0,
			} as CountData
		);
	}

	public async updateFileCounts(
		abstractFile: TAbstractFile,
		counts: CountsByFile
	): Promise<void> {
		if (abstractFile instanceof TFolder) {
			Object.assign(counts, this.getAllFileCounts());
			return;
		}

		if (abstractFile instanceof TFile) {
			const contents = await this.vault.cachedRead(abstractFile);
			const wordCount = this.countWords(contents);
			this.setCounts(counts, abstractFile.path, wordCount);
		}
	}

	private countWords(content: string): number {
		return (content.match(/[^\s]+/g) || []).length;
	}

	private setCounts(
		counts: CountsByFile,
		path: string,
		wordCount: number
	): void {
		counts[path] = {
			wordCount: wordCount,
			pageCount: Math.ceil(wordCount / 300),
		};
	}
}
