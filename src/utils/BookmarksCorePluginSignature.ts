import {
    App,
    InstalledPlugin,
    PluginInstance,
    TAbstractFile,
    TFile,
    TFolder
} from "obsidian";
import {
    extractParentFolderPath,
    lastPathComponent
} from "./utils";
import {Arr} from "tern";
import * as process from "process";

const BookmarksPlugin_getBookmarks_methodName = 'getBookmarks'

const BookmarksPlugin_items_collectionName = 'items'

type Path = string

  // Only relevant types of bookmarked items considered here
  //      The full set of types also includes 'search', canvas, graph, maybe more to come
type BookmarkedItem = BookmarkedFile | BookmarkedFolder | BookmarkedGroup

// Either a file, a folder or header/block inside a file
interface BookmarkItemSuperset {
    path: Path
    title?: string
    ctime: number
    subpath?: string  // Anchor within the file (heading and/or block ref)
}

interface BookmarkWithPath extends Pick<BookmarkItemSuperset, 'path'> {
}

interface BookmarkedFile extends BookmarkItemSuperset {
    type: 'file'
}

interface BookmarkedFolder extends Omit<BookmarkItemSuperset, 'subpath'> {
    type: 'folder'
}

interface BookmarkedGroup extends Omit<BookmarkItemSuperset, 'subpath'|'path'> {
    type: 'group'
    items: Array<BookmarkedItem>
}

export type BookmarkedItemPath = string

export interface OrderedBookmarkedItemWithMetadata {
    isGroup?: boolean
    path: BookmarkedItemPath
    hasSortingIndicator?: boolean
    order: number
    bookmarkPathMatches?: boolean
}

export type OrderedBookmarkedItem = Pick<OrderedBookmarkedItemWithMetadata, 'order'>
export type Order = number

export interface OrderedBookmarks {
    [key: BookmarkedItemPath]: Order
}

export interface OrderedBookmarksWithMetadata {
    [key: BookmarkedItemPath]: OrderedBookmarkedItemWithMetadata
}

interface Bookmarks_PluginInstance extends PluginInstance {
    [BookmarksPlugin_getBookmarks_methodName]: () => Array<BookmarkedItem> | undefined
    [BookmarksPlugin_items_collectionName]: Array<BookmarkedItem>
    saveData(): void
    onItemsChanged(saveData: boolean): void
}

export interface BookmarksPluginInterface {
    determineBookmarkOrder(path: string): number|undefined
    bookmarkFolderItem(item: TAbstractFile): void
    unbookmarkFolderItem(item: TAbstractFile): void
    saveDataAndUpdateBookmarkViews(updateBookmarkViews: boolean): void
    bookmarkSiblings(siblings: Array<TAbstractFile>, inTheTop?: boolean): void
    unbookmarkSiblings(siblings: Array<TAbstractFile>): void
    updateSortingBookmarksAfterItemRenamed(renamedItem: TAbstractFile, oldPath: string): void
    updateSortingBookmarksAfterItemDeleted(deletedItem: TAbstractFile): void
    isBookmarkedForSorting(item: TAbstractFile): boolean

    // To support performance optimization
    bookmarksIncludeItemsInFolder(folderPath: string): boolean
}

const checkSubtreeForOnlyTransparentGroups = (items: Array<BookmarkedItem>): boolean => {
    if (!items || items?.length === 0) return true
    for (let it of items) {
        if (it.type !== 'group' || !it.title || !isGroupTransparentForSorting(it.title)) {
            return false
        }
        // it is a group transparent for sorting
        const isEmptyOrTransparent: boolean = checkSubtreeForOnlyTransparentGroups(it.items)
        if (!isEmptyOrTransparent) {
            return false
        }
    }
    return true
}

const bookmarkedGroupEmptyOrOnlyTransparentForSortingDescendants = (group: BookmarkedGroup): boolean => {
    return checkSubtreeForOnlyTransparentGroups(group.items)
}

class BookmarksPluginWrapper implements BookmarksPluginInterface {

