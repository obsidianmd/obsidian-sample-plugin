import ExoCommand from "./ExoCommand";
import ExoContext from "../../../../../common/ExoContext";
import GetCurrentDailyNoteUseCase from "../../../../../core/src/ports/input/GetCurrentDailyNoteUseCase";

export default class OpenCurrentDailyNoteExoCommand implements ExoCommand {
	name = "Open Current Daily Note";
	slug = "open-current-daily-note";

	constructor(private ctx: ExoContext,
				private getCurrentDailyNoteUseCase: GetCurrentDailyNoteUseCase) {
	}

	async execute() {
		const currentDN = await this.getCurrentDailyNoteUseCase.get();

		if (!currentDN) {
			throw new Error("No current daily note found");
		}

		await this.ctx.appUtils.openKObject(currentDN);
	}
}
