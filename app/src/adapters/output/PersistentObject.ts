import {TFile} from "obsidian";

export default class PersistentObject {
	constructor(private file: TFile, private props: any) {
	}
}