    app: App
    plugin: Bookmarks_PluginInstance|undefined
    groupNameForSorting: string|undefined

    constructor () {
    }

    // Result:
    //    undefined ==> item not found in bookmarks
    //    > 0 ==> item found in bookmarks at returned position
    // Intentionally not returning 0 to allow simple syntax of processing the result
    //
    // Parameterless invocation enforces cache population, if empty
    determineBookmarkOrder = (path?: string): Order | undefined => {
        if (!bookmarksCache) {
            [bookmarksCache, bookmarksFoldersCoverage] = getOrderedBookmarks(this.plugin!, this.groupNameForSorting)
            bookmarksCacheTimestamp = Date.now()
        }

        if (path && path.length > 0) {
            const bookmarkedItemPosition: Order | undefined = bookmarksCache?.[path]

            return (bookmarkedItemPosition && bookmarkedItemPosition > 0) ? bookmarkedItemPosition : undefined
        } else {
            return undefined
        }
    }

    bookmarkFolderItem = (item: TAbstractFile) => {
        this.bookmarkSiblings([item], true)
    }

    unbookmarkFolderItem = (item: TAbstractFile) => {
        this.unbookmarkSiblings([item])
    }

    saveDataAndUpdateBookmarkViews = (updateBookmarkViews: boolean = true) => {
        this.plugin!.onItemsChanged(true)
        if (updateBookmarkViews) {
            const bookmarksLeafs = this.app!.workspace.getLeavesOfType('bookmarks')
            bookmarksLeafs?.forEach((leaf) => {
                (leaf.view as any)?.update?.()
            })
        }
    }

    bookmarkSiblings = (siblings: Array<TAbstractFile>, inTheTop?: boolean) => {
        if (siblings.length === 0) return // for sanity

        const bookmarksContainer: BookmarkedParentFolder|undefined = findGroupForItemPathInBookmarks(
            siblings[0].path,
            CreateIfMissing,
            this.plugin!,
            this.groupNameForSorting
        )

        if (bookmarksContainer) {  // for sanity, the group should be always created if missing
            siblings.forEach((aSibling) => {
                const siblingName = lastPathComponent(aSibling.path)
                const groupTransparentForSorting = bookmarksContainer.items.find((it) => (
                    it.type === 'group' && groupNameForPath(it.title||'') === siblingName && isGroupTransparentForSorting(it.title)
                ))
                if (groupTransparentForSorting) {
                    // got a group transparent for sorting
                    groupTransparentForSorting.title = groupNameForPath(groupTransparentForSorting.title||'')
                } else if (!bookmarksContainer.items.find((it) =>
                    ((it.type === 'folder' || it.type === 'file') && it.path === aSibling.path) ||
                    (it.type === 'group' && it.title === siblingName))) {
                    const newEntry: BookmarkedItem = (aSibling instanceof TFolder) ? createBookmarkGroupEntry(siblingName) : createBookmarkFileEntry(aSibling.path);
                    if (inTheTop) {
                        bookmarksContainer.items.unshift(newEntry)
                    } else {
                        bookmarksContainer.items.push(newEntry)
                    }
                }
            });
        }
    }

    unbookmarkSiblings = (siblings: Array<TAbstractFile>) => {
        if (siblings.length === 0) return // for sanity

        const bookmarksContainer: BookmarkedParentFolder|undefined = findGroupForItemPathInBookmarks(
            siblings[0].path,
            DontCreateIfMissing,
            this.plugin!,
            this.groupNameForSorting
        )

        if (bookmarksContainer) {  // for sanity
            const bookmarkedItemsToRemove: Array<BookmarkedItem> = []
            siblings.forEach((aSibling) => {
                const siblingName = lastPathComponent(aSibling.path)
                const aGroup = bookmarksContainer.items.find(
                    (it) => (it.type === 'group' && groupNameForPath(it.title||'') === siblingName)
                )
                if (aGroup) {
                    const canBeRemoved = bookmarkedGroupEmptyOrOnlyTransparentForSortingDescendants(aGroup as BookmarkedGroup)
                    if (canBeRemoved) {
                        bookmarksContainer.items.remove(aGroup)
                        cleanupBookmarkTreeFromTransparentEmptyGroups(bookmarksContainer, this.plugin!, this.groupNameForSorting)
                    } else {
                        if (!isGroupTransparentForSorting(aGroup.title)) {
                            aGroup.title = groupNameTransparentForSorting(aGroup.title||'')
                        }
                    }
                } else {
                    const aFileOrFolder = bookmarksContainer.items.find(
                        (it) => ((it.type === 'folder' || it.type === 'file') && it.path === aSibling.path)
                    )
                    if (aFileOrFolder) {
                        bookmarksContainer.items.remove(aFileOrFolder)
                        cleanupBookmarkTreeFromTransparentEmptyGroups(bookmarksContainer, this.plugin!, this.groupNameForSorting)
                    }
                }
            });
        }
    }

