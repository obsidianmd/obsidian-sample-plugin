import {FrontMatterCache, TFile} from "obsidian";
import {UUID} from "node:crypto";
import ExoContext from "../../../../common/ExoContext";

export default abstract class AbstractCreator<KO> {
	protected constructor(protected ctx: ExoContext) {
	}

	async create(file: TFile): Promise<KO> {
		const fm = this.ctx.appUtils.getFrontmatterOrThrow(file);
		const id: UUID = fm["uid"] as UUID;
		return this.createInternal(file, id, fm);
	}

	protected abstract createInternal(file: TFile, id: UUID, fm: FrontMatterCache): Promise<KO>;
}
