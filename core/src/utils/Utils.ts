import {App} from "obsidian";

export default class Utils {

	constructor(private app: App) {
	}


	generateUid(): string {
		return crypto.randomUUID();
	}
}
