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
				cls: "pgn-viewer",
			});

			const options = this.parsePgnWithOptions(source.trim());

			const viewerConfig = {
				pgn: options.pgn,
				orientation: (options.orientation as 'white' | 'black') || 'white',
				fen: options.fen || undefined,
				// showMoves: options.showMoves === 'true' || this.settings.showMoves,
				chessground: {
					movable: {
						free: true,
						color: 'both',
					},
					orientation: (options.orientation as 'white' | 'black') || 'white',
				},
				drawable: {
					enabled: true,
					visible: true,
					shapes: [],
					brushes: {
						green: { key: 'green', color: '#00FF00', opacity: 0.6 },
						red: { key: 'red', color: 'rgba(255,154,28,0.91)', opacity: 0.6 },
					},
				},
				menu: {

				}


			};

			PgnViewer(boardElement, viewerConfig);

			boardElement.style.setProperty('--board-color', this.settings.accentColor);
		});
	}

	parsePgnWithOptions(source: string): {
		pgn: string;
		orientation?: string;
		fen?: string;
		showMoves?: string;
		editable?: string;
	} {
		const options: any = {};
		const lines = source.split('\n');
		const pgnLines: string[] = [];

		for (const line of lines) {
			const match = line.match(/\[([a-zA-Z]+)\s+"(.+)"]/);
			if (match) {
				const [, key, value] = match;
				options[key.toLowerCase()] = value;
			} else {
				pgnLines.push(line);
			}
		}

		return {
			pgn: pgnLines.join('\n').trim(),
			...options,
		};
	}


	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
