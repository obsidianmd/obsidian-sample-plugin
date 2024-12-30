import {Plugin} from 'obsidian';
import {ExoCommandsModal} from "./Commands/ExoCommandsModal";
import "localforage";

export default class ExoPlugin extends Plugin {
	async onload() {
		this.addRibbonIcon('star', 'Exocortex Commands List', () => {
			new ExoCommandsModal(this.app).open();
		});
	}
}
