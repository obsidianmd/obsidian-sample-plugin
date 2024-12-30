import {App, Notice} from "obsidian";
import ExoCommands from "./Commands/ExoCommands";

export default class ExoApi {

	constructor(private app: App) {
	}

	showNotice() {
		new Notice("Hello from the API!");
	}

	commands(): ExoCommands[] {
		return ExoCommands.all(this.app);
	}

	commandBySlug(slug: string) {
		return ExoCommands.bySlug(this.app, slug);
	}
}
