import AppUtils from "./AppUtils";
import {TFile} from "obsidian";
import {UUID} from "node:crypto";
import Effort from "../../../core/src/domain/effort/Effort";
import {EffortStatus} from "../../../core/src/domain/effort/EffortStatus";
import Area from "../../../core/src/domain/Area";
import AreaCreator from "./AreaCreator";

export default class EffortCreator {
	constructor(private appUtils: AppUtils, private areaCreator: AreaCreator) {
	}

	async create(file: TFile): Promise<Effort> {
		const koProperties = this.appUtils.getFrontmatterOrThrow(file);

		const id: UUID = koProperties["uid"] as UUID;
		const status: EffortStatus = koProperties["e-status"] as EffortStatus;
		const started: Date | null = koProperties["started"] ? koProperties["started"] as Date : null;
		const ended: Date | null = koProperties["ended"] ? koProperties["ended"] as Date : null;

		let area: Area | null = null;
		const areaStr: string = koProperties["area"];
		if (areaStr) {
			const file = this.appUtils.getTFileFromStrLink(areaStr);
			area = await this.areaCreator.create(file);
		}

		let parent: Effort | null = null;
		const parentStr: string = koProperties["e-parent"];
		if (parentStr) {
			const file = this.appUtils.getTFileFromStrLink(parentStr);
			parent = await this.create(file);
		}

		const body: string = await this.appUtils.getFileBody(file);
		return new Effort(id, file.name.replace(".md", ""), status, started, ended, area, parent, body);
	}
}
