import {
	App,
	FileExplorerView,
	MetadataCache,
	Notice,
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
}

const DEFAULT_SETTINGS: CustomSortPluginSettings = {
	additionalSortspecFile: 'Inbox/Inbox.md',
	suspended: true,  // if false by default, it would be hard to handle the auto-parse after plugin install
	statusBarEntryEnabled: true
}

const SORTSPEC_FILE_NAME: string = 'sortspec.md'
const SORTINGSPEC_YAML_KEY: string = 'sorting-spec'

const ERROR_NOTICE_TIMEOUT: number = 10000

export default class CustomSortPlugin extends Plugin {
	settings: CustomSortPluginSettings
	statusBarItemEl: HTMLElement
	ribbonIconEl: HTMLElement

	sortSpecCache: SortSpecsCollection
	initialAutoOrManualSortingTriggered: boolean

	readAndParseSortingSpec() {
		const mCache: MetadataCache = this.app.metadataCache
		let failed: boolean = false
		let anySortingSpecFound: boolean = false
		let errorMessage: string
		// reset cache
		this.sortSpecCache = null
		const processor: SortingSpecProcessor = new SortingSpecProcessor()

		Vault.recurseChildren(this.app.vault.getRoot(), (file: TAbstractFile) => {
			if (failed) return
			if (file instanceof TFile) {
				const aFile: TFile = file as TFile
				const parent: TFolder = aFile.parent
				// Read sorting spec from three sources of equal priority:
				// - files with designated name (sortspec.md by default)
				// - files with the same name as parent folders (aka folder notes): References/References.md
				// - the file explicitly indicated in documentation, by default Inbox/Inbox.md
				if (aFile.name === SORTSPEC_FILE_NAME || aFile.basename === parent.name || aFile.path === DEFAULT_SETTINGS.additionalSortspecFile) {
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
			new Notice(`Parsing custom sorting specification SUCCEEDED!`)
		} else {
			if (anySortingSpecFound) {
				errorMessage = errorMessage ? errorMessage : `No valid '${SORTINGSPEC_YAML_KEY}:' key(s) in YAML front matter or multiline YAML indentation error or general YAML syntax error`
			} else {
				errorMessage = `No custom sorting specification found or only empty specification(s)`
			}
			new Notice(`Parsing custom sorting specification FAILED. Suspending the plugin.\n${errorMessage}`, ERROR_NOTICE_TIMEOUT)
			this.settings.suspended = true
			this.saveSettings()
		}
	}

	async onload() {
		console.log("loading custom-sort");

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
				this.settings.suspended = !this.settings.suspended;
				this.saveSettings()
				let iconToSet: string
				if (this.settings.suspended) {
					new Notice('Custom sort OFF');
					this.sortSpecCache = null
					iconToSet = ICON_SORT_SUSPENDED
				} else {
					this.readAndParseSortingSpec();
					if (this.sortSpecCache) {
						new Notice('Custom sort ON');
						this.initialAutoOrManualSortingTriggered = true
						iconToSet = ICON_SORT_ENABLED_ACTIVE
					} else {
						iconToSet = ICON_SORT_SUSPENDED_SYNTAX_ERROR
						this.settings.suspended = true
						this.saveSettings()
					}
				}
				const fileExplorerView: FileExplorerView = this.getFileExplorer()
				if (fileExplorerView) {
					fileExplorerView.requestSort();
				} else {
					if (iconToSet === ICON_SORT_ENABLED_ACTIVE) {
						iconToSet = ICON_SORT_ENABLED_NOT_APPLIED
					}
				}

				setIcon(this.ribbonIconEl, iconToSet)
				this.updateStatusBar();
			});

		this.addSettingTab(new CustomSortSettingTab(this.app, this));

		this.registerEventHandlers()

		this.initialize();
	}

	registerEventHandlers() {
		this.registerEvent(
			// Keep in mind: this event is triggered once after app starts and then after each modification of _any_ metadata
			this.app.metadataCache.on("resolved", () => {
				if (!this.settings.suspended) {
					if (!this.initialAutoOrManualSortingTriggered) {
						this.readAndParseSortingSpec()
						this.initialAutoOrManualSortingTriggered = true
						if (this.sortSpecCache) { // successful read of sorting specifications?
							new Notice('Custom sort ON')
							const fileExplorerView: FileExplorerView = this.getFileExplorer()
							if (fileExplorerView) {
								setIcon(this.ribbonIconEl, ICON_SORT_ENABLED_ACTIVE)
								fileExplorerView.requestSort()
							} else {
								setIcon(this.ribbonIconEl, ICON_SORT_ENABLED_NOT_APPLIED)
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

	initialize() {
		this.app.workspace.onLayoutReady(() => {
			this.patchFileExplorerFolder();
		})
	}

	// For the idea of monkey-patching credits go to https://github.com/nothingislost/obsidian-bartender
	patchFileExplorerFolder() {
		let plugin = this;
		let leaf = this.app.workspace.getLeaf();
		const fileExplorer = this.app.viewRegistry.viewByType["file-explorer"](leaf) as FileExplorerView;
		// @ts-ignore
		let tmpFolder = new TFolder(Vault, "");
		let Folder = fileExplorer.createFolderDom(tmpFolder).constructor;
		this.register(
			// TODO: Unit tests please!!! The logic below becomes more and more complex, bugs are captured at run-time...
			around(Folder.prototype, {
				sort(old: any) {
					return function (...args: any[]) {
						// quick check for plugin status
						if (plugin.settings.suspended) {
							return old.call(this, ...args);
						}

						// if custom sort is not specified, use the UI-selected
						const folder: TFolder = this.file
						let sortSpec: CustomSortSpec = plugin.sortSpecCache?.sortSpecByPath[folder.path]
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
							return folderSort.call(this, sortSpec, ...args);
						} else {
							return old.call(this, ...args);
						}
					};
				},
			})
		);
		leaf.detach()
	}

	// Credits go to https://github.com/nothingislost/obsidian-bartender
	getFileExplorer() {
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

		containerEl.createEl('h2', {text: 'Settings for custom sorting plugin'});

		new Setting(containerEl)
			.setName('Path to the designated note containing sorting specification')
			.setDesc('The YAML front matter of this note will be scanned for sorting specification, in addition to the sortspec.md notes and folder notes')
			.addText(text => text
				.setPlaceholder('e.g. note.md')
				.setValue(this.plugin.settings.additionalSortspecFile)
				.onChange(async (value) => {
					this.plugin.settings.additionalSortspecFile = value;
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
							// for sanity
							this.plugin.statusBarItemEl.detach()
						}
					}
					await this.plugin.saveSettings();
				}));
	}
}
