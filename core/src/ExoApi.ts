import {Notice} from "obsidian";
import ExoContext from "../../common/ExoContext";

export default class ExoApi {

	// noinspection JSUnusedLocalSymbols
	constructor(private ctx: ExoContext) {
	}

	// noinspection JSUnusedGlobalSymbols
	showNotice() {
		new Notice("Hello from the API!");
	}
}
