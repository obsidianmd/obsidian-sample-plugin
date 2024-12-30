import {TFile} from "obsidian";

export default class Note {
	constructor(private tfile: TFile) {
	}

	name(): string {
		return this.tfile.basename;
	}
}
