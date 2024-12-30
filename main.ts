import {Notice, Plugin} from 'obsidian';

export default class ExoPlugin extends Plugin {

	async onload() {
		this.addRibbonIcon('dice', 'Exo', () => {
			this.showNotice();
		});

		this.addCommand({
			id: 'exo-first-notice',
			name: 'Shows simple Notice',
			callback: () => {
				this.showNotice()
			}
		})
	}

	async showNotice(): Promise<void> {
		new Notice('This is Exocortex!');
	}

	onunload() {

	}
}
