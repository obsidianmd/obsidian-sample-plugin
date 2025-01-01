import ExoCommand from "./ExoCommand";
import ExoContext from "../../../../common/ExoContext";
import Area from "../../../../core/src/domain/Area";

export default class CreateEffortUnderAreaExoCommand implements ExoCommand {
	name = "Create Effort Under Area";
	slug = "create-effort-under-area";

	constructor(private ctx: ExoContext) {
	}

	async execute() {
		const activeFile = this.ctx.appUtils.getActiveFileOrThrow();
		const activeKo = this.ctx.kObjectCreator.createFromTFileTyped(activeFile);

		if (!(activeKo instanceof Area)) {
			throw new Error("Active file is not an Area");
		}

		this.ctx.createEffortUseCase.taskUnderArea(activeKo);
	}
}
