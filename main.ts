import { Notice, Plugin } from 'obsidian';

export default class ExoPlugin extends Plugin {

	async onload() {
		const ribbonIconEl = this.addRibbonIcon('dice', 'Exo', (evt: MouseEvent) => {
			new Notice('This is Exocortex!');
		});
	}

	onunload() {

	}
}