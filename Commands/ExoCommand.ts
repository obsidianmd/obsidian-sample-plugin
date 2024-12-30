import {App} from "obsidian";

export default interface ExoCommand {
	name: string;

	execute(app: App): Promise<void>;
}
