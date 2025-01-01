import ExoCommand from "./ExoCommand";
import {Notice} from "obsidian";
import ExoContext from "../../../../common/ExoContext";

export default class GetActiveFileTagsExoCommand implements ExoCommand {
	name = "Get Active File Tags";
	slug = "get-active-file-tags";

	constructor(private ctx: ExoContext) {
	}

	async execute(): Promise<void> {
		const activeFile = this.ctx.appUtils.getActiveFileOrThrow();
		const tags = this.ctx.appUtils.getTagsFromFile(activeFile);
		new Notice(`The current opened note has tags: ${tags.join(", ")}`);
	}
}
