import {
	apiVersion,
	App,
	FileExplorerView,
    Menu,
    MenuItem,
	MetadataCache,
	normalizePath,
	Notice,
	Platform,
	Plugin,
	PluginSettingTab,
    requireApiVersion,
	sanitizeHTMLToDom,
	setIcon,
	Setting,
	TAbstractFile,
	TFile,
	TFolder,
	Vault, WorkspaceLeaf
} from 'obsidian';
import {around} from 'monkey-around';
import {
	folderSort,
	ObsidianStandardDefaultSortingName,
	ProcessingContext,
	sortFolderItemsForBookmarking
} from './custom-sort/custom-sort';
import {
    SortingSpecProcessor,
    SortSpecsCollection
} from './custom-sort/sorting-spec-processor';
import {
	CustomSortSpec
} from './custom-sort/custom-sort-types';

import {
	addIcons,
	ICON_SORT_ENABLED_ACTIVE,
	ICON_SORT_ENABLED_NOT_APPLIED,
	ICON_SORT_MOBILE_INITIAL,
	ICON_SORT_SUSPENDED,
	ICON_SORT_SUSPENDED_GENERAL_ERROR,
	ICON_SORT_SUSPENDED_SYNTAX_ERROR
} from "./custom-sort/icons";
import {getStarredPlugin} from "./utils/StarredPluginSignature";
import {
	BookmarksPluginInterface,
	getBookmarksPlugin,
	groupNameForPath
} from "./utils/BookmarksCorePluginSignature";
import {getIconFolderPlugin} from "./utils/ObsidianIconFolderPluginSignature";
import {lastPathComponent} from "./utils/utils";
import {
	collectSortingAndGroupingTypes,
	hasOnlyByBookmarkOrStandardObsidian,
	HasSortingOrGrouping,
	ImplicitSortspecForBookmarksIntegration
} from "./custom-sort/custom-sort-utils";

interface CustomSortPluginSettings {
	additionalSortspecFile: string
	suspended: boolean
	statusBarEntryEnabled: boolean
	notificationsEnabled: boolean
	mobileNotificationsEnabled: boolean
	automaticBookmarksIntegration: boolean
	bookmarksContextMenus: boolean
	bookmarksGroupToConsumeAsOrderingReference: string
}

const DEFAULT_SETTINGS: CustomSortPluginSettings = {
	additionalSortspecFile: '',
	suspended: true,  // if false by default, it would be hard to handle the auto-parse after plugin install
	statusBarEntryEnabled: true,
	notificationsEnabled: true,
	mobileNotificationsEnabled: false,
	automaticBookmarksIntegration: false,
	bookmarksContextMenus: false,
	bookmarksGroupToConsumeAsOrderingReference: 'sortspec'
}

// On API 1.2.x+ enable the bookmarks integration by default
const DEFAULT_SETTING_FOR_1_2_0_UP: Partial<CustomSortPluginSettings> = {
	automaticBookmarksIntegration: true,
	bookmarksContextMenus: true
}

const SORTSPEC_FILE_NAME: string = 'sortspec.md'
const SORTINGSPEC_YAML_KEY: string = 'sorting-spec'

const ERROR_NOTICE_TIMEOUT: number = 10000

// the monkey-around package doesn't export the below type
type MonkeyAroundUninstaller = () => void

export default class CustomSortPlugin extends Plugin {
	settings: CustomSortPluginSettings
	statusBarItemEl: HTMLElement
	ribbonIconEl: HTMLElement     // On small-screen mobile devices this is useless (ribbon is re-created on-the-fly)
	ribbonIconStateInaccurate: boolean                                             // each time when displayed

	sortSpecCache?: SortSpecsCollection | null
	initialAutoOrManualSortingTriggered: boolean

	fileExplorerFolderPatched: boolean

	showNotice(message: string, timeout?: number) {
		if (this.settings.notificationsEnabled || (Platform.isMobile && this.settings.mobileNotificationsEnabled)) {
			new Notice(message, timeout)
		}
	}

