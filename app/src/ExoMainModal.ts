import {FuzzySuggestModal, Notice} from "obsidian";
import ExoCommand from "./adapters/input/ExoCommand";
import ExoCommands from "./adapters/input/ExoCommands";
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
		const startTime = performance.now();
		try {
			// console.log(`Executing command ${cmd.name}`);
			await cmd.execute(this.ctx);
			// console.log(`Command ${cmd.name} executed`);
		} catch (e) {
			console.error(e);
			new Notice(`Error: ${e.message}`);
		} finally {
			const endTime = performance.now();
			// console.log(`Execution time for command ${cmd.name}: ${endTime - startTime} ms`);
		}
	}
}
