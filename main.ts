import { Console } from 'console';
import { App, Editor, MarkdownView, Modal, FrontMatterCache, Plugin, PluginSettingTab, Setting, View, Workspace, WorkspaceLeaf, getAllTags, MetadataCache, CachedMetadata, TagCache, TAbstractFile, TFile } from 'obsidian';
import { PromptModal } from 'src/Modals/PromptModal';
import { Notes } from 'src/Models/Notes';
import { LEARNING_TYPE, PromptView } from 'src/PromptView';
import { json } from 'stream/consumers';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

export default class Learning extends Plugin {
	settings: MyPluginSettings;
	private notes: Array<Notes>

	async onload() {
		await this.loadSettings();
		this.notes = []

		this.app.workspace.onLayoutReady( () => {
				const files =  this.app.vault.getMarkdownFiles()
				let notes: Notes[] = [];

				let i = 0;
				 files.forEach( (file) => {
					const cache = this.app.metadataCache.getCache(file.path)
					const tags = getAllTags(cache as CachedMetadata)

					notes.push({ id: i, tags: tags, title: file.path, path: this.app.vault.getResourcePath(file)})
					i++
				 })

				 this.notes = notes
		})

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('star', 'Learning', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new PromptModal(this.app, this.notes).open()
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});

		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				editor.replaceSelection('Sample Editor Command');
			}
		});

		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new PromptModal(this.app, this.notes).open()
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', async (evt: PointerEvent) => {
			const element = evt.composedPath()[0] as HTMLInputElement;
			if(element.id.contains("learning-plugin")){
				const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (activeView) {
					const file = activeView.file;
					const metadata = this.app.metadataCache.getFileCache(file);

					const newTag = { tag: "hm", position: { start: { line: 0, col: 0, offset: 0 }, end: { line: 0, col: 0, offset: 0 } } };
					metadata?.tags?.push(newTag)

					let content = await this.app.vault.read(file)
					let finalContent = ""

					if (content.includes('learning-score')){
						const regex = /#learning-score-\d+/g
						finalContent = content.replace(regex, `#learning-score-${element.value}`)
						
					} else
					{
						finalContent = content + `\n\n\n #learning-score-${element.value}`
					}
					
					this.app.vault.modify(file, finalContent)
				}
			}
		});

		
		this.registerEvent(
			this.app.workspace.on('file-open', this.onFileOpen)
		)

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onFileOpen = async (file: TFile) => {
		// Do something on file open
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

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: Learning;

	constructor(app: App, plugin: Learning) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for my awesome plugin.'});

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
