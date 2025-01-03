import ExoCommand from "./ExoCommand";
import ExoContext from "../../../../../common/ExoContext";
import Area from "../../../../../core/src/domain/Area";
import Effort from "../../../../../core/src/domain/effort/Effort";

export default class CreateEffortExoCommand implements ExoCommand {
	name = "Create Effort";
	slug = "create-effort";

	constructor(private ctx: ExoContext) {
	}

	async execute() {
		const activeFile = this.ctx.appUtils.getActiveFileOrThrow();
		const activeKo = await this.ctx.kObjectCreator.createFromTFileTyped(activeFile);
		if (activeKo instanceof Area) {
			let effort = await this.ctx.createEffortUseCase.taskUnderArea(activeKo);
			await this.ctx.appUtils.openKObject(effort);
		}

		if (activeKo instanceof Effort) {
			let effort = await this.ctx.createEffortUseCase.taskUnderEffort(activeKo);
			await this.ctx.appUtils.openKObject(effort);
		}
	}
}
