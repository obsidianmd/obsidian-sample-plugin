import ExoCommand from "./ExoCommand";
import {Notice} from "obsidian";
import ExoContext from "../../../../common/ExoContext";

export default class GetCurrentKOCExoCommand implements ExoCommand {
	name = "Get Current KOC";
	slug = "get-current-koc";

	constructor(private ctx: ExoContext) {
	}

	async execute(): Promise<void> {
		const file = this.ctx.appUtils.getActiveFileOrThrow();
		const currentKO = this.ctx.kObjectCreator.createFromTFile(file);
		new Notice(`The current object's KOC is ${currentKO.koc}`);
	}
}
