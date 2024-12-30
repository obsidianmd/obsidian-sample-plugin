import {App} from "obsidian";

export default interface ExoCommand {
	name: string;
	slug: string;

	execute(app: App): Promise<void>;
}
