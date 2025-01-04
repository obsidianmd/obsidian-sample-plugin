import {TFile} from "obsidian";
import KObject from "../../../../core/src/domain/KObject";
import {KOC} from "../../../../core/src/domain/KOC";
import {UUID} from "node:crypto";
import KOCFactory from "../KOCFactory";
import ExoContext from "../../../../common/ExoContext";

export default class KObjectCreator {
	constructor(private ctx: ExoContext) {
	}

	createFromTFile(file: TFile) {
		const frontmatter = this.ctx.appUtils.getFrontmatterOrThrow(file);
		const id = frontmatter["uid"] as UUID;
		const koc = this.getFileKoc(file);
		return new KObject(id, koc);
	}

	async createFromTFileTyped(file: TFile) {
		const koc = this.getFileKoc(file);
		switch (koc) {
			case KOC.EMS_AREA:
				return this.ctx.areaCreator.create(file);
			case KOC.EMS_EFFORT:
				return await this.ctx.effortCreator.create(file);
			default:
				throw new Error(`KOC '${koc}' not supported`);
		}
	}

	getFileKoc(file: TFile): KOC {
		const tags = this.ctx.appUtils.getTagsFromFile(file);
		return KOCFactory.create(tags);
	}
}
