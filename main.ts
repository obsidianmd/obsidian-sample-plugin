import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

// Не забудьте переименовать эти классы и интерфейсы!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();
		new Notice('This is a notice!');
		// Создает иконку в левой боковой панели.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
			// Вызывается при клике на иконку.
			this.findTagsInNote();
			new Notice('This is a notice!');
		});
		// Добавляет дополнительные стили к иконке.
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// Добавляет элемент в статус-бар внизу приложения. Не работает в мобильных приложениях.
		// const statusBarItemEl = this.addStatusBarItem();
		// statusBarItemEl.setText('Status Bar Text');

		// Добавляет простую команду, которую можно вызвать откуда угодно.
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
		// Добавляет команду для редактора, которая может выполнять операции с текущим экземпляром редактора.
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
		// Добавляет сложную команду, которая проверяет, позволяет ли текущее состояние приложения выполнить команду.
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Условия для проверки.
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// Если checking равно true, мы просто проверяем, может ли команда быть выполнена.
					// Если checking равно false, мы выполняем операцию.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// Эта команда появится в палитре команд только если функция проверки возвращает true.
					return true;
				}
			}
		});

		// Добавляет вкладку настроек, чтобы пользователь мог настроить различные аспекты плагина.
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// Если плагин подключает глобальные события DOM (на частях приложения, которые не принадлежат этому плагину),
		// использование этой функции автоматически удалит обработчик события при отключении плагина.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// При регистрации интервалов эта функция автоматически очистит интервал при отключении плагина.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/**
	 * Асинхронно находит и отображает теги в текущей активной Markdown заметке.
	 * 
	 * Этот метод получает активное представление типа `MarkdownView` из рабочей области Obsidian.
	 * Если активное представление не найдено, метод завершает выполнение.
	 * 
	 * Затем он получает содержимое активного представления и выводит его в консоль.
	 * 
	 * Метод продолжает получать файл, связанный с активным представлением. Если файл не найден, метод завершает выполнение.
	 * 
	 * Используя файл, он извлекает кэш файла из метаданных Obsidian. Он извлекает теги как из frontmatter, так и из тела заметки.
	 * Теги очищаются путем удаления ведущего символа '#'.
	 * 
	 * Наконец, метод выводит найденные теги в консоль и отображает уведомление с найденными тегами.
	 * 
	 * @returns {Promise<void>} Обещание, которое разрешается, когда теги найдены и отображены.
	 */
	async findTagsInNote() {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) return;

		const content = activeView.getViewData();
		console.log('CONTENT', content);

		const file = activeView.file;
		if (!file) return;

		const fileCache = this.app.metadataCache.getFileCache(file);
		const tags = [
			...(fileCache?.frontmatter?.tags.map(tag => tag.replace('#', '')) || []),
			...(fileCache?.tags?.map(tag => tag.tag.replace('#', '')) || [])
		];

		console.log('TAGS', tags);
		new Notice(`Found tags: ${tags.join(', ')}`);
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
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}