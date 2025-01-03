import {TFile} from "obsidian";
import KObject from "../../../core/src/domain/KObject";
import {KOC} from "../../../core/src/domain/KOC";
import AppUtils from "./AppUtils";
import Area from "../../../core/src/domain/Area";
import {UUID} from "node:crypto";
import Effort from "../../../core/src/domain/effort/Effort";
import {EffortStatus} from "../../../core/src/domain/effort/EffortStatus";
import KOCFactory from "./KOCFactory";

export default class KObjectCreator {
	constructor(private appUtils: AppUtils) {
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
				return await this.createEffort(file);
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

	/**
	 * @deprecated
	 */
	async createEffort(file: TFile): Promise<Effort> {
		const koProperties = this.appUtils.getFrontmatterOrThrow(file);

		const id: UUID = koProperties["uid"] as UUID;
		const status: EffortStatus = koProperties["e-status"] as EffortStatus;
		const started: Date | null = koProperties["started"] ? koProperties["started"] as Date : null;
		const ended: Date | null = koProperties["ended"] ? koProperties["ended"] as Date : null;

		let area: Area | null = null;
		const areaStr: string = koProperties["area"];
		if (areaStr) {
			const file = this.appUtils.getTFileFromStrLink(areaStr);
			area = this.createArea(file);
		}

		let parent: Effort | null = null;
		const parentStr: string = koProperties["e-parent"];
		if (parentStr) {
			const file = this.appUtils.getTFileFromStrLink(parentStr);
			parent = await this.createEffort(file);
		}

		const body: string = await this.appUtils.getFileBody(file);
		return new Effort(id, file.name.replace(".md", ""), status, started, ended, area, parent, body);
	}

	getFileKoc(file: TFile): KOC {
		const tags = this.appUtils.getTagsFromFile(file);
		return KOCFactory.create(tags);
	}
}
