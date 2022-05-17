import { App, Editor, MarkdownView, Plugin, PluginSettingTab, Setting } from 'obsidian';

interface CodeBlockPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: CodeBlockPluginSettings = {
	mySetting: 'default'
}

export default class CodeBlockPlugin extends Plugin {
	settings: CodeBlockPluginSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'Code block',
			name: 'Toggle code block',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(this.settings);
				const selection = editor.getSelection();
				if (selection.length == 0) {
					editor.replaceSelection('```\n\n```\n');
					return;
				}

				const hljs = require('highlight.js/lib/common');
				const highlight = hljs.highlightAuto(selection, ["java", "javascript", "sql", "kotlin", "python", "groovy", "xml", "html", "yaml", "typescript"]);
				const language = highlight.language;
				console.log(highlight);
				console.log(selection);
				console.log(language);

				editor.replaceSelection('```' + language + '\n' + selection + '\n```' + '\n');
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new CodeBlockTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'paste', (event: ClipboardEvent) => {
			const paste = (event.clipboardData).getData('text');
			console.log('paste', paste);
		});
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
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for code-block plugin.'});

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					console.log('Secret: ' + value);
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
