import ExoCommand from "./ExoCommand";
import {App, Notice} from "obsidian";
import NoteRepository from "../Domain/NoteRepository";

export default class CountNotesExoCommand implements ExoCommand {
	name: string = "Количество заметок";
	slug: string = "count-notes";

	constructor(private app: App) {
	}

	async execute(): Promise<void> {
		const noteRepository = new NoteRepository(this.app);
		const count = noteRepository.all().length;
		new Notice(`Vault has ${count} notes`);
	}
}