	readAndParseSortingSpec() {
		const mCache: MetadataCache = app.metadataCache
		let failed: boolean = false
		let anySortingSpecFound: boolean = false
		let errorMessage: string | null = null
		// reset cache
		this.sortSpecCache = null
		const processor: SortingSpecProcessor = new SortingSpecProcessor()

		if (this.settings.automaticBookmarksIntegration) {
			this.sortSpecCache = processor.parseSortSpecFromText(
				ImplicitSortspecForBookmarksIntegration.split('\n'),
				'System internal path', // Dummy unused value, there are no errors in the internal spec
				'System internal file', // Dummy unused value, there are no errors in the internal spec
				this.sortSpecCache,
				true // Implicit sorting spec generation
			)
		}

		Vault.recurseChildren(app.vault.getRoot(), (file: TAbstractFile) => {
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
				if (aFile.name === SORTSPEC_FILE_NAME ||                         // file name == sortspec.md ?
					aFile.name === `${SORTSPEC_FILE_NAME}.md` ||                 // file name == sortspec.md.md ?
					aFile.basename === parent.name ||           // Folder Note mode: inside folder, same name
					aFile.basename === this.settings.additionalSortspecFile ||   // when user configured _about_
					aFile.name === this.settings.additionalSortspecFile ||       // when user configured _about_.md
					aFile.path === this.settings.additionalSortspecFile ||       // when user configured Inbox/sort.md
					aFile.path === `${this.settings.additionalSortspecFile}.md`  // when user configured Inbox/sort
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

	checkFileExplorerIsAvailableAndPatchable(logWarning: boolean = true): FileExplorerView | undefined {
		let fileExplorerView: FileExplorerView | undefined = this.getFileExplorer()
		if (fileExplorerView
			&& typeof fileExplorerView.createFolderDom === 'function'
			&& typeof fileExplorerView.requestSort === 'function') {
			return fileExplorerView
		} else {
			// Various scenarios when File Explorer was turned off (e.g. by some other plugin)
			if (logWarning) {
				this.logWarningFileExplorerNotAvailable()
			}
			return undefined
		}
	}

	logWarningFileExplorerNotAvailable() {
		const msg = `custom-sort v${this.manifest.version}: failed to locate File Explorer. The 'Files' core plugin can be disabled.\n`
			+ `Some community plugins can also disable it.\n`
			+ `See the example of MAKE.md plugin: https://github.com/Make-md/makemd/issues/25\n`
			+ `You can find there instructions on how to re-enable the File Explorer in MAKE.md plugin`
		console.warn(msg)
	}

	// Safe to suspend when suspended and re-enable when enabled
	switchPluginStateTo(enabled: boolean, updateRibbonBtnIcon: boolean = true) {
		let fileExplorerView: FileExplorerView | undefined = this.checkFileExplorerIsAvailableAndPatchable()
		if (fileExplorerView && !this.fileExplorerFolderPatched) {
			this.fileExplorerFolderPatched = this.patchFileExplorerFolder(fileExplorerView);

			if (!this.fileExplorerFolderPatched) {
				fileExplorerView = undefined
			}
		}
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
				if (fileExplorerView) {
					this.showNotice('Custom sort ON');
					this.initialAutoOrManualSortingTriggered = true
					iconToSet = ICON_SORT_ENABLED_ACTIVE
				} else {
					this.showNotice('Custom sort GENERAL PROBLEM. See console for detailed message.');
					iconToSet = ICON_SORT_SUSPENDED_GENERAL_ERROR
					this.settings.suspended = true
					this.saveSettings()
				}
			} else {
				iconToSet = ICON_SORT_SUSPENDED_SYNTAX_ERROR
				this.settings.suspended = true
				this.saveSettings()
			}
		}

		// Syntax sugar
		const ForceFlushCache = true
		if (!this.settings.suspended) {
			getBookmarksPlugin(this.settings.bookmarksGroupToConsumeAsOrderingReference, ForceFlushCache)
		}

		if (fileExplorerView) {
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
			// REMARK: on small-screen mobile devices this is void, the handle to ribbon <div> Element is useless,
			        // as the ribbon (and its icons) get re-created each time when re-displayed (expanded)
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
		//   REMARK: on small-screen mobile devices, the ribbon is dynamically re-created each time when displayed
		//           in result, the handle to the ribbon <div> Element is useless
		this.ribbonIconEl = this.addRibbonIcon(
			Platform.isDesktop ?
				(this.settings.suspended ? ICON_SORT_SUSPENDED : ICON_SORT_ENABLED_NOT_APPLIED)
				:
				ICON_SORT_MOBILE_INITIAL // REMARK: on small-screen mobile devices this icon stays permanent
			,
			'Toggle custom sorting', (evt: MouseEvent) => {
				// Clicking the icon toggles between the states of custom sort plugin
				this.switchPluginStateTo(this.settings.suspended)
			});

		if (!this.settings.suspended) {
			this.ribbonIconStateInaccurate = true
		}

		this.addSettingTab(new CustomSortSettingTab(app, this));

		this.registerEventHandlers()

		this.registerCommands()

		this.initialize();
	}

	registerEventHandlers() {
		const plugin: CustomSortPlugin = this
		this.registerEvent(
			// Keep in mind: this event is triggered once after app starts and then after each modification of _any_ metadata
			app.metadataCache.on("resolved", () => {
				if (!this.settings.suspended) {
					if (!this.initialAutoOrManualSortingTriggered) {
						this.readAndParseSortingSpec()
						this.initialAutoOrManualSortingTriggered = true
						if (this.sortSpecCache) { // successful read of sorting specifications?
							this.showNotice('Custom sort ON')
							const fileExplorerView: FileExplorerView | undefined = this.checkFileExplorerIsAvailableAndPatchable(false)
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

		this.registerEvent(
			app.workspace.on("file-menu", (menu: Menu, file: TAbstractFile, source: string, leaf?: WorkspaceLeaf) => {
				if (!this.settings.bookmarksContextMenus) return;  // Don't show the context menus at all

				const bookmarksPlugin = getBookmarksPlugin(plugin.settings.bookmarksGroupToConsumeAsOrderingReference)
				if (!bookmarksPlugin) return; // Don't show context menu if bookmarks plugin not available and not enabled

				const bookmarkThisMenuItem = (item: MenuItem) => {
					item.setTitle('Custom sort: bookmark for sorting.');
					item.setIcon('hashtag');
					item.onClick(() => {
						const bookmarksPlugin = getBookmarksPlugin(plugin.settings.bookmarksGroupToConsumeAsOrderingReference)
						if (bookmarksPlugin) {
							bookmarksPlugin.bookmarkFolderItem(file)
							bookmarksPlugin.saveDataAndUpdateBookmarkViews(true)
						}
					});
				};
				const unbookmarkThisMenuItem = (item: MenuItem) => {
					item.setTitle('Custom sort: UNbookmark from sorting.');
					item.setIcon('hashtag');
					item.onClick(() => {
						const bookmarksPlugin = getBookmarksPlugin(plugin.settings.bookmarksGroupToConsumeAsOrderingReference)
						if (bookmarksPlugin) {
							bookmarksPlugin.unbookmarkFolderItem(file)
							bookmarksPlugin.saveDataAndUpdateBookmarkViews(true)
						}
					});
				};
				const bookmarkAllMenuItem = (item: MenuItem) => {
					item.setTitle('Custom sort: bookmark+siblings for sorting.');
					item.setIcon('hashtag');
					item.onClick(() => {
						const bookmarksPlugin = getBookmarksPlugin(plugin.settings.bookmarksGroupToConsumeAsOrderingReference)
						if (bookmarksPlugin) {
							const orderedChildren: Array<TAbstractFile> = plugin.orderedFolderItemsForBookmarking(file.parent, bookmarksPlugin)
							bookmarksPlugin.bookmarkSiblings(orderedChildren)
							bookmarksPlugin.saveDataAndUpdateBookmarkViews(true)
						}
					});
				};
				const unbookmarkAllMenuItem = (item: MenuItem) => {
					item.setTitle('Custom sort: UNbookmark+all siblings from sorting.');
					item.setIcon('hashtag');
					item.onClick(() => {
						const bookmarksPlugin = getBookmarksPlugin(plugin.settings.bookmarksGroupToConsumeAsOrderingReference)
						if (bookmarksPlugin) {
							const orderedChildren: Array<TAbstractFile> = file.parent.children.map((entry: TFile | TFolder) => entry)
							bookmarksPlugin.unbookmarkSiblings(orderedChildren)
							bookmarksPlugin.saveDataAndUpdateBookmarkViews(true)
						}
					});
				};

				const itemAlreadyBookmarkedForSorting: boolean = bookmarksPlugin.isBookmarkedForSorting(file)
				if (!itemAlreadyBookmarkedForSorting) {
					menu.addItem(bookmarkThisMenuItem)
				} else {
					menu.addItem(unbookmarkThisMenuItem)
				}
				menu.addItem(bookmarkAllMenuItem)
				menu.addItem(unbookmarkAllMenuItem)
			})
		)

		if (requireApiVersion('1.4.11')) {
			this.registerEvent(
				// "files-menu" event was exposed in 1.4.11
				// @ts-ignore
				app.workspace.on("files-menu", (menu: Menu, files: TAbstractFile[], source: string, leaf?: WorkspaceLeaf) => {
					if (!this.settings.bookmarksContextMenus) return;  // Don't show the context menus at all

					const bookmarksPlugin = getBookmarksPlugin(plugin.settings.bookmarksGroupToConsumeAsOrderingReference)
					if (!bookmarksPlugin) return; // Don't show context menu if bookmarks plugin not available and not enabled

					const bookmarkSelectedMenuItem = (item: MenuItem) => {
						item.setTitle('Custom sort: bookmark selected for sorting.');
						item.setIcon('hashtag');
						item.onClick(() => {
							const bookmarksPlugin = getBookmarksPlugin(plugin.settings.bookmarksGroupToConsumeAsOrderingReference)
							if (bookmarksPlugin) {
								files.forEach((file) => {
									bookmarksPlugin.bookmarkFolderItem(file)
								})
								bookmarksPlugin.saveDataAndUpdateBookmarkViews(true)
							}
						});
					};
					const unbookmarkSelectedMenuItem = (item: MenuItem) => {
						item.setTitle('Custom sort: UNbookmark selected from sorting.');
						item.setIcon('hashtag');
						item.onClick(() => {
							const bookmarksPlugin = getBookmarksPlugin(plugin.settings.bookmarksGroupToConsumeAsOrderingReference)
							if (bookmarksPlugin) {
								files.forEach((file) => {
									bookmarksPlugin.unbookmarkFolderItem(file)
								})
								bookmarksPlugin.saveDataAndUpdateBookmarkViews(true)
							}
						});
					};

					menu.addItem(bookmarkSelectedMenuItem)
					menu.addItem(unbookmarkSelectedMenuItem)
				})
			)
		}

		this.registerEvent(
			app.vault.on("rename", (file: TAbstractFile, oldPath: string) => {
				const bookmarksPlugin = getBookmarksPlugin(plugin.settings.bookmarksGroupToConsumeAsOrderingReference)
				if (bookmarksPlugin) {
					bookmarksPlugin.updateSortingBookmarksAfterItemRenamed(file, oldPath)
					bookmarksPlugin.saveDataAndUpdateBookmarkViews(true)
				}
			})
		)
		app.vault.on("delete", (file: TAbstractFile) => {
			const bookmarksPlugin = getBookmarksPlugin(plugin.settings.bookmarksGroupToConsumeAsOrderingReference)
			if (bookmarksPlugin) {
				bookmarksPlugin.updateSortingBookmarksAfterItemDeleted(file)
				bookmarksPlugin.saveDataAndUpdateBookmarkViews(true)
			}
		})
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
		app.workspace.onLayoutReady(() => {
			this.fileExplorerFolderPatched = this.patchFileExplorerFolder();
		})
	}

	determineSortSpecForFolder(folderPath: string, folderName?: string): CustomSortSpec|null|undefined {
		folderName = folderName ?? lastPathComponent(folderPath)
		let sortSpec: CustomSortSpec | null | undefined = this.sortSpecCache?.sortSpecByPath?.[folderPath]
		sortSpec = sortSpec ?? this.sortSpecCache?.sortSpecByName?.[folderName]

		if (!sortSpec && this.sortSpecCache?.sortSpecByWildcard) {
			// when no sorting spec found directly by folder path, check for wildcard-based match
			sortSpec = this.sortSpecCache?.sortSpecByWildcard.folderMatch(folderPath, folderName)
		}
		return sortSpec
	}

	createProcessingContextForSorting(has: HasSortingOrGrouping): ProcessingContext {
		const ctx: ProcessingContext = {
			_mCache: app.metadataCache,
			starredPluginInstance: has.grouping.byStarred ? getStarredPlugin() : undefined,
			bookmarksPluginInstance: has.grouping.byBookmarks || has.sorting.byBookmarks ?  getBookmarksPlugin(this.settings.bookmarksGroupToConsumeAsOrderingReference, false, true) : undefined,
			iconFolderPluginInstance: has.grouping.byIcon ? getIconFolderPlugin() : undefined,
			plugin: this
		}
		return ctx
	}

	// For the idea of monkey-patching credits go to https://github.com/nothingislost/obsidian-bartender
	patchFileExplorerFolder(patchableFileExplorer?: FileExplorerView): boolean {
		let plugin = this;
		// patching file explorer might fail here because of various non-error reasons.
		// That's why not showing and not logging error message here
		patchableFileExplorer = patchableFileExplorer ?? this.checkFileExplorerIsAvailableAndPatchable(false)
		if (patchableFileExplorer) {
			// @ts-ignore
			let tmpFolder = new TFolder(Vault, "");
			let Folder = patchableFileExplorer.createFolderDom(tmpFolder).constructor;
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

						const folder: TFolder = this.file
						let sortSpec: CustomSortSpec | null | undefined = plugin.determineSortSpecForFolder(folder.path, folder.name)

						// Performance optimization
						//     Primary intention: when the implicit bookmarks integration is enabled, remain on std Obsidian, if no need to involve bookmarks
						let has: HasSortingOrGrouping = collectSortingAndGroupingTypes(sortSpec)
						if (hasOnlyByBookmarkOrStandardObsidian(has)) {
							const bookmarksPlugin: BookmarksPluginInterface|undefined = getBookmarksPlugin(plugin.settings.bookmarksGroupToConsumeAsOrderingReference, false, true)
							if ( !bookmarksPlugin?.bookmarksIncludeItemsInFolder(folder.path)) {
								sortSpec = null
							}
						}

						if (sortSpec) {
							return folderSort.call(this, sortSpec, plugin.createProcessingContextForSorting(has));
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

	orderedFolderItemsForBookmarking(folder: TFolder, bookmarksPlugin: BookmarksPluginInterface): Array<TAbstractFile> {
		let sortSpec: CustomSortSpec | null | undefined = undefined
		if (!this.settings.suspended) {
			sortSpec = this.determineSortSpecForFolder(folder.path, folder.name)
		}
		let uiSortOrder: string = this.getFileExplorer()?.sortOrder || ObsidianStandardDefaultSortingName

		const has: HasSortingOrGrouping = collectSortingAndGroupingTypes(sortSpec)

		return sortFolderItemsForBookmarking(
			folder,
			folder.children,
			sortSpec,
			this.createProcessingContextForSorting(has),
			uiSortOrder
		)
	}

	// Credits go to https://github.com/nothingislost/obsidian-bartender
	getFileExplorer(): FileExplorerView | undefined {
		let fileExplorer: FileExplorerView | undefined = app.workspace.getLeavesOfType("file-explorer")?.first()
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
		const data: any = await this.loadData() || {}
		const isFreshInstall: boolean = Object.keys(data).length === 0
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
		if (requireApiVersion('1.2.0')) {
			this.settings = Object.assign(this.settings, DEFAULT_SETTING_FOR_1_2_0_UP)
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

const pathToFlatString = (path: string): string => {
	return path.replace(/\//g,'_').replace(/\\/g, '_')
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

		// containerEl.createEl('h2', {text: 'Settings for Custom File Explorer Sorting Plugin'});

		const additionalSortspecFileDescr: DocumentFragment = sanitizeHTMLToDom(
			'A note name or note path to scan (YAML frontmatter) for sorting specification in addition to the `sortspec` notes and Folder Notes<sup><b>*</b></sup>.'
			+ '<br>'
			+ ' The `.md` filename suffix is optional.'
			+ '<p><b>(*)</b>&nbsp;if you employ the <i>Index-File based</i> approach to folder notes (as documented in '
			+ '<a href="https://github.com/aidenlx/alx-folder-note/wiki/folder-note-pref"'
			+ '>Aidenlx Folder Note preferences</a>'
			+ ') you can enter here the index note name, e.g. <b>_about_</b>'
			+ '<br>'
			+ 'The <i>Inside Folder, with Same Name Recommended</i> mode of Folder Notes is handled automatically, no additional configuration needed.'
			+ '</p>'
			+ '<p>NOTE: After updating this setting remember to refresh the custom sorting via clicking on the ribbon icon or via the <b>sort-on</b> command'
			+ ' or by restarting Obsidian or reloading the vault</p>'
		)

		new Setting(containerEl)
			.setName('Path or name of additional note(s) containing sorting specification')
			.setDesc(additionalSortspecFileDescr)
			.addText(text => text
				.setPlaceholder('e.g. _about_')
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

		new Setting(containerEl)
			.setName('Enable notifications of plugin state changes for mobile devices only')
			.setDesc('See above.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.mobileNotificationsEnabled)
				.onChange(async (value) => {
					this.plugin.settings.mobileNotificationsEnabled = value;
					await this.plugin.saveSettings();
				}));

		containerEl.createEl('h2', {text: 'Bookmarks integration'});
		const bookmarksIntegrationDescription: DocumentFragment = sanitizeHTMLToDom(
			'If enabled, order of files and folders in File Explorer will reflect the order '
			+ 'of bookmarked items in the bookmarks (core plugin) view. Automatically, without any '
			+ 'need for sorting configuration. At the same time, it integrates seamlessly with'
			+ ' <pre style="display: inline;">sorting-spec:</pre> configurations and they can nicely cooperate.'
			+ '<br>'
			+ '<p>To separate regular bookmarks from the bookmarks created for sorting, you can put '
			+ 'the latter in a separate dedicated bookmarks group. The default name of the group is '
			+ "'<i>" + DEFAULT_SETTINGS.bookmarksGroupToConsumeAsOrderingReference + "</i>' "
			+ 'and you can change the group name in the configuration field below.'
			+ '<br>'
			+ 'If left empty, all the bookmarked items will be used to impose the order in File Explorer.</p>'
			+ '<p>More information on this functionality in the '
			+ '<a href="https://github.com/SebastianMC/obsidian-custom-sort/blob/master/docs/manual.md#bookmarks-plugin-integration">'
			+ 'manual</a> of this custom-sort plugin.'
			+ '</p>'
		)

		new Setting(containerEl)
			.setName('Automatic integration with core Bookmarks plugin (for indirect drag & drop ordering)')
			.setDesc(bookmarksIntegrationDescription)
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.automaticBookmarksIntegration)
				.onChange(async (value) => {
					this.plugin.settings.automaticBookmarksIntegration = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Name of the group in Bookmarks from which to read the order of items')
			.setDesc('See above.')
			.addText(text => text
				.setPlaceholder('e.g. Group for sorting')
				.setValue(this.plugin.settings.bookmarksGroupToConsumeAsOrderingReference)
				.onChange(async (value) => {
					value = groupNameForPath(value.trim()).trim()
					this.plugin.settings.bookmarksGroupToConsumeAsOrderingReference = value ? pathToFlatString(normalizePath(value)) : '';
					await this.plugin.saveSettings();
				}));

		const bookmarksIntegrationContextMenusDescription: DocumentFragment = sanitizeHTMLToDom(
			'Enable <i>Custom-sort: bookmark for sorting</i> and <i>Custom-sort: bookmark+siblings for sorting</i> (and related) entries '
			+ 'in context menu in File Explorer'
		)
		new Setting(containerEl)
			.setName('Context menus for Bookmarks integration')
			.setDesc(bookmarksIntegrationContextMenusDescription)
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.bookmarksContextMenus)
				.onChange(async (value) => {
					this.plugin.settings.bookmarksContextMenus = value;
					await this.plugin.saveSettings();
				}))
	}
}