    updateSortingBookmarksAfterItemRenamed = (renamedItem: TAbstractFile, oldPath: string): void => {
        updateSortingBookmarksAfterItemRenamed(this.plugin!, renamedItem, oldPath, this.groupNameForSorting)
    }

    updateSortingBookmarksAfterItemDeleted = (deletedItem: TAbstractFile): void => {
        updateSortingBookmarksAfterItemDeleted(this.plugin!, deletedItem, this.groupNameForSorting)
    }

    isBookmarkedForSorting = (item: TAbstractFile): boolean => {
        const itemsCollection: BookmarkedParentFolder|undefined = findGroupForItemPathInBookmarks(item.path, DontCreateIfMissing, this.plugin!, this.groupNameForSorting)
        if (itemsCollection) {
            if (item instanceof TFile) {
                return itemsCollection.items?.some((bkmrk) => bkmrk.type === 'file' && bkmrk.path === item.path)
            } else {
                const folderName: string = lastPathComponent(item.path)
                return itemsCollection.items?.some((bkmrk) =>
                    (bkmrk.type === 'group' && bkmrk.title === folderName) ||
                    (bkmrk.type === 'folder' && bkmrk.path === item.path)
                )
            }
        }
        return false
    }

    bookmarksIncludeItemsInFolder = (folderPath: string): boolean => {
        return !! bookmarksFoldersCoverage?.[folderPath]
    }
}

export const BookmarksCorePluginId: string = 'bookmarks'

export const getBookmarksPlugin = (app: App, bookmarksGroupName?: string, forceFlushCache?: boolean, ensureCachePopulated?: boolean): BookmarksPluginInterface | undefined => {
    invalidateExpiredBookmarksCache(forceFlushCache)
    const installedBookmarksPlugin: InstalledPlugin | undefined = app?.internalPlugins?.getPluginById(BookmarksCorePluginId)
    if (installedBookmarksPlugin && installedBookmarksPlugin.enabled && installedBookmarksPlugin.instance) {
        const bookmarksPluginInstance: Bookmarks_PluginInstance = installedBookmarksPlugin.instance as Bookmarks_PluginInstance
        // defensive programming, in case Obsidian changes its internal APIs
        if (typeof bookmarksPluginInstance?.[BookmarksPlugin_getBookmarks_methodName] === 'function' &&
            Array.isArray(bookmarksPluginInstance?.[BookmarksPlugin_items_collectionName])) {
            bookmarksPlugin.app = app
            bookmarksPlugin.plugin = bookmarksPluginInstance
            bookmarksPlugin.groupNameForSorting = bookmarksGroupName
            if (ensureCachePopulated && !bookmarksCache) {
                bookmarksPlugin.determineBookmarkOrder()
            }
            return bookmarksPlugin
        }
    }
}

// cache can outlive the wrapper instances
let bookmarksCache: OrderedBookmarks | undefined = undefined
let bookmarksCacheTimestamp: number | undefined = undefined
type FolderPath = string
type FoldersCoverage = { [key: FolderPath]: boolean }
let bookmarksFoldersCoverage: FoldersCoverage | undefined = undefined

