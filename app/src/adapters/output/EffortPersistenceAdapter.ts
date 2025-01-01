import EffortRepository from "../../../../core/src/ports/output/EffortRepository";
import Effort from "../../../../core/src/domain/effort/Effort";
import ExoContext from "../../../../common/ExoContext";

export default class EffortPersistenceAdapter implements EffortRepository {
	constructor(private ctx: ExoContext) {
	}

	async save(effort: Effort): Promise<void> {
		const folderPath: string = this.getPathForCreate(effort)
		const filePath = folderPath + "/" + effort.title + ".md";
		const data: string = "---\ntags:\n - EMS/Effort\n---\n\nThis is effort created with Exo!";
		await this.ctx.app.vault.create(filePath, data);
	}

	// TODO should be in EffortPathRulesHelper in app module
	getPathForCreate(effort: Effort): string {
		if (effort.area !== null) {
			const areaFile = this.ctx.vaultAdapter.getObjectFileOrThrow(effort.area);
			const areaFolder = areaFile.parent;
			if (!areaFolder) {
				throw new Error("Area file has no parent folder");
			}

			return areaFolder.path;
		}

		return "/0 Inbox/";
	}
}
