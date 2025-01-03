import {FrontMatterCache, TFile} from "obsidian";
import {UUID} from "node:crypto";
import Effort from "../../../../core/src/domain/effort/Effort";
import {EffortStatus} from "../../../../core/src/domain/effort/EffortStatus";
import Area from "../../../../core/src/domain/Area";
import AbstractCreator from "./AbstractCreator";
import ExoContext from "../../../../common/ExoContext";

export default class EffortCreator extends AbstractCreator<Effort> {
	constructor(ctx: ExoContext) {
		super(ctx);
	}

	async createInternal(file: TFile, id: UUID, fm: FrontMatterCache): Promise<Effort> {
		const status: EffortStatus = fm["e-status"] as EffortStatus;
		const started: Date | null = fm["started"] ? fm["started"] as Date : null;
		const ended: Date | null = fm["ended"] ? fm["ended"] as Date : null;

		let area: Area | null = null;
		const areaStr: string = fm["area"];
		if (areaStr) {
			const file = this.ctx.appUtils.getTFileFromStrLink(areaStr);
			area = await this.ctx.areaCreator.create(file);
		}

		let parent: Effort | null = null;
		const parentStr: string = fm["e-parent"];
		if (parentStr) {
			const file = this.ctx.appUtils.getTFileFromStrLink(parentStr);
			parent = await this.create(file);
		}

		const body: string = await this.ctx.appUtils.getFileBody(file);
		return new Effort(id, file.name.replace(".md", ""), status, started, ended, area, parent, body);
	}
}
