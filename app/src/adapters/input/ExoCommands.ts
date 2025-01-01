import OpenRandomNoteExoCommand from "./OpenRandomNoteExoCommand";
import ExoCommand from "./ExoCommand";
import CountNotesExoCommand from "./CountNotesExoCommand";
import CreateEmptyNoteWithinInboxExoCommand from "./CreateEmptyNoteWithinInboxExoCommand";
import GetActiveFileTagsExoCommand from "./GetActiveFileTagsExoCommand";
import GetCurrentKOCExoCommand from "./GetCurrentKOCExoCommand";
import OpenCurrentDailyNoteExoCommand from "./OpenCurrentDailyNoteExoCommand";
import ExoContext from "../../../../common/ExoContext";
import CreateEffortUnderAreaExoCommand from "./CreateEffortUnderAreaExoCommand";

export default class ExoCommands {
	static all(ctx: ExoContext): ExoCommand[] {
		return [
			new OpenRandomNoteExoCommand(),
			new CountNotesExoCommand(ctx.countNotesUseCase),
			new CreateEmptyNoteWithinInboxExoCommand(ctx),
			new GetActiveFileTagsExoCommand(ctx),
			new GetCurrentKOCExoCommand(ctx),
			new OpenCurrentDailyNoteExoCommand(ctx, ctx.getCurrentDNUseCase),
			new CreateEffortUnderAreaExoCommand(ctx)
		];
	}

	static bySlug(ctx: ExoContext, slug: string): ExoCommand | undefined {
		return ExoCommands.all(ctx).find(c => c.slug === slug);
	}
}