const bookmarksPlugin: BookmarksPluginWrapper = new BookmarksPluginWrapper()

const CacheExpirationMilis = 1000  // One second seems to be reasonable

const invalidateExpiredBookmarksCache = (force?: boolean): void => {
    if (bookmarksCache) {
        let flush: boolean = true
        if (!force && !!bookmarksCacheTimestamp) {
            if (Date.now() - CacheExpirationMilis <= bookmarksCacheTimestamp) {
                flush = false
            }
        }
        if (flush) {
            bookmarksCache = undefined
            bookmarksCacheTimestamp = undefined
            bookmarksFoldersCoverage = undefined
        }
    }
}

type TraverseCallback = (item: BookmarkedItem, parentsGroupsPath: string) => boolean | void

const traverseBookmarksCollection = (items: Array<BookmarkedItem>, callbackConsumeItem: TraverseCallback) => {
    if (!Array.isArray(items)) return
    const recursiveTraversal = (collection: Array<BookmarkedItem>, groupsPath: string) => {
        if (!Array.isArray(collection)) return
        for (let idx = 0, collectionRef = collection; idx < collectionRef.length; idx++) {
            const item = collectionRef[idx];
            if (callbackConsumeItem(item, groupsPath)) return;
            if ('group' === item.type) {
                const groupNameToUseInPath: string = groupNameForPath(item.title || '')
                recursiveTraversal(item.items, `${groupsPath}${groupsPath?'/':''}${groupNameToUseInPath}`);
            }
        }
    };
    recursiveTraversal(items, '');
}

const ARTIFICIAL_ANCHOR_SORTING_BOOKMARK_INDICATOR = '#^-'

const ROOT_FOLDER_PATH = '/'

const TRANSPARENT_FOR_SORTING_PREFIX = '\\\\'

const isGroupTransparentForSorting = (name?: string): boolean => {
    return !!name?.startsWith(TRANSPARENT_FOR_SORTING_PREFIX)
}

const groupNameTransparentForSorting = (name: string): string => {
    return isGroupTransparentForSorting(name) ? name : `${TRANSPARENT_FOR_SORTING_PREFIX}${name}`
}

export const groupNameForPath = (name: string): string => {
    return isGroupTransparentForSorting(name) ? name.substring(TRANSPARENT_FOR_SORTING_PREFIX.length) : name
}

const getOrderedBookmarks = (plugin: Bookmarks_PluginInstance, bookmarksGroupName?: string): [OrderedBookmarks, FoldersCoverage] | [undefined, undefined] => {
    let bookmarksItems: Array<BookmarkedItem> | undefined = plugin?.[BookmarksPlugin_items_collectionName]
    let bookmarksCoveredFolders: FoldersCoverage = {}
    if (bookmarksItems && Array.isArray(bookmarksItems)) {
        if (bookmarksGroupName) {
            // scanning only top level items because by design the bookmarks group for sorting is a top level item
            const bookmarksGroup: BookmarkedGroup|undefined = bookmarksItems.find(
                (item) => item.type === 'group' && item.title === bookmarksGroupName
            ) as BookmarkedGroup
            bookmarksItems = bookmarksGroup ? bookmarksGroup.items : undefined
        }
        if (bookmarksItems) {
            const orderedBookmarksWithMetadata: OrderedBookmarksWithMetadata = {}
            let order: number = 1   // Intentionally start > 0 to allow easy check: if (order) ...
            const consumeItem = (item: BookmarkedItem, parentGroupsPath: string) => {
                if ('group' === item.type) {
                    if (!isGroupTransparentForSorting(item.title)) {
                        const path: string = `${parentGroupsPath}${parentGroupsPath ? '/' : ''}${item.title}`
                        const alreadyConsumed = orderedBookmarksWithMetadata[path]
                        if (alreadyConsumed) {
                            if (alreadyConsumed.isGroup) return   // Defensive programming
                            if (alreadyConsumed.hasSortingIndicator) return
                        }

                        orderedBookmarksWithMetadata[path] = {
                            path: path,
                            order: order++,
                            isGroup: true
                        }
                    }
                } else if ('file' === item.type || 'folder' === item.type) {
                    const itemWithPath = (item as BookmarkWithPath)
                    const itemFile = 'file' === item.type ? (item as BookmarkedFile) : undefined
                    const alreadyConsumed = orderedBookmarksWithMetadata[itemWithPath.path]
                    const hasSortingIndicator: boolean|undefined = itemFile ? itemFile.subpath === ARTIFICIAL_ANCHOR_SORTING_BOOKMARK_INDICATOR : undefined
                    const parentFolderPathOfBookmarkedItem = extractParentFolderPath(itemWithPath.path)
                    const bookmarkPathMatches: boolean = parentGroupsPath === parentFolderPathOfBookmarkedItem
                    const bookmarkPathIsRoot: boolean = !(parentGroupsPath?.length > 0)

                        // Bookmarks not in root (group) or in matching path are ignored
                    if (!bookmarkPathMatches && !bookmarkPathIsRoot) return

                        // For bookmarks in root or in matching path, apply the prioritized duplicate elimination logic
                    if (alreadyConsumed) {
                        if (hasSortingIndicator) {
                            if (alreadyConsumed.hasSortingIndicator && alreadyConsumed.bookmarkPathMatches) return
                            if (alreadyConsumed.hasSortingIndicator && !bookmarkPathMatches) return
                        } else { // no sorting indicator on new
                            if (alreadyConsumed.hasSortingIndicator) return
                            if (!bookmarkPathMatches || alreadyConsumed.bookmarkPathMatches || alreadyConsumed.isGroup) return
                        }
                    }

                    orderedBookmarksWithMetadata[itemWithPath.path] = {
                        path: itemWithPath.path,
                        order: order++,
                        isGroup: false,
                        bookmarkPathMatches: bookmarkPathMatches,
                        hasSortingIndicator: hasSortingIndicator
                    }
                }
            }

            traverseBookmarksCollection(bookmarksItems, consumeItem)

            const orderedBookmarks: OrderedBookmarks = {}

            for (let path in orderedBookmarksWithMetadata) {
                orderedBookmarks[path] = orderedBookmarksWithMetadata[path].order
                const parentFolderPath: Path = extractParentFolderPath(path)
                bookmarksCoveredFolders[parentFolderPath.length > 0 ? parentFolderPath : ROOT_FOLDER_PATH] = true
            }
            return [orderedBookmarks, bookmarksCoveredFolders]
        }
    }
    return [undefined, undefined]
}

const createBookmarkFileEntry = (path: string): BookmarkedFile => {
    // Artificial subpath added intentionally to prevent Bookmarks context menu from finding this item in bookmarks
    //    and - in turn - allow bookmarking it by the user for regular (non sorting) purposes
    return { type: "file", ctime: Date.now(), path: path, subpath: ARTIFICIAL_ANCHOR_SORTING_BOOKMARK_INDICATOR }
}

const createBookmarkGroupEntry = (title: string): BookmarkedGroup => {
    return { type: "group", ctime: Date.now(), items: [], title: title }
}

export interface BookmarkedParentFolder {
    pathOfGroup?: Path // undefined when the container is the root of bookmarks
    group?: BookmarkedGroup  // undefined when the item is at root level of bookmarks
    items: Array<BookmarkedItem> // reference to group.items or to root collection of bookmarks
}

const findGroupForItemPathInBookmarks = (itemPath: string, createIfMissing: boolean, plugin: Bookmarks_PluginInstance, bookmarksGroup?: string): BookmarkedParentFolder|undefined => {
    let items = plugin?.[BookmarksPlugin_items_collectionName]

    if (!Array.isArray(items)) return undefined

    if (!itemPath || !itemPath.trim()) return undefined // for sanity

    const parentPath: string = extractParentFolderPath(itemPath)

    const parentPathComponents: Array<string> = parentPath ? parentPath.split('/')! : []

    if (bookmarksGroup) {
        parentPathComponents.unshift(bookmarksGroup)
    }

    let group: BookmarkedGroup|undefined = undefined
    let failed: boolean = false
    let firstItem: boolean = true

    for (let pathSegment of parentPathComponents) {
        group = items.find((it) => it.type === 'group' && groupNameForPath(it.title||'') === pathSegment) as BookmarkedGroup
        if (!group) {
            if (createIfMissing) {
                const theSortingBookmarksContainerGroup = !!bookmarksGroup && firstItem
                const groupName: string = theSortingBookmarksContainerGroup ? pathSegment : groupNameTransparentForSorting(pathSegment)
                group = createBookmarkGroupEntry(groupName)
                items.push(group)
            } else {
                failed = true
                break
            }
            firstItem = false
        }

        items = group.items
    }

    if (failed) {
        return undefined
    } else {
        return {
            items: items,
            group: group,
            pathOfGroup: parentPath
        }
    }
}

const CreateIfMissing = true
const DontCreateIfMissing = false

const renameGroup = (group: BookmarkedGroup, newName: string, makeTransparentForSorting: boolean|undefined) => {
    if (makeTransparentForSorting === true) {
        group.title = groupNameTransparentForSorting(newName)
    } else if (makeTransparentForSorting === false) {
        group.title = newName
    } else { // no transparency status, retain the status as-is
        group.title = isGroupTransparentForSorting(group.title) ? groupNameTransparentForSorting(newName) : newName
    }
}

const cleanupBookmarkTreeFromTransparentEmptyGroups = (parentGroup: BookmarkedParentFolder|undefined, plugin: Bookmarks_PluginInstance, bookmarksGroup?: string) => {

    if (!parentGroup) return         // invalid invocation - exit
    if (!parentGroup.group) return   // root folder of the bookmarks - do not touch items in root folder

    if (checkSubtreeForOnlyTransparentGroups(parentGroup.items)) {
        parentGroup.group.items = []

        const parentContainerOfGroup = findGroupForItemPathInBookmarks(
            parentGroup.pathOfGroup || '',
            DontCreateIfMissing,
            plugin,
            bookmarksGroup
        )
        if (parentContainerOfGroup) {
            if (isGroupTransparentForSorting(parentGroup.group.title)) {
                parentContainerOfGroup.group?.items?.remove(parentGroup.group)
            }
            cleanupBookmarkTreeFromTransparentEmptyGroups(parentContainerOfGroup, plugin, bookmarksGroup)
        }
    }
}

const updateSortingBookmarksAfterItemRenamed = (plugin: Bookmarks_PluginInstance, renamedItem: TAbstractFile, oldPath: string, bookmarksGroup?: string) => {

    if (renamedItem.path === oldPath) return; // sanity

    const aFolder: boolean = renamedItem instanceof TFolder
    const aFile: boolean = !aFolder
    const oldParentPath: string = extractParentFolderPath(oldPath)
    const oldName: string = lastPathComponent(oldPath)
    const newParentPath: string = extractParentFolderPath(renamedItem.path)
    const newName: string = lastPathComponent(renamedItem.path)
    const moved: boolean = oldParentPath !== newParentPath
    const renamed: boolean = oldName !== newName

        // file renames are handled automatically by Obsidian in bookmarks, no need for additional actions
    if (aFile && renamed) return

    const originalContainer: BookmarkedParentFolder|undefined = findGroupForItemPathInBookmarks(oldPath, DontCreateIfMissing, plugin, bookmarksGroup)

    if (!originalContainer) return;

    const item: BookmarkedItem|undefined = aFolder ?
        originalContainer.items.find((it) => (
            it.type === 'group' && groupNameForPath(it.title||'') === oldName
        ))
        : // aFile
        originalContainer.items.find((it) => (
            it.type === 'file' && it.path === renamedItem.path
        ))

    if (!item) return;

    // The renamed/moved item was located in bookmarks, actions depend on item type
    if (aFile) {
        if (moved) {  // sanity
            originalContainer.group?.items.remove(item)
            cleanupBookmarkTreeFromTransparentEmptyGroups(originalContainer, plugin, bookmarksGroup)
        }
    } else { // a group
        const aGroup: BookmarkedGroup = item as BookmarkedGroup

        if (bookmarkedGroupEmptyOrOnlyTransparentForSortingDescendants(aGroup)) {
            if (moved) {  // sanity
                originalContainer.group?.items.remove(aGroup)
                cleanupBookmarkTreeFromTransparentEmptyGroups(originalContainer, plugin, bookmarksGroup)
            } else if (renamed) {
                renameGroup(aGroup, newName, undefined)
            }
        } else {  // group has some descendants not transparent for sorting
            if (moved) {
                originalContainer.group?.items.remove(aGroup)
                const targetContainer: BookmarkedParentFolder | undefined = findGroupForItemPathInBookmarks(renamedItem.path, CreateIfMissing, plugin, bookmarksGroup)
                if (targetContainer) {
                    targetContainer.group?.items.push(aGroup)
                    // the group in new location becomes by design transparent for sorting.
                    //     The sorting order is a property of the parent folder, not the item itself
                    renameGroup(aGroup, groupNameForPath(aGroup.title||''), true)
                }
                cleanupBookmarkTreeFromTransparentEmptyGroups(originalContainer, plugin, bookmarksGroup)
            }

            if (renamed) {
                // unrealistic scenario when a folder is moved and renamed at the same time
                renameGroup(aGroup, newName, undefined)
            }
        }
    }
}

const updateSortingBookmarksAfterItemDeleted = (plugin: Bookmarks_PluginInstance, deletedItem: TAbstractFile, bookmarksGroup?: string) => {

    // Obsidian automatically deletes all bookmark instances of a file, nothing to be done here
    if (deletedItem instanceof TFile) return;

    let items = plugin[BookmarksPlugin_items_collectionName]

    if (!Array.isArray(items)) return

    const aFolder: boolean = deletedItem instanceof TFolder
    const aFile: boolean = !aFolder

    // Delete all instances of deleted item from two handled locations:
    //    - in bookmark groups hierarchy matching the item path in file explorer
    //    - in the bookmark group designated as container for bookmarks (immediate children)
    const bookmarksContainer: BookmarkedParentFolder|undefined = findGroupForItemPathInBookmarks(deletedItem.path, DontCreateIfMissing, plugin, bookmarksGroup)
    const itemInRootFolder = !!extractParentFolderPath(deletedItem.path)
    const bookmarksRootContainer: BookmarkedParentFolder|undefined =
        (bookmarksGroup && !itemInRootFolder) ? findGroupForItemPathInBookmarks('intentionally-in-root-path', DontCreateIfMissing, plugin, bookmarksGroup) : undefined

    if (!bookmarksContainer && !bookmarksRootContainer) return;

    [bookmarksContainer, bookmarksRootContainer].forEach((container) => {
        const bookmarkEntriesToRemove: Array<BookmarkedItem> = []
        container?.items.forEach((it) => {
            if (aFolder && it.type === 'group' && groupNameForPath(it.title||'') === deletedItem.name) {
                bookmarkEntriesToRemove.push(it)
            }
            if (aFile && it.type === 'file' && it.path === deletedItem.path) {
                bookmarkEntriesToRemove.push(it)
            }
        })
        bookmarkEntriesToRemove.forEach((itemToRemove: BookmarkedItem) =>{
            container?.group?.items.remove(itemToRemove)
        })
        cleanupBookmarkTreeFromTransparentEmptyGroups(container, plugin, bookmarksGroup)
    })
}

export const _unitTests = {
    getOrderedBookmarks: getOrderedBookmarks,
    bookmarkedGroupEmptyOrOnlyTransparentForSortingDescendants: bookmarkedGroupEmptyOrOnlyTransparentForSortingDescendants,
    cleanupBookmarkTreeFromTransparentEmptyGroups: cleanupBookmarkTreeFromTransparentEmptyGroups,
    findGroupForItemPathInBookmarks: findGroupForItemPathInBookmarks
}
