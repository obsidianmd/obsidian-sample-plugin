import {FuzzySuggestModal, Notice} from "obsidian";
import ExoCommand from "./adapters/input/commands/ExoCommand";
import ExoCommands from "./adapters/input/commands/ExoCommands";
import ExoContext from "../../common/ExoContext";

export class ExoMainModal extends FuzzySuggestModal<ExoCommand> {

	constructor(private ctx: ExoContext) {
		super(ctx.app);
	}

	getItems(): ExoCommand[] {
		return ExoCommands.all(this.ctx);
	}

	getItemText(cmd: ExoCommand): string {
		return cmd.name;
	}

	async onChooseItem(cmd: ExoCommand) {
		try {
			await cmd.execute(this.ctx);
		} catch (e) {
			console.error(e);
			new Notice(`Error: ${e.message}`);
		}
	}
}
