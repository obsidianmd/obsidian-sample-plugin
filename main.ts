import {Plugin} from 'obsidian';
import {ExoCommandsModal} from "./Commands/ExoCommandsModal";
import "localforage";
import ExoApi from "./ExoApi";

export default class ExoPlugin extends Plugin {
	private api: ExoApi;

	async onload() {
		this.addRibbonIcon('star', 'Exocortex Commands List', () => {
			new ExoCommandsModal(this.app).open();
		});

		this.api = new ExoApi(this.app);
		(this.app as any).plugins.plugins["exo-api"] = this.api;
	}

	onunload() {
		delete (this.app as any).plugins.plugins["exo-api"];
	}
}
