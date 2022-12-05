import {
	App,
	FileExplorerView,
	MetadataCache,
	Notice,
	normalizePath,
	Plugin,
	PluginSettingTab,
	setIcon,
	Setting,
	TAbstractFile,
	TFile,
	TFolder,
	Vault
} from 'obsidian';
import {around} from 'monkey-around';
import {folderSort} from './custom-sort/custom-sort';
import {SortingSpecProcessor, SortSpecsCollection} from './custom-sort/sorting-spec-processor';
import {CustomSortOrder, CustomSortSpec} from './custom-sort/custom-sort-types';

import {
	addIcons,
	ICON_SORT_ENABLED_ACTIVE,
	ICON_SORT_ENABLED_NOT_APPLIED,
	ICON_SORT_SUSPENDED,
	ICON_SORT_SUSPENDED_SYNTAX_ERROR
} from "./custom-sort/icons";

interface CustomSortPluginSettings {
	additionalSortspecFile: string
	suspended: boolean
	statusBarEntryEnabled: boolean
	notificationsEnabled: boolean
}

const DEFAULT_SETTINGS: CustomSortPluginSettings = {
	additionalSortspecFile: '',
	suspended: true,  // if false by default, it would be hard to handle the auto-parse after plugin install
	statusBarEntryEnabled: true,
	notificationsEnabled: true
}

const SORTSPEC_FILE_NAME: string = 'sortspec.md'
const SORTINGSPEC_YAML_KEY: string = 'sorting-spec'

const ERROR_NOTICE_TIMEOUT: number = 10000

// the monkey-around package doesn't export the below type
type MonkeyAroundUninstaller = () => void

export default class CustomSortPlugin extends Plugin {
	settings: CustomSortPluginSettings
	statusBarItemEl: HTMLElement
	ribbonIconEl: HTMLElement
	ribbonIconStateInaccurate: boolean

	sortSpecCache?: SortSpecsCollection | null
	initialAutoOrManualSortingTriggered: boolean

	fileExplorerFolderPatched: boolean

	showNotice(message: string, timeout?: number) {
		if (this.settings.notificationsEnabled) {
			new Notice(message, timeout)
		}
	}

	readAndParseSortingSpec() {
		const mCache: MetadataCache = this.app.metadataCache
		let failed: boolean = false
		let anySortingSpecFound: boolean = false
		let errorMessage: string | null = null
		// reset cache
		this.sortSpecCache = null
		const processor: SortingSpecProcessor = new SortingSpecProcessor()

		Vault.recurseChildren(this.app.vault.getRoot(), (file: TAbstractFile) => {
			if (failed) return
			if (file instanceof TFile) {
				const aFile: TFile = file as TFile
				const parent: TFolder = aFile.parent
				// Read sorting spec from three sources of equal priority:
				// - files with designated predefined name
				// - files with the same name as parent folders (aka folder notes), e.g.: References/References.md
				// - the file(s) explicitly configured by user in plugin settings
				// Be human-friendly and accept both .md and .md.md file extensions
				//     (the latter representing a typical confusion between note name vs underlying file name)
				if (aFile.name === SORTSPEC_FILE_NAME ||
					aFile.name === `${SORTSPEC_FILE_NAME}.md` ||
					aFile.basename === parent.name ||
					aFile.basename === this.settings.additionalSortspecFile ||
					aFile.path === this.settings.additionalSortspecFile ||
					aFile.path === `${this.settings.additionalSortspecFile}.md`
				) {
					const sortingSpecTxt: string = mCache.getCache(aFile.path)?.frontmatter?.[SORTINGSPEC_YAML_KEY]
					if (sortingSpecTxt) {
						anySortingSpecFound = true
						this.sortSpecCache = processor.parseSortSpecFromText(
							sortingSpecTxt.split('\n'),
							parent.path,
							aFile.name,
							this.sortSpecCache
						)
						if (this.sortSpecCache === null) {
							failed = true
							errorMessage = processor.recentErrorMessage ?? ''
						}
					}
				}
			}
		})

		if (this.sortSpecCache) {
			this.showNotice(`Parsing custom sorting specification SUCCEEDED!`)
		} else {
			if (anySortingSpecFound) {
				errorMessage = errorMessage ? errorMessage : `No valid '${SORTINGSPEC_YAML_KEY}:' key(s) in YAML front matter or multiline YAML indentation error or general YAML syntax error`
			} else {
				errorMessage = `No custom sorting specification found or only empty specification(s)`
			}
			this.showNotice(`Parsing custom sorting specification FAILED. Suspending the plugin.\n${errorMessage}`, ERROR_NOTICE_TIMEOUT)
			this.settings.suspended = true
			this.saveSettings()
		}
	}

	// Safe to suspend when suspended and re-enable when enabled
	switchPluginStateTo(enabled: boolean, updateRibbonBtnIcon: boolean = true) {
		this.settings.suspended = !enabled;
		this.saveSettings()
		let iconToSet: string
		if (this.settings.suspended) {
			this.showNotice('Custom sort OFF');
			this.sortSpecCache = null
			iconToSet = ICON_SORT_SUSPENDED
		} else {
			this.readAndParseSortingSpec();
			if (this.sortSpecCache) {
				this.showNotice('Custom sort ON');
				this.initialAutoOrManualSortingTriggered = true
				iconToSet = ICON_SORT_ENABLED_ACTIVE
			} else {
				iconToSet = ICON_SORT_SUSPENDED_SYNTAX_ERROR
				this.settings.suspended = true
				this.saveSettings()
			}
		}
		const fileExplorerView: FileExplorerView | undefined = this.getFileExplorer()
		if (fileExplorerView) {
			if (!this.fileExplorerFolderPatched) {
				this.fileExplorerFolderPatched = this.patchFileExplorerFolder(fileExplorerView);
			}
			if (this.fileExplorerFolderPatched) {
				fileExplorerView.requestSort();
			}
		} else {
			if (iconToSet === ICON_SORT_ENABLED_ACTIVE) {
				iconToSet = ICON_SORT_ENABLED_NOT_APPLIED

				if (updateRibbonBtnIcon) {
					this.ribbonIconStateInaccurate = true
				}
			}
		}

		if (updateRibbonBtnIcon) {
			setIcon(this.ribbonIconEl, iconToSet)
		}

		this.updateStatusBar();
	}

	async onload() {
		console.log(`loading custom-sort v${this.manifest.version}`);

		await this.loadSettings();

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		if (this.settings.statusBarEntryEnabled) {
			this.statusBarItemEl =  this.addStatusBarItem();
			this.updateStatusBar()
		}

		addIcons();

		// Create an icon button in the left ribbon.
		this.ribbonIconEl = this.addRibbonIcon(
			this.settings.suspended ? ICON_SORT_SUSPENDED : ICON_SORT_ENABLED_NOT_APPLIED,
			'Toggle custom sorting', (evt: MouseEvent) => {
				// Clicking the icon toggles between the states of custom sort plugin
				this.switchPluginStateTo(this.settings.suspended)
			});

		if (!this.settings.suspended) {
			this.ribbonIconStateInaccurate = true
		}

		this.addSettingTab(new CustomSortSettingTab(this.app, this));

		this.registerEventHandlers()

		this.registerCommands()

		this.initialize();
	}

	registerEventHandlers() {
		const plugin: CustomSortPlugin = this
		this.registerEvent(
			// Keep in mind: this event is triggered once after app starts and then after each modification of _any_ metadata
			this.app.metadataCache.on("resolved", () => {
				if (!this.settings.suspended) {
					if (!this.initialAutoOrManualSortingTriggered) {
						this.readAndParseSortingSpec()
						this.initialAutoOrManualSortingTriggered = true
						if (this.sortSpecCache) { // successful read of sorting specifications?
							this.showNotice('Custom sort ON')
							const fileExplorerView: FileExplorerView | undefined = this.getFileExplorer()
							if (fileExplorerView) {
								setIcon(this.ribbonIconEl, ICON_SORT_ENABLED_ACTIVE)
								fileExplorerView.requestSort()
							} else {
								setIcon(this.ribbonIconEl, ICON_SORT_ENABLED_NOT_APPLIED)
								plugin.ribbonIconStateInaccurate = true
							}
							this.updateStatusBar()
						} else {
							this.settings.suspended = true
							setIcon(this.ribbonIconEl, ICON_SORT_SUSPENDED_SYNTAX_ERROR)
							this.saveSettings()
						}
					}
				}
			})
		);
	}

	registerCommands() {
		const plugin: CustomSortPlugin = this
		this.addCommand({
			id: 'enable-custom-sorting',
			name: 'Enable and apply the custom sorting, (re)parsing the sorting configuration first. Sort-on.',
			callback: () => {
				plugin.switchPluginStateTo(true, true)
			}
		});
		this.addCommand({
			id: 'suspend-custom-sorting',
			name: 'Suspend the custom sorting. Sort-off.',
			callback: () => {
				plugin.switchPluginStateTo(false, true)
			}
		});
	}

	initialize() {
		this.app.workspace.onLayoutReady(() => {
			this.fileExplorerFolderPatched = this.patchFileExplorerFolder();
		})
	}

