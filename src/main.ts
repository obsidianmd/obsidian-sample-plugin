import {
	App,
	CommunityPlugin,
	FileExplorerLeaf,
	FileExplorerView,
	Menu,
	MenuItem,
	MetadataCache,
	Notice,
	Platform,
	Plugin,
	setIcon,
	TAbstractFile,
	TFile,
	TFolder,
	Vault,
	WorkspaceLeaf
} from 'obsidian';
import {around} from 'monkey-around';
import {
	getSortedFolderItems,
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
import {
	BookmarksPluginInterface,
	getBookmarksPlugin,
	groupNameForPath
} from "./utils/BookmarksCorePluginSignature";
import {
	getIconFolderPlugin, ObsidianIconFolder_PluginInstance, ObsidianIconFolderPlugin_getData_methodName
} from "./utils/ObsidianIconFolderPluginSignature";
import {
	extractBasename,
	lastPathComponent,
	ValueOrError,
} from "./utils/utils";
import {
	collectSortingAndGroupingTypes,
	hasOnlyByBookmarkOrStandardObsidian,
	HasSortingOrGrouping,
	ImplicitSortspecForBookmarksIntegration
} from "./custom-sort/custom-sort-utils";
import {
	CustomSortPluginSettings,
	CustomSortSettingTab,
	DEFAULT_SETTING_FOR_1_2_0_UP,
	DEFAULT_SETTINGS
} from "./settings";
import {CustomSortPluginAPI} from "./custom-sort-plugin";

const PLUGIN_ID = 'custom-sort' // same as in manifest.json

const SORTSPEC_FILE_NAME: string = 'sortspec.md'
const SORTINGSPEC_YAML_KEY: string = 'sorting-spec'

const ERROR_NOTICE_TIMEOUT: number = 10000

// the monkey-around package doesn't export the below type
type MonkeyAroundUninstaller = () => void

type ContextMenuProvider = (item: MenuItem) => void

enum FileExplorerState {
	DoesNotExist = 1,
	DeferredView
}

interface FileExplorerStateError {
	state: FileExplorerState
	fileExplorerInDeferredState?: FileExplorerLeaf
}

type FileExplorerLeafOrError = ValueOrError<FileExplorerLeaf,FileExplorerStateError>

export default class CustomSortPlugin
	extends Plugin
	implements CustomSortPluginAPI
{
	settings: CustomSortPluginSettings
	statusBarItemEl: HTMLElement
	ribbonIconEl: HTMLElement     // On small-screen mobile devices this is useless (ribbon is re-created on-the-fly)

	sortSpecCache?: SortSpecsCollection | null
	customSortAppliedAtLeastOnce: boolean = false

	uninstallerOfFolderSortFunctionWrapper: MonkeyAroundUninstaller|undefined = undefined

	showNotice(message: string, timeout?: number) {
		if (this.settings.notificationsEnabled || (Platform.isMobile && this.settings.mobileNotificationsEnabled)) {
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

		if (this.settings.automaticBookmarksIntegration) {
			this.sortSpecCache = processor.parseSortSpecFromText(
				ImplicitSortspecForBookmarksIntegration.split('\n'),
				'System internal path', // Dummy unused value, there are no errors in the internal spec
				'System internal file', // Dummy unused value, there are no errors in the internal spec
				this.sortSpecCache,
				true // Implicit sorting spec generation
			)
		}

		Vault.recurseChildren(this.app.vault.getRoot(), (file: TAbstractFile) => {
			if (failed) return
			if (file instanceof TFile) {
				const aFile: TFile = file as TFile
				const parent: TFolder = aFile.parent!
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
					aFile.path === `${this.settings.additionalSortspecFile}.md` || // when user configured Inbox/sort

					aFile.basename === this.settings.indexNoteNameForFolderNotes ||   // when user configured as index
					aFile.name === this.settings.indexNoteNameForFolderNotes          // when user configured as index.md
				) {
					const sortingSpecTxt: string|undefined = mCache.getCache(aFile.path)?.frontmatter?.[SORTINGSPEC_YAML_KEY]
					// Warning: newer Obsidian versions can return objects as well, hence the explicit check for string value
					if (typeof sortingSpecTxt === 'string') {
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
			if (anySortingSpecFound) {
				this.showNotice(`Parsing custom sorting specification SUCCEEDED!`)
			} else {
				this.showNotice(`No custom sorting spec, will go with implicit sorting (bookmarks-based).`)
			}
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

	// Credits go to https://github.com/nothingislost/obsidian-bartender
	getFileExplorer(): FileExplorerLeafOrError {
		let fileExplorer: FileExplorerLeaf | undefined = this.app.workspace.getLeavesOfType("file-explorer")?.first() as FileExplorerLeaf;
		const fileExplorerOrError: FileExplorerLeafOrError = new ValueOrError()

		if (fileExplorer) {
			if (fileExplorer.isDeferred) {
				return fileExplorerOrError.setError({
					state: FileExplorerState.DeferredView,
					fileExplorerInDeferredState: fileExplorer
				})
			} else {
				return fileExplorerOrError.setValue(fileExplorer)
			}
		} else {
			return fileExplorerOrError.setError({
				state: FileExplorerState.DoesNotExist
			})
		}
	}

	checkFileExplorerIsAvailableAndPatchable(logWarning: boolean = true): FileExplorerLeafOrError {
		let fileExplorerOrError = this.getFileExplorer()
		if (fileExplorerOrError.e && fileExplorerOrError.e.state === FileExplorerState.DeferredView) {
			if (logWarning) {
				this.logDeferredFileExplorerInfo()
			}
			return fileExplorerOrError
		}
		if (fileExplorerOrError.v && fileExplorerOrError.v.view && typeof fileExplorerOrError.v.view.requestSort === 'function') {
			if (typeof fileExplorerOrError.v.view.getSortedFolderItems === 'function') {
				return fileExplorerOrError
			}
		}

		// Various scenarios when File Explorer was turned off (e.g. by some other plugin)
		if (logWarning) {
			this.logWarningFileExplorerNotAvailable()
		}
		return fileExplorerOrError
	}

	// For the idea of monkey-patching credits go to https://github.com/nothingislost/obsidian-bartender
	patchFileExplorer(patchableFileExplorer: FileExplorerLeaf): FileExplorerLeaf|undefined {
		let plugin = this;

		// patching file explorer might fail here because of various non-error reasons.
		// That's why not showing and not logging error message here
		if (patchableFileExplorer) {
			this.uninstallFileExplorerPatchIfInstalled()
			this.uninstallerOfFolderSortFunctionWrapper = around(patchableFileExplorer.view.constructor.prototype, {
				getSortedFolderItems(old: any) {
					return function (...args: any[]) {
						// quick check for plugin status
						if (plugin.settings.suspended) {
							return old.call(this, ...args);
						}

						const folder = args[0]
						const sortingData = plugin.determineAndPrepareSortingDataForFolder(folder)

						if (sortingData.sortSpec) {
							if (!plugin.customSortAppliedAtLeastOnce) {
								plugin.customSortAppliedAtLeastOnce = true
								setTimeout(() => {
									plugin.setRibbonIconToEnabled.apply(plugin)
									plugin.showNotice('Custom sort APPLIED.');
									plugin.updateStatusBar()
								})
							}
							return getSortedFolderItems.call(this, folder, sortingData.sortSpec, plugin.createProcessingContextForSorting(sortingData.sortingAndGroupingStats))
						} else {
							return old.call(this, ...args);
						}
					};
				}
			})
			return patchableFileExplorer
		} else {
			return undefined
		}
	}

	logDeferredFileExplorerInfo() {
		const msg = `${PLUGIN_ID} v${this.manifest.version}: File Explorer is not displayed yet (Obsidian deferred view detected).\n`
			+ `Until the File Explorer is visible, the custom-sort plugin cannot apply the custom order.\n`
		console.warn(msg)
	}

	logDeferredFileExplorerWatcherSetupInfo() {
		const msg = `${PLUGIN_ID} v${this.manifest.version}: A watcher was set up to apply custom sort automatically when the File Explorer is displayed.\n`
		console.warn(msg)
	}

	logWarningFileExplorerNotAvailable() {
		const msg = `${PLUGIN_ID} v${this.manifest.version}: failed to locate File Explorer. The 'Files' core plugin can be disabled.\n`
			+ `Some community plugins can also disable it.\n`
			+ `See the example of MAKE.md plugin: https://github.com/Make-md/makemd/issues/25\n`
			+ `You can find there instructions on how to re-enable the File Explorer in MAKE.md plugin`
		console.warn(msg)
	}

	// Safe to suspend when suspended and re-enable when enabled
	switchPluginStateTo(enabled: boolean) {
		this.settings.suspended = !enabled;
		this.saveSettings()

		let fileExplorerOrError: FileExplorerLeafOrError = this.checkFileExplorerIsAvailableAndPatchable(!this.settings.suspended)
		const fileExplorer = fileExplorerOrError.v ? this.patchFileExplorer(fileExplorerOrError.v) : undefined

		if (this.settings.suspended) {
			this.showNotice('Custom sort OFF');
			this.sortSpecCache = null
			setIcon(this.ribbonIconEl, ICON_SORT_SUSPENDED)
			if (fileExplorer) {
				fileExplorer.view.requestSort();
			}
		} else {
			this.readAndParseSortingSpec();
			if (this.sortSpecCache) {
				if (fileExplorer) {
					this.customSortAppliedAtLeastOnce = false
					fileExplorer.view.requestSort();
				} else {
					if (Platform.isDesktop) {
						this.showNotice('Custom sort File Explorer view problem. See console for detailed message.')
					} else { // No console access on mobile
						this.showNotice(`Custom sort File Explorer view problem - is it visible?`
						+ ` Can't apply custom sorting when the File Explorer was not displayed at least once.`)
					}
					setIcon(this.ribbonIconEl, ICON_SORT_SUSPENDED_GENERAL_ERROR)
					this.settings.suspended = true
					this.saveSettings()
				}
			} else {
				setIcon(this.ribbonIconEl, ICON_SORT_SUSPENDED_SYNTAX_ERROR)
				this.settings.suspended = true
				this.saveSettings()
			}
		}

		// Syntax sugar
		const ForceFlushCache = true
		if (!this.settings.suspended) {
			getBookmarksPlugin(this.app, this.settings.bookmarksGroupToConsumeAsOrderingReference, ForceFlushCache)
		}

		this.updateStatusBar();
	}

	async onload() {
		console.log(`loading ${PLUGIN_ID} v${this.manifest.version}`);

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
				ICON_SORT_SUSPENDED
				:
				ICON_SORT_MOBILE_INITIAL // REMARK: on small-screen mobile devices this icon stays permanent
			,
			'Toggle custom sorting', (evt: MouseEvent) => {
				// Clicking the icon toggles between the states of custom sort plugin
				this.switchPluginStateTo(this.settings.suspended)
			});

		this.addSettingTab(new CustomSortSettingTab(this.app, this));

		this.registerEventHandlers()

		this.registerCommands()

		this.registerUninstallerHandler()

		this.initialize();
	}

	registerEventHandlers() {
		const plugin: CustomSortPlugin = this
		const m: boolean = Platform.isMobile

		const applyCustomSortMenuItem = (item: MenuItem) => {
			item.setTitle(m ? 'Custom sort: apply custom sorting' : 'Apply custom sorting');
			item.onClick(() => {
				plugin.switchPluginStateTo(true)
			})
		};

		const suspendCustomSortMenuItem = (item: MenuItem) => {
			item.setTitle(m ? 'Custom sort: suspend custom sorting' : 'Suspend custom sorting');
			item.onClick(() => {
				plugin.switchPluginStateTo(false)
			})
		};

		const getBookmarkThisMenuItemForFile = (file: TAbstractFile): ContextMenuProvider =>
			(item: MenuItem) => {
				item.setTitle(m ? 'Bookmark it for custom sorting' : 'Bookmark it for sorting');
				item.onClick(() => {
					const bookmarksPlugin = getBookmarksPlugin(plugin.app, plugin.settings.bookmarksGroupToConsumeAsOrderingReference)
					if (bookmarksPlugin) {
						bookmarksPlugin.bookmarkFolderItem(file)
						bookmarksPlugin.saveDataAndUpdateBookmarkViews(true)
					}
				});
			};

		const getUnbookmarkThisMenuItemForFile = (file: TAbstractFile): ContextMenuProvider =>
			(item: MenuItem) => {
				item.setTitle(m ? 'UNbookmark it from custom sorting' : 'UNbookmark it from sorting');
				item.onClick(() => {
					const bookmarksPlugin = getBookmarksPlugin(plugin.app, plugin.settings.bookmarksGroupToConsumeAsOrderingReference)
					if (bookmarksPlugin) {
						bookmarksPlugin.unbookmarkFolderItem(file)
						bookmarksPlugin.saveDataAndUpdateBookmarkViews(true)
					}
				});
			};

		const getBookmarkAllMenuItemForFile = (file: TAbstractFile): ContextMenuProvider =>
			(item: MenuItem) => {
				item.setTitle(m ? 'Bookmark it+siblings for custom sorting' : 'Bookmark it+siblings for sorting');
				item.onClick(() => {
					const bookmarksPlugin = getBookmarksPlugin(plugin.app, plugin.settings.bookmarksGroupToConsumeAsOrderingReference)
					if (bookmarksPlugin) {
						const orderedChildren: Array<TAbstractFile> = plugin.orderedFolderItemsForBookmarking(file.parent!, bookmarksPlugin)
						bookmarksPlugin.bookmarkSiblings(orderedChildren)
						bookmarksPlugin.saveDataAndUpdateBookmarkViews(true)
					}
				});
			};

		const getUnbookmarkAllMenuItemForFile = (file: TAbstractFile): ContextMenuProvider =>
			(item: MenuItem) => {
				item.setTitle(m ? 'UNbookmark it+siblings from custom sorting' : 'UNbookmark it+siblings from sorting');
				item.onClick(() => {
					const bookmarksPlugin = getBookmarksPlugin(plugin.app, plugin.settings.bookmarksGroupToConsumeAsOrderingReference)
					if (bookmarksPlugin) {
						const orderedChildren: Array<TAbstractFile> = file.parent!.children.map((entry: TFile | TFolder) => entry)
						bookmarksPlugin.unbookmarkSiblings(orderedChildren)
						bookmarksPlugin.saveDataAndUpdateBookmarkViews(true)
					}
				});
			};

		const getBookmarkSelectedMenuItemForFiles = (files: TAbstractFile[]): ContextMenuProvider =>
			(item: MenuItem) => {
				item.setTitle(m ? 'Bookmark selected for custom sorting' : 'Custom sort: bookmark selected for sorting');
				item.onClick(() => {
					const bookmarksPlugin = getBookmarksPlugin(plugin.app, plugin.settings.bookmarksGroupToConsumeAsOrderingReference)
					if (bookmarksPlugin) {
						files.forEach((file) => {
							bookmarksPlugin.bookmarkFolderItem(file)
						})
						bookmarksPlugin.saveDataAndUpdateBookmarkViews(true)
					}
				});
			};

		const getUnbookmarkSelectedMenuItemForFiles = (files: TAbstractFile[]): ContextMenuProvider =>
			(item: MenuItem) => {
				item.setTitle(m ? 'UNbookmark selected from custom sorting' : 'Custom sort: UNbookmark selected from sorting');
				item.onClick(() => {
					const bookmarksPlugin = getBookmarksPlugin(plugin.app, plugin.settings.bookmarksGroupToConsumeAsOrderingReference)
					if (bookmarksPlugin) {
						files.forEach((file) => {
							bookmarksPlugin.unbookmarkFolderItem(file)
						})
						bookmarksPlugin.saveDataAndUpdateBookmarkViews(true)
					}
				});
			};

		this.registerEvent(
			this.app.workspace.on("file-menu", (menu: Menu, file: TAbstractFile, source: string, leaf?: WorkspaceLeaf) => {
				if (!this.settings.customSortContextSubmenu) return;  // Don't show the context menus at all

				const customSortMenuItem = (item?: MenuItem) => {
					// if parameter is empty it means mobile invocation, where submenus are not supported.
					// In that case flatten the menu.
					let submenu: Menu|undefined
					if (item) {
						item.setTitle('Custom sort:');
						item.setIcon('hashtag');
						submenu = item.setSubmenu()
					}
					if (!submenu) menu.addSeparator();
					(submenu ?? menu).addItem(applyCustomSortMenuItem)
					if (submenu) submenu.addSeparator();

					if (this.settings.bookmarksContextMenus) {
						const bookmarksPlugin = getBookmarksPlugin(plugin.app, plugin.settings.bookmarksGroupToConsumeAsOrderingReference)
						if (bookmarksPlugin) {
							const itemAlreadyBookmarkedForSorting: boolean = bookmarksPlugin.isBookmarkedForSorting(file)
							if (!itemAlreadyBookmarkedForSorting) {
								(submenu ?? menu).addItem(getBookmarkThisMenuItemForFile(file))
							} else {
								(submenu ?? menu).addItem(getUnbookmarkThisMenuItemForFile(file))
							}
							(submenu ?? menu).addItem(getBookmarkAllMenuItemForFile(file));
							(submenu ?? menu).addItem(getUnbookmarkAllMenuItemForFile(file));
						}
					}

					(submenu ?? menu).addItem(suspendCustomSortMenuItem)
				}

				if (m) {
					customSortMenuItem(undefined)
				} else {
					menu.addItem(customSortMenuItem)
				}
			})
		)

		this.registerEvent(
			// "files-menu" event was exposed in 1.4.11
			// @ts-ignore
			this.app.workspace.on("files-menu", (menu: Menu, files: TAbstractFile[], source: string, leaf?: WorkspaceLeaf) => {
				if (!this.settings.customSortContextSubmenu) return;  // Don't show the context menus at all

				const customSortMenuItem = (item?: MenuItem) => {
					// if parameter is empty it means mobile invocation, where submenus are not supported.
					// In that case flatten the menu.
					let submenu: Menu|undefined
					if (item) {
						item.setTitle('Custom sort:');
						item.setIcon('hashtag');
						submenu = item.setSubmenu()
					}
					if (!submenu) menu.addSeparator();
					(submenu ?? menu).addItem(applyCustomSortMenuItem)
					if (submenu) submenu.addSeparator();

					if (this.settings.bookmarksContextMenus) {
						const bookmarksPlugin = getBookmarksPlugin(plugin.app, plugin.settings.bookmarksGroupToConsumeAsOrderingReference)
						if (bookmarksPlugin) {
							(submenu ?? menu).addItem(getBookmarkSelectedMenuItemForFiles(files));
							(submenu ?? menu).addItem(getUnbookmarkSelectedMenuItemForFiles(files));
						}
					}
					(submenu ?? menu).addItem(suspendCustomSortMenuItem);
				};

				if (m) {
					customSortMenuItem(undefined)
				} else {
					menu.addItem(customSortMenuItem)
				}
			})
		)

		this.registerEvent(
			this.app.vault.on("rename", (file: TAbstractFile, oldPath: string) => {
				const bookmarksPlugin = getBookmarksPlugin(plugin.app, plugin.settings.bookmarksGroupToConsumeAsOrderingReference)
				if (bookmarksPlugin) {
					bookmarksPlugin.updateSortingBookmarksAfterItemRenamed(file, oldPath)
					bookmarksPlugin.saveDataAndUpdateBookmarkViews(true)
				}
			})
		)

		this.app.vault.on("delete", (file: TAbstractFile) => {
			const bookmarksPlugin = getBookmarksPlugin(plugin.app, plugin.settings.bookmarksGroupToConsumeAsOrderingReference)
			if (bookmarksPlugin) {
				bookmarksPlugin.updateSortingBookmarksAfterItemDeleted(file)
				bookmarksPlugin.saveDataAndUpdateBookmarkViews(true)
			}
		})
	}

	uninstallFileExplorerPatchIfInstalled() {
		if (this.uninstallerOfFolderSortFunctionWrapper) {
			try {
				this.uninstallerOfFolderSortFunctionWrapper()
			} catch {

			}
			this.uninstallerOfFolderSortFunctionWrapper = undefined
		}
	}

	registerUninstallerHandler() {
		let plugin = this;
		const requestStandardObsidianSortAfterFileExplorerPatchUninstaller = () => {
			return () => {
 				plugin.uninstallFileExplorerPatchIfInstalled()

				const fileExplorerOrError= this.checkFileExplorerIsAvailableAndPatchable()
				if (fileExplorerOrError.v && fileExplorerOrError.v.view) {
					fileExplorerOrError.v.view.requestSort?.()
				}
			}
		}

		this.register(requestStandardObsidianSortAfterFileExplorerPatchUninstaller())
	}

	registerCommands() {
		const plugin: CustomSortPlugin = this
		this.addCommand({
			id: 'enable-custom-sorting',
			name: 'Enable and apply the custom sorting, (re)parsing the sorting configuration first. Sort-on.',
			callback: () => {
				plugin.switchPluginStateTo(true)
			}
		});
		this.addCommand({
			id: 'suspend-custom-sorting',
			name: 'Suspend the custom sorting. Sort-off.',
			callback: () => {
				plugin.switchPluginStateTo(false)
			}
		});
	}

	initialize() {
		const plugin = this
		this.app.workspace.onLayoutReady(() => {
			setTimeout(() => {
				plugin.delayedApplicationOfCustomSorting.apply(this)
			},
			plugin.settings.delayForInitialApplication)
		})
	}

	determineSortSpecForFolder(folderPath: string, folderName?: string): CustomSortSpec|null|undefined {
		folderName ??= lastPathComponent(folderPath)
		let sortSpec: CustomSortSpec | null | undefined = this.sortSpecCache?.sortSpecByPath?.[folderPath]
		sortSpec ??= this.sortSpecCache?.sortSpecByName?.[folderName]

		if (!sortSpec && this.sortSpecCache?.sortSpecByWildcard) {
			// when no sorting spec found directly by folder path, check for wildcard-based match
			sortSpec = this.sortSpecCache?.sortSpecByWildcard.folderMatch(folderPath, folderName)
		}
		return sortSpec
	}

	createProcessingContextForSorting(has: HasSortingOrGrouping): ProcessingContext {
		const ctx: ProcessingContext = {
			_mCache: this.app.metadataCache,
			bookmarksPluginInstance: has.grouping.byBookmarks || has.sorting.byBookmarks ?  getBookmarksPlugin(this.app, this.settings.bookmarksGroupToConsumeAsOrderingReference, false, true) : undefined,
			iconFolderPluginInstance: has.grouping.byIcon ? getIconFolderPlugin(this.app) : undefined,
			plugin: this
		}
		return ctx
	}

	determineAndPrepareSortingDataForFolder(folder: TFolder) {
		let sortSpec: CustomSortSpec | null | undefined = this.determineSortSpecForFolder(folder.path, folder.name)

		// Performance optimization
		//     Primary intention: when the implicit bookmarks integration is enabled, remain on std Obsidian, if no need to involve bookmarks
		let sortingAndGroupingStats: HasSortingOrGrouping = collectSortingAndGroupingTypes(sortSpec)
		if (hasOnlyByBookmarkOrStandardObsidian(sortingAndGroupingStats)) {
			const bookmarksPlugin: BookmarksPluginInterface | undefined = getBookmarksPlugin(this.app, this.settings.bookmarksGroupToConsumeAsOrderingReference, false, true)
			if (!bookmarksPlugin?.bookmarksIncludeItemsInFolder(folder.path)) {
				sortSpec = null
			}
		}

		return {
			sortSpec: sortSpec,
			sortingAndGroupingStats: sortingAndGroupingStats
		}
	}

	orderedFolderItemsForBookmarking(folder: TFolder, bookmarksPlugin: BookmarksPluginInterface): Array<TAbstractFile> {
		let sortSpec: CustomSortSpec | null | undefined = undefined
		if (!this.settings.suspended) {
			sortSpec = this.determineSortSpecForFolder(folder.path, folder.name)
		}
		let uiSortOrder: string = this.getFileExplorer().v?.view?.sortOrder || ObsidianStandardDefaultSortingName

		const has: HasSortingOrGrouping = collectSortingAndGroupingTypes(sortSpec)

		return sortFolderItemsForBookmarking(
			folder,
			folder.children,
			sortSpec,
			this.createProcessingContextForSorting(has),
			uiSortOrder
		)
	}

	onunload() {
	}

	onUserEnable() {
	}

	updateStatusBar() {
		if (this.statusBarItemEl) {
			let status = (!this.settings.suspended && this.customSortAppliedAtLeastOnce) ? 'ON' : 'OFF'
			this.statusBarItemEl.setText(`Custom sort:${status}`)
		}
	}

	async loadSettings() {
		const data: any = await this.loadData() || {}
		const isFreshInstall: boolean = Object.keys(data).length === 0
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
		if (isFreshInstall) {
			this.settings = Object.assign(this.settings, DEFAULT_SETTING_FOR_1_2_0_UP)
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	isThePluginStillInstalledAndEnabled(): boolean {
		const thisPlugin: CommunityPlugin | undefined = this?.app?.plugins?.plugins?.[PLUGIN_ID]
		if (thisPlugin && thisPlugin._loaded && this?.app?.plugins?.enabledPlugins?.has(PLUGIN_ID)) {
			return true
		}
		return false
	}

	setWatcherForDelayedFileExplorerView(fileExplorerInDeferredState?: FileExplorerLeaf) {
		const self = this

		let workspaceLeafContentElementParentToObserve: HTMLElement|Element|null|undefined = fileExplorerInDeferredState?.view?.containerEl?.parentElement
		if (!workspaceLeafContentElementParentToObserve) {
			// Fallback for the case when DOM is not available for deferred file explorer
			// (did not happen in practice, but just in case)
			workspaceLeafContentElementParentToObserve = document.querySelector(".workspace");
		}
		if (workspaceLeafContentElementParentToObserve) {
			// Syntax sugar to satisfy the strict TypeScript compiler
			const fileExplorerParentElement = workspaceLeafContentElementParentToObserve
			const fullyFledgedFileExplorerElementSelector=
					() => fileExplorerParentElement.querySelector('[data-type="file-explorer"] .nav-files-container');

			const mutationObserver = new MutationObserver((_, observerInstance) => {
				const fullyFledgedFileExplorerElement = fullyFledgedFileExplorerElementSelector();
				if (fullyFledgedFileExplorerElement) {
					observerInstance.disconnect();
					self.delayedApplicationOfCustomSorting(self.FROM_DOM_WATCHER)
				}
			});

			mutationObserver.observe(workspaceLeafContentElementParentToObserve, {
				childList: true,
				subtree: false
			});
		}
	}

	// Entering this method for the first time after initial delay after plugin loaded (via setTimeout()),
	// and if first attempt is unsuccessful, then entering this method again from DOM watcher, when
	// the File Explorer view gets transformed from delayed view into fully-fledged active view
	FROM_DOM_WATCHER: boolean = true
	delayedApplicationOfCustomSorting(fromDOMwatcher?: boolean) {
		if (!this?.isThePluginStillInstalledAndEnabled()) {
			console.log(`${PLUGIN_ID} v${this.manifest.version} - delayed handler skipped, plugin no longer active.`)
			return
		}

		// should be applied? yes (based on settings)
		const shouldSortingBeApplied = !this.settings.suspended

		if (!shouldSortingBeApplied || this.customSortAppliedAtLeastOnce) {
			return
		}

		if (!fromDOMwatcher) {
			// Only for the first delayed invocation:
			// If file explorer is delayed, configure the watcher
			// NOTE: Do not configure the watcher if the file explorer is not available
			let fileExplorerOrError: FileExplorerLeafOrError = this.checkFileExplorerIsAvailableAndPatchable()
			if (fileExplorerOrError.e && fileExplorerOrError.e.state === FileExplorerState.DeferredView) {
				this.logDeferredFileExplorerWatcherSetupInfo()
				this.setWatcherForDelayedFileExplorerView(fileExplorerOrError.e.fileExplorerInDeferredState)
			} else if (fileExplorerOrError.e) {
				// file explorer other error - does not exist
				// force the plugin switch state to report error and show the error icon
				this.switchPluginStateTo(true)
			}
			else { // file explorer is available
				this.switchPluginStateTo(true)
			}
		} else {
			this.switchPluginStateTo(true)
		}
	}

	setRibbonIconToEnabled() {
		setIcon(this.ribbonIconEl, ICON_SORT_ENABLED_ACTIVE)
	}

	// API
	derivedIndexNoteNameForFolderNotes: string | undefined
	indexNoteNameForFolderNotesDerivedFrom: any

	indexNoteBasename(): string | undefined {
		if (!(this.indexNoteNameForFolderNotesDerivedFrom === this.settings.indexNoteNameForFolderNotes)) {
			this.derivedIndexNoteNameForFolderNotes = extractBasename(this.settings.indexNoteNameForFolderNotes)
			this.indexNoteNameForFolderNotesDerivedFrom = this.settings.indexNoteNameForFolderNotes
		}
		return this.derivedIndexNoteNameForFolderNotes
	}
}

