import {TFile} from "obsidian";
import KObject from "../../../core/src/domain/KObject";
import {KOC} from "../../../core/src/domain/KOC";
import AppUtils from "./AppUtils";
import Area from "../../../core/src/domain/Area";
import {UUID} from "node:crypto";

export default class KObjectCreator {
	constructor(private appUtils: AppUtils) {
	}

	createFromTFile(file: TFile) {
		const frontmatter = this.appUtils.getFrontmatterOrThrow(file);
		const id = frontmatter["uid"] as UUID;
		const koc = this.getFileKoc(file);
		return new KObject(id, koc);
	}

	createFromTFileTyped(file: TFile) {
		const koc = this.getFileKoc(file);
		switch (koc) {
			case KOC.EMS_AREA:
				return this.createArea(file);
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
			const parentFileName = parentStr.replace("[[", "").replace("]]", "");
			const parentAreaFile: TFile = this.appUtils.getFileByName(parentFileName + ".md");
			parentArea = this.createArea(parentAreaFile);
		}

		return new Area(id, file.name.replace(".md", ""), parentArea)
	}

	getFileKoc(file: TFile): KOC {
		const tags = this.appUtils.getTagsFromFile(file);

		if (tags.includes("IMS/MOC")) {
			return KOC.IMS_MOC
		} else if (tags.includes("EMS/Area")) {
			return KOC.EMS_AREA;
		} else if (tags.includes("EMS/Effort")) {
			return KOC.EMS_EFFORT;
		} else if (tags.includes("TMS/DailyNote")) {
			return KOC.TMS_DN;
		} else {
			return KOC.UNKNOWN;
		}
	}
}
