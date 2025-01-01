import ExoCommand from "./ExoCommand";
import ExoContext from "../../../../common/ExoContext";

export default class CreateEmptyNoteWithinInboxExoCommand implements ExoCommand {
	name = "Create Effort Within Inbox";
	slug = "create-effort-within-inbox";

	constructor(private ctx: ExoContext) {
	}

	async execute() {
		const uid = this.ctx.utils.generateUid();
		const path = `/0 Inbox/${uid}.md`;
		await this.ctx.appUtils.createFile(path, uid);
	}
}
