import AppUtils from "./AppUtils";
import {TFile} from "obsidian";
import Area from "../../../core/src/domain/Area";
import {UUID} from "node:crypto";

export default class AreaCreator {
	constructor(private appUtils: AppUtils) {
	}

	async create(file: TFile): Promise<Area> {
		const koProperties = this.appUtils.getFrontmatterOrThrow(file);

		const id: UUID = koProperties["uid"] as UUID;

		let parentArea: Area | null = null;
		const parentStr: string = koProperties["a-parent"];
		if (parentStr) {
			const file = this.appUtils.getTFileFromStrLink(parentStr);
			parentArea = await this.create(file);
		}

		return new Area(id, file.name.replace(".md", ""), parentArea)
	}
}
