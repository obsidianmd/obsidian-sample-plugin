import {App, CachedMetadata, TFile} from "obsidian";
import KObject from "../../../core/src/domain/KObject";
import AppUtils from "../utils/AppUtils";

export default class VaultAdapter {
	constructor(private app: App, private appUtils: AppUtils) {
	}

	getAllMdFiles() {
		return this.app.vault.getMarkdownFiles();
	}

	getFileCache(file: TFile): CachedMetadata | null {
		return this.app.metadataCache.getFileCache(file);
	}

	findMdWith(filter: (f: TFile) => boolean) {
		return this.getAllMdFiles().filter(filter);
	}

	getObjectFileOrThrow(ko: KObject): TFile {
		let res = this.getObjectFile(ko);
		if (!res) {
			throw new Error("Object file not found for " + ko);
		}
		return res;
	}

	getObjectFile(ko: KObject): TFile | null {
		const a = this.findMdWith(f => {
			const frontmatter = this.appUtils.getFrontmatterOrNull(f);
			if (!frontmatter) {
				return false;
			}

			const id: string = frontmatter["uid"];
			return id === ko.id;
		});
		return a[0];
	}
}
