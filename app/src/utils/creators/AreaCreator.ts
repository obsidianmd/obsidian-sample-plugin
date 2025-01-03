import {FrontMatterCache, TFile} from "obsidian";
import Area from "../../../../core/src/domain/Area";
import {UUID} from "node:crypto";
import AbstractCreator from "./AbstractCreator";
import ExoContext from "../../../../common/ExoContext";

export default class AreaCreator extends AbstractCreator<Area> {
	constructor(ctx: ExoContext) {
		super(ctx);
	}

	async createInternal(file: TFile, id: UUID, fm: FrontMatterCache): Promise<Area> {
		let parentArea: Area | null = null;
		const parentStr: string = fm["a-parent"];
		if (parentStr) {
			const file = this.ctx.appUtils.getTFileFromStrLink(parentStr);
			parentArea = await this.create(file);
		}

		return new Area(id, file.name.replace(".md", ""), parentArea)
	}
}
