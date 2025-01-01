import {TFile} from "obsidian";
import DailyNote from "../../../core/src/domain/DailyNote";
import AppUtils from "./AppUtils";
import {UUID} from "node:crypto";

export default class DailyNoteCreator {
	constructor(private appUtils: AppUtils) {
	}

	createFromTFile(file: TFile) {
		const frontmatter = this.appUtils.getFrontmatterOrThrow(file);
		const id = frontmatter["uid"] as UUID;
		const dateStr = frontmatter["dn-date"];
		const date = new Date(dateStr);
		return new DailyNote(id, date);
	}
}
