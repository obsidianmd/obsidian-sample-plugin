import { Plugin } from 'obsidian';
import PgnViewer from 'lichess-pgn-viewer';
import { ChessMateSettings, DEFAULT_SETTINGS, ChessMateSettingTab } from './settings';

export default class ChessMatePlugin extends Plugin {
	settings: ChessMateSettings;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new ChessMateSettingTab(this.app, this));

		this.registerMarkdownCodeBlockProcessor("chessmate", (source, el, ctx) => {
			const container = el.createDiv({
				cls: "chessmate-container",
			});

			const boardElement = container.createDiv({
				cls: "pgn-viewer"
			});

			PgnViewer(boardElement, {
				pgn: source.trim(),
				resizable: true
			});

			boardElement.style.width = `${this.settings.boardSize}px`;
		});
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
