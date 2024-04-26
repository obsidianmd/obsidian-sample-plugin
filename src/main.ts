import { App, Editor, MarkdownView, Menu, MenuItem, Modal, Notice, Plugin } from 'obsidian';
import { SettingTab } from './SettingTab';
import { View } from './view';
import CodeEditorModal from './components/CodeEditorModal';

// Remember to rename these classes and interfaces!

interface ExamplePluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: ExamplePluginSettings = {
	mySetting: 'default',
};

export default class ExamplePlugin extends Plugin {
	settings: ExamplePluginSettings;

	async onload() {
		this.registerView('exapmle', (leaf) => new View(leaf));

		await this.loadSettings();

		this.registerCommands();

		this.registerEvent(
			this.app.workspace.on('editor-menu', (menu: Menu) => {
				menu.addItem((item: MenuItem) => {
					item
						.setTitle('在编辑器中编辑代码')
						.setIcon('code')
						.onClick(() => {
							new CodeEditorModal(this).open();
						});
				});
			}),
		);

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin1', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {}

	// 注册快捷命令
	registerCommands() {
		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new CommandModal(this.app).open();
			},
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			// 对当前的编辑器内容进行处理
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			},
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			// checkCallback 允许命令行执行前进行校验
			checkCallback: (checking: boolean) => {
				// Conditions to check
				// markdownView 为当前的 markdown 文件，如果当前没有 markdown 文件（即激活的 Tab 为空），则返回 null
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new CommandModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			},
		});
	}

	async loadSettings() {
		const localSettings = await this.loadData(); // 加载 data.json 配置
		this.settings = Object.assign({}, DEFAULT_SETTINGS, localSettings);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

// 弹窗
class CommandModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
