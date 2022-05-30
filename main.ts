import { App, Editor, Plugin, PluginSettingTab, Setting } from 'obsidian';

const hljs = require('highlight.js/lib/common');

interface CodeBlockPluginSettings {
	languages: string[];
}

function getDefaultLanguages() {
	return hljs.listLanguages();
}

const DEFAULT_SETTINGS: CodeBlockPluginSettings = {
	languages: getDefaultLanguages()
}

export default class CodeBlockPlugin extends Plugin {
	settings: CodeBlockPluginSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'Add code block',
			name: 'Add code block',
			editorCallback: (editor: Editor) => {
				const selection = editor.getSelection();
				if (selection.length == 0) {
					const pos = editor.getCursor();
					editor.replaceRange('```\n\n```\n', pos);
					editor.setCursor(pos.line + 1);
					return;
				}
				editor.replaceSelection(CodeBlockPlugin.addCodeBlock(this.getLanguage(selection), selection));
			}
		});

		this.addCommand({
			id: 'Paste code block',
			name: 'Paste code block',
			editorCallback: (editor: Editor) => {
				navigator.clipboard.readText().then(text => {
					editor.replaceSelection(CodeBlockPlugin.addCodeBlock(this.getLanguage(text), text));
				});
			}
		});

		this.addSettingTab(new CodeBlockTab(this.app, this));
	}

	private static addCodeBlock(language: string, selection: string) {
		return '```' + language + '\n' + selection + '\n```' + '\n';
	}

	private getLanguage(selection: string) {
		return hljs.highlightAuto(selection, this.settings.languages).language;
	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}


class CodeBlockTab extends PluginSettingTab {
	plugin: CodeBlockPlugin;

	constructor(app: App, plugin: CodeBlockPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl('h2', { text: 'Select active programming languages' });

		hljs.listLanguages().sort().forEach((language: string) => {
			const index = this.plugin.settings.languages.indexOf(language);
			const active = index !== -1;

			return new Setting(containerEl)
				.setName(language)
				.addToggle(toggle => toggle
					.setValue(active)
					.onChange(async () => {
						if (active) {
							this.plugin.settings.languages.splice(index, 1);
						} else {
							this.plugin.settings.languages.push(language);
						}
						await this.plugin.saveSettings();
					}));
		});
	}
}
