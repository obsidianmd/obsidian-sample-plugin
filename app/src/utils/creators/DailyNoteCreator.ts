import {FrontMatterCache, TFile} from "obsidian";
import DailyNote from "../../../../core/src/domain/DailyNote";
import {UUID} from "node:crypto";
import AbstractCreator from "./AbstractCreator";
import ExoContext from "../../../../common/ExoContext";

export default class DailyNoteCreator extends AbstractCreator<DailyNote> {
	constructor(ctx: ExoContext) {
		super(ctx);
	}

	async createInternal(file: TFile, id: UUID, fm: FrontMatterCache): Promise<DailyNote> {
		const dateStr = fm["dn-date"];
		const date = new Date(dateStr);
		return new DailyNote(id, date);
	}
}
