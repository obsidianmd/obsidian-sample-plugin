import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, Tasks, TFile } from 'obsidian';

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
			this.findTagsInNote().then(tags => {
				if (tags) {
					new Notice('Tags: ' + tags.join(', '));
				} else {
					new Notice('No tags found.');
				}
			});
		});
		// Добавляет дополнительные стили к иконке.
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// Добавляет элемент в статус-бар внизу приложения. Не работает в мобильных приложениях.
		// const statusBarItemEl = this.addStatusBarItem();
		// statusBarItemEl.setText('Status Bar Text');

		// Добавляет команду для редактора, которая может выполнять операции с текущим экземпляром редактора.
		this.addCommand({
			id: 'scan-root-folder',
			name: 'Scan notes in root folder',
			callback: async () => {
				const fileList = await this.scanFolder();
				fileList.forEach((file) => {
					const tagsForScan = ['art', '🍆']
					const tags = this.findTagsInNote(file);
					tags.then((tags)=>{
						if (tagsForScan.every(tag => (tags ?? []).includes(tag))) {
							console.log('FOUND', file.name);
							this.moveFileToFolder(file, 'temp')
						}
					})
				});
			}
		});

		// Добавляет вкладку настроек, чтобы пользователь мог настроить различные аспекты плагина.
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// Если плагин подключает глобальные события DOM (на частях приложения, которые не принадлежат этому плагину),
		// использование этой функции автоматически удалит обработчик события при отключении плагина.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			// console.log('click', evt);
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
	async findTagsInNote(file?: TFile) {
		let activeFile = file;

		if (!activeFile) {
			const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (!activeView) {
				return;
			}
			if (activeView.file) {
				activeFile = activeView.file;
			}
		}

		if (!activeFile) {
			return;
		}

		const content = await this.app.vault.read(activeFile);
		// console.log('CONTENT \n', content);

		const fileCache = this.app.metadataCache.getFileCache(activeFile);
		// console.log('FILECACHE', fileCache);

		const frontmatterTags = (fileCache?.frontmatter?.tag || []).map((tag) => {
			return tag ? tag.replace(/#/g, '') : '';
		});

		const fileCacheTags = (fileCache?.tags || []).map((tag) => {
			return tag.tag ? tag.tag.replace(/#/g, '') : '';
		});

		let tags = [...new Set([...frontmatterTags, ...fileCacheTags])];
		// console.log('frontmatterTags', frontmatterTags);
		// console.log('fileCacheTags', fileCacheTags);
		// console.log('TAGS', tags);
		// new Notice(`Found tags: ${tags.join(', ')}`);
		return tags;
	}

	async scanFolder(path?: string, recursive: boolean = true) {
		recursive = false;
		if (!path || path === '/') {
			path = '';
		}
		const files = this.app.vault.getMarkdownFiles();
		const filteredFiles = files.filter((file) => {
			if (recursive) {
				return file.path.startsWith(path);
			} else {
				return file.path.startsWith(path) && file.path.split('/').length === path.split('/').length;
			}
		})
		return filteredFiles;
	}

	async moveFileToFolder(file: TFile, targetFolder: string) {
		try {
			const newPath = `${targetFolder}/${file.name}`;
			await this.app.vault.rename(file, newPath);
			console.log(`Moved ${file.name} to ${newPath}`);
		}
		catch (e) {
			console.error(`Failed to move file ${file.name} to ${targetFolder}` ,e);
		}
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