import { App, MarkdownView, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
import * as path from 'path';

interface PluginConfiguration {
	mySetting: string;
	rules?: any; // Add the rules property
	previousFile: TFile | null; // Add the previousFile property
}

const DEFAULT_SETTINGS: PluginConfiguration = {
	mySetting: 'default',
	previousFile: null
}

export default class MoveNotePlugin extends Plugin {
	settings: PluginConfiguration;

	/**
	 * Этот метод вызывается при загрузке плагина.
	 * Он выполняет следующие действия:
	 * - Загружает настройки плагина.
	 * - Отображает уведомление для пользователя.
	 * - Создает иконку в левой панели, при клике на которую извлекаются и отображаются теги из текущей заметки.
	 * - Добавляет команду в редактор для сканирования заметок в корневой папке и перемещения файлов с определенными тегами в временную папку.
	 * - Добавляет вкладку настроек для плагина.
	 * - Регистрирует интервал, который выводит сообщение в консоль каждые 5 минут.
	 * 
	 * @returns {Promise<void>} Обещание, которое разрешается при завершении процесса загрузки.
	 */
	async onload() {
		await this.loadSettings();
		const rules = this.settings.rules;
		// Создает иконку в левой боковой панели.
        const ribbonIconEl = this.addRibbonIcon('dice', 'Move File', (evt: MouseEvent) => {
            const activeFile = this.app.workspace.getActiveFile();
            if (activeFile) {
                this.applyRulesToFile(activeFile, rules);
            } else {
                new Notice('Не выбран активный файл.');
            }
        });


		// Добавляет дополнительные стили к иконке.
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// Добавляет команду для редактора, которая может выполнять операции с текущим экземпляром редактора.
		this.addCommand({
			id: 'scan-root-folder',
			name: 'Scan notes in root folder',
			callback: async () => {
				const fileList = await this.scanFolder();
				fileList.forEach((file) => {
					this.applyRulesToFile(file, rules);
				});
			}
		});

		// Добавляет вкладку настроек, чтобы пользователь мог настроить различные аспекты плагина.
		this.addSettingTab(new MoveNoteSettingTab(this.app, this));

		// При регистрации интервалов эта функция автоматически очистит интервал при отключении плагина.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));

		// Добавляем обработчик события для выполнения действия при открытии другого файла 
		this.app.workspace.on('file-open', (file: TFile|null) => {
			if (this.settings.previousFile && this.settings.previousFile !== file) {
				this.applyRulesToFile(this.settings.previousFile, rules);
			}
			this.settings.previousFile = file;
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

	/**
	 * Извлекает теги из указанного файла заметки или из текущего активного файла заметки.
	 * 
	 * @param {TFile} [file] - Файл заметки, из которого нужно извлечь теги. Если не указан, будет использован текущий активный файл заметки.
	 * @returns {Promise<string[] | undefined>} Обещание, которое разрешается массивом уникальных тегов, найденных в файле заметки, или undefined, если файл не указан или не активен.
	 */
	async getTagsFromNote(file?: TFile) {
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

		
		const fileCache = this.app.metadataCache.getFileCache(activeFile);// Получает кэш-файл для указанного файла.
		const frontmatterTags = (fileCache?.frontmatter?.tags || fileCache?.frontmatter?.tag || []).map((tag:string) => { // Извлекает теги из метаданных файла.
			return tag ? tag.replace(/#/g, '') : ''; // Удаляет символ # из тега.
		});

		const fileCacheTags = (fileCache?.tags || []).map((tag) => { // Извлекает теги из кэш-файла.
			return tag.tag ? tag.tag.replace(/#/g, '') : ''; // Удаляет символ # из тега.
		});


		let tags = [...new Set([...frontmatterTags, ...fileCacheTags])]; // Объединяет теги из метаданных и кэш-файла, удаляя дубликаты.
		return tags;
	}

	/**
	 * Сканирует папку и возвращает список файлов Markdown.
	 * 
	 * @param {string} [path] - Путь к папке, которую нужно сканировать. Если не указан, сканируется корневая папка.
	 * @param {boolean} [recursive=true] - Флаг, указывающий, нужно ли сканировать папку рекурсивно.
	 * @returns {Promise<TFile[]>} Обещание, которое разрешается массивом файлов Markdown, найденных в указанной папке.
	 */
	async scanFolder(path?: string, recursive: boolean = true): Promise<TFile[]> {
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
		});
		return filteredFiles;
	}

	/**
	 * Перемещает файл в указанную целевую папку в хранилище.
	 *
	 * @param file - Файл, который нужно переместить.
	 * @param targetFolder - Путь к целевой папке, куда нужно переместить файл.
	 * @returns Обещание, которое разрешается, когда файл успешно перемещен.
	 * @throws Выбрасывает ошибку, если файл не может быть перемещен.
	 */
	async moveFileToFolder(file: TFile, targetFolder: string) {
		try {
			// Переименовываем файл, чтобы переместить его в целевую
			const newPath = `${targetFolder}/${file.name}`;
			await this.app.vault.rename(file, newPath);
			new Notice(`Файл перемещен ${file.name} to ${newPath}`);
		} catch (e) {
			new Notice(`⚠️Failed to move file ${file.name} to ${targetFolder}`);
			console.error(e);
		}
	}

	async applyRulesToFile(file: TFile, rules: any) {

        rules.forEach((rule: any) => {
            const includeTags = rule?.include?.tags || [];
            const excludeTags = rule?.exclude?.tags || [];
			const newPath = path.normalize(`${rule.targetFolder}/${file.name}`);
			if (path.normalize(file.path) === newPath) {
				return false}
            this.getTagsFromNote(file).then(tags => {
                if (tags) {
					if (includeTags.every((tag) => tags.includes(tag)) && !excludeTags.some((tag) => tags.includes(tag))) {
						new Notice(`Удовлетворяет правилу ${rule.name}`);
						new Notice(`Перемещаем файл ${file.name} в папку ${rule.targetFolder}`);
						this.moveFileToFolder(file, rule.targetFolder);
						return true;
					} else { return false; }
                }
            });
        });
    }

}

class MoveNoteSettingTab extends PluginSettingTab {
	plugin: MoveNotePlugin;

	constructor(app: App, plugin: MoveNotePlugin) {
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