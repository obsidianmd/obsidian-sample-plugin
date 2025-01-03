import EffortRepository from "../../../../core/src/ports/output/EffortRepository";
import Effort from "../../../../core/src/domain/effort/Effort";
import ExoContext from "../../../../common/ExoContext";
import Area from "../../../../core/src/domain/Area";
import {TFile} from "obsidian";

export default class EffortPersistenceAdapter implements EffortRepository {
	constructor(private ctx: ExoContext) {
	}

	async save(effort: Effort): Promise<void> {
		const folderPath: string = this.ctx.effortPathRulesHelper.getEffortPath(effort)
		const filePath = folderPath + "/" + effort.title + ".md";
		const data = this.serializeData(effort);

		await this.ctx.appUtils.createFile(filePath, data);
	}

	async update(effort: Effort): Promise<void> {
		const file = this.ctx.appUtils.getObjectFileOrThrow(effort);
		const data = this.serializeData(effort);
		await this.ctx.appUtils.updateFile(file, data);
	}

	async find(filter: (e: Effort) => boolean): Promise<Effort[]> {
		let all = await this.findAll();
		return all.filter(filter);
	}

	async findAll(): Promise<Effort[]> {
		const rawEfforts: TFile[] = this.ctx.appUtils.findMdWith((f: TFile) => {
			return this.ctx.appUtils.getTagsFromFile(f).includes("EMS/Effort");
		});

		let promises = rawEfforts.map(async f => await this.ctx.kObjectCreator.createFromTFileTyped(f) as Effort);
		return await Promise.all(promises);
	}

	private serializeData(effort: Effort) {
		let result = "";
		result += "---\n";
		result += "tags:\n";
		result += " - EMS/Effort\n";
		result += "uid: " + effort.id + "\n";
		result += "e-status: " + effort.status + "\n";
		if (effort.started) {
			result += "started: " + effort.started + "\n";
		}
		if (effort.ended) {
			result += "ended: " + effort.ended + "\n";
		}
		if (effort.area) {
			result += "area: \'" + this.getLinkToArea(effort.area) + "\'\n";
		}
		if (effort.parent) {
			result += "e-parent: \'" + this.getLinkToEffort(effort.parent) + "\'\n";
		}
		result += "---\n";
		result += effort.body;
		return result;
	}

	private getLinkToArea(area: Area): string {
		return `[[${area.name}]]`;
	}

	private getLinkToEffort(parent: Effort): string {
		return `[[${parent.title}]]`;
	}
}
