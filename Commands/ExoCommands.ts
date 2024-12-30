import OpenRandomNoteExoCommand from "./OpenRandomNoteExoCommand";
import ExoCommand from "./ExoCommand";
import CountNotesExoCommand from "./CountNotesExoCommand";
import {App} from "obsidian";

export default class ExoCommands {
	static all(app: App): ExoCommand[] {
		return [
			new OpenRandomNoteExoCommand(),
			new CountNotesExoCommand(app)
		];
	}
}
