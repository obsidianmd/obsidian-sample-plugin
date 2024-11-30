import { Notice, Plugin } from 'obsidian';

export default class ExoPlugin extends Plugin {

	async onload() {
		this.addRibbonIcon('dice', 'Exo', () => {
			new Notice('This is Exocortex!');
		});
	}

	onunload() {

	}
}
