import OpenRandomNoteExoCommand from "./OpenRandomNoteExoCommand";
import ExoCommand from "./ExoCommand";

export default class ExoCommands {
	static all(): ExoCommand[] {
		return [
			new OpenRandomNoteExoCommand()
		];
	}
}
