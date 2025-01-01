import ExoCommand from "./ExoCommand";
import {Notice} from "obsidian";
import CountNotesUseCase from "../../../../core/src/ports/input/CountNotesUseCase";

export default class CountNotesExoCommand implements ExoCommand {
	name = "Notes Count";
	slug = "count-notes";

	constructor(private useCase: CountNotesUseCase) {
	}

	async execute(): Promise<void> {
		const result = this.useCase.count();

		new Notice(`Vault has ${result} notes`);
	}
}
