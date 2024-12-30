import Note from "./Note";
import {App} from "obsidian";

export default class NoteRepository {
	private app: App;

	constructor(app: App) {
		this.app = app;
	}

	all(): Note[] {
		const files = this.app.vault.getFiles();
		return files.map(f => new Note(f));
	}
}
