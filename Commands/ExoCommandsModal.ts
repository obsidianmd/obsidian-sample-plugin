import {FuzzySuggestModal} from "obsidian";
import ExoCommand from "./ExoCommand";
import ExoCommands from "./ExoCommands";

export class ExoCommandsModal extends FuzzySuggestModal<ExoCommand> {

	getItems(): ExoCommand[] {
		return ExoCommands.all();
	}

	getItemText(cmd: ExoCommand): string {
		return cmd.name;
	}

	async onChooseItem(cmd: ExoCommand, evt: MouseEvent | KeyboardEvent) {
		await cmd.execute(this.app);
	}
}