	// For the idea of monkey-patching credits go to https://github.com/nothingislost/obsidian-bartender
	patchFileExplorerFolder(fileExplorer?: FileExplorerView): boolean {
		let plugin = this;
		fileExplorer = fileExplorer ?? this.getFileExplorer()
		if (fileExplorer) {
			// @ts-ignore
			let tmpFolder = new TFolder(Vault, "");
			let Folder = fileExplorer.createFolderDom(tmpFolder).constructor;
			const uninstallerOfFolderSortFunctionWrapper: MonkeyAroundUninstaller = around(Folder.prototype, {
				sort(old: any) {
					return function (...args: any[]) {
						// quick check for plugin status
						if (plugin.settings.suspended) {
							return old.call(this, ...args);
						}

						if (plugin.ribbonIconStateInaccurate && plugin.ribbonIconEl) {
							plugin.ribbonIconStateInaccurate = false
							setIcon(plugin.ribbonIconEl, ICON_SORT_ENABLED_ACTIVE)
						}

						// if custom sort is not specified, use the UI-selected
						const folder: TFolder = this.file
						let sortSpec: CustomSortSpec | null | undefined = plugin.sortSpecCache?.sortSpecByPath[folder.path]
						if (sortSpec) {
							if (sortSpec.defaultOrder === CustomSortOrder.standardObsidian) {
								sortSpec = null // A folder is explicitly excluded from custom sorting plugin
							}
						} else if (plugin.sortSpecCache?.sortSpecByWildcard) {
							// when no sorting spec found directly by folder path, check for wildcard-based match
							sortSpec = plugin.sortSpecCache?.sortSpecByWildcard.folderMatch(folder.path)
							if (sortSpec?.defaultOrder === CustomSortOrder.standardObsidian) {
								sortSpec = null // A folder subtree can be also explicitly excluded from custom sorting plugin
							}
						}
						if (sortSpec) {
							sortSpec.plugin = plugin
							return folderSort.call(this, sortSpec, ...args);
						} else {
							return old.call(this, ...args);
						}
					};
				}
			})
			this.register(uninstallerOfFolderSortFunctionWrapper)
			return true
		} else {
			return false
		}
	}

	// Credits go to https://github.com/nothingislost/obsidian-bartender
	getFileExplorer(): FileExplorerView | undefined {
		let fileExplorer: FileExplorerView | undefined = this.app.workspace.getLeavesOfType("file-explorer")?.first()
			?.view as unknown as FileExplorerView;
		return fileExplorer;
	}

	onunload() {

	}

	updateStatusBar() {
		if (this.statusBarItemEl) {
			this.statusBarItemEl.setText(`Custom sort:${this.settings.suspended ? 'OFF' : 'ON'}`)
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class CustomSortSettingTab extends PluginSettingTab {
	plugin: CustomSortPlugin;

	constructor(app: App, plugin: CustomSortPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for Custom File Explorer Sorting Plugin'});

		new Setting(containerEl)
			.setName('Path to the designated note containing sorting specification')
			.setDesc('The YAML front matter of this note will be scanned for sorting specification, in addition to the `sortspec` notes and folder notes. The `.md` filename suffix is optional.')
			.addText(text => text
				.setPlaceholder('e.g. Inbox/sort')
				.setValue(this.plugin.settings.additionalSortspecFile)
				.onChange(async (value) => {
					this.plugin.settings.additionalSortspecFile = value.trim() ? normalizePath(value) : '';
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Enable the status bar entry')
			.setDesc('The status bar entry shows the label `Custom sort:ON` or `Custom sort:OFF`, representing the current state of the plugin.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.statusBarEntryEnabled)
				.onChange(async (value) => {
					this.plugin.settings.statusBarEntryEnabled = value;
					if (value) {
						// Enabling
						if (this.plugin.statusBarItemEl) {
							// for sanity
							this.plugin.statusBarItemEl.detach()
						}
						this.plugin.statusBarItemEl =  this.plugin.addStatusBarItem();
						this.plugin.updateStatusBar()

					} else { // disabling
						if (this.plugin.statusBarItemEl) {
							this.plugin.statusBarItemEl.detach()
						}
					}
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Enable notifications of plugin state changes')
			.setDesc('The plugin can show notifications about its state changes: e.g. when successfully parsed and applied'
			+ ' the custom sorting specification, or, when the parsing failed. If the notifications are disabled,'
			+ ' the only indicator of plugin state is the ribbon button icon. The developer console presents the parsing'
			+ ' error messages regardless if the notifications are enabled or not.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.notificationsEnabled)
				.onChange(async (value) => {
					this.plugin.settings.notificationsEnabled = value;
					await this.plugin.saveSettings();
				}));
	}
}
