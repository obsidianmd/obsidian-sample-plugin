import {Plugin} from 'obsidian';
import {ExoCommandsModal} from "./Commands/ExoCommandsModal";

export default class ExoPlugin extends Plugin {
	async onload() {
		this.addRibbonIcon('star', 'Exocortex Commands List', () => {
			new ExoCommandsModal(this.app).open();
		});
	}
}
