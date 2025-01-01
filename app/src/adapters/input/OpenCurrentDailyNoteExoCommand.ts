import ExoCommand from "./ExoCommand";
import ExoContext from "../../../../common/ExoContext";
import GetCurrentDailyNoteUseCase from "../../../../core/src/ports/input/GetCurrentDailyNoteUseCase";

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

		let file = this.ctx.vaultAdapter.getObjectFile(currentDN);
		if (!file) {
			throw new Error("Daily note file not found");
		}

		await this.ctx.appUtils.openFile(file);
	}
}
