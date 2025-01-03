import {TFile} from "obsidian";
import KObject from "../../../core/src/domain/KObject";
import {KOC} from "../../../core/src/domain/KOC";
import AppUtils from "./AppUtils";
import Area from "../../../core/src/domain/Area";
import {UUID} from "node:crypto";
import KOCFactory from "./KOCFactory";
import ExoContext from "../../../common/ExoContext";

export default class KObjectCreator {
	constructor(private appUtils: AppUtils, private ctx: ExoContext) {
	}

	createFromTFile(file: TFile) {
		const frontmatter = this.appUtils.getFrontmatterOrThrow(file);
		const id = frontmatter["uid"] as UUID;
		const koc = this.getFileKoc(file);
		return new KObject(id, koc);
	}

	async createFromTFileTyped(file: TFile) {
		const koc = this.getFileKoc(file);
		switch (koc) {
			case KOC.EMS_AREA:
				return this.createArea(file);
			case KOC.EMS_EFFORT:
				return await this.ctx.effortCreator.create(file);
			default:
				throw new Error("Not implemented createFromTFileTyped")
		}
	}

	createArea(file: TFile): Area {
		const koProperties = this.appUtils.getFrontmatterOrThrow(file);

		const id: UUID = koProperties["uid"] as UUID;

		let parentArea: Area | null = null;
		const parentStr: string = koProperties["a-parent"];
		if (parentStr) {
			const file = this.appUtils.getTFileFromStrLink(parentStr);
			parentArea = this.createArea(file);
		}

		return new Area(id, file.name.replace(".md", ""), parentArea)
	}

	getFileKoc(file: TFile): KOC {
		const tags = this.appUtils.getTagsFromFile(file);
		return KOCFactory.create(tags);
	}
}
