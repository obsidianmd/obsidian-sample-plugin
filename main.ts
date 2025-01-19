import { App, MarkdownView, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';

interface PluginConfiguration {
	mySetting: string;
	rules?: any; // Add the rules property
}

const DEFAULT_SETTINGS: PluginConfiguration = {
	mySetting: 'default'
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
			// Вызывается при клике на иконку.
			rules.forEach((rule: any) => {
				const includeTags = rule?.include?.tags||[];
				const excludeTags = rule?.exclude?.tags||[]; 

				this.getTagsFromNote().then(tags => {
					if (tags) {
						const activeFile = this.app.workspace.getActiveFile();
						if (activeFile) {
							//вставить сюда код 
							if (includeTags.every((tag) => tags.includes(tag)) && !excludeTags.some((tag) => tags.includes(tag))) {//проверяем наличие всех тегов из списка в тегах файла
								new Notice(`Удовлетворяет правилу ${rule.name}`);
								this.moveFileToFolder(activeFile, rule.targetFolder);
							}
						} else {
							new Notice('Не выбран активный файл.');
						}
					} else {
						new Notice('Не удовлетворяет правилам для переноса');
					}
				});
			});
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
					this.settings.rules.forEach((rule: any) => {
						const includeTags = rule?.include?.tags||[];
						const excludeTags = rule?.exclude?.tags||[]; 
						const tags = this.getTagsFromNote(file);
						tags.then((tags)=>{//получаем теги из файла
							if (includeTags.every((tag) => tags.includes(tag)) && !excludeTags.some((tag) => tags.includes(tag))) {//проверяем наличие всех тегов из списка в тегах файла
								this.moveFileToFolder(file, rule.targetFolder)//перемещаем файл в папку
								new Notice(` ${file.name} удовлетворяет правилу ${rule.name}`);
							}
						})
					})
				});
			}
		});

		// Добавляет вкладку настроек, чтобы пользователь мог настроить различные аспекты плагина.
		this.addSettingTab(new MoveNoteSettingTab(this.app, this));

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