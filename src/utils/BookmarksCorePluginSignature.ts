import {InstalledPlugin, PluginInstance, TAbstractFile, TFile, TFolder} from "obsidian";
import {extractParentFolderPath, lastPathComponent} from "./utils";

const BookmarksPlugin_getBookmarks_methodName = 'getBookmarks'

const BookmarksPlugin_items_collectionName = 'items'

type Path = string

  // Only relevant types of bookmarked items considered here
  //      The full set of types also includes 'search', canvas, graph, maybe more to come
type BookmarkedItem = BookmarkedFile | BookmarkedFolder | BookmarkedGroup

// Either a file, a folder or header/block inside a file
interface BookmarkWithPath {
    path: Path
}

interface BookmarkedFile {
    type: 'file'
    path: Path
    subpath?: string  // Anchor within the file (heading and/or block ref)
    title?: string
    ctime: number
}

interface BookmarkedFolder {
    type: 'folder'
    path: Path
    title?: string
    ctime: number
}

interface BookmarkedGroup {
    type: 'group'
    items: Array<BookmarkedItem>
    title?: string
    ctime: number
}

export type BookmarkedItemPath = string

export interface OrderedBookmarkedItem {
    file: boolean
    folder: boolean
    group: boolean
    path: BookmarkedItemPath
    order: number
    pathOfBookmarkGroupsMatches: boolean
}

interface OrderedBookmarks {
    [key: BookmarkedItemPath]: OrderedBookmarkedItem
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
    saveDataAndUpdateBookmarkViews(updateBookmarkViews: boolean): void
    bookmarkSiblings(siblings: Array<TAbstractFile>, inTheTop?: boolean): void
    updateSortingBookmarksAfterItemRenamed(renamedItem: TAbstractFile, oldPath: string): void
    updateSortingBookmarksAfterItemDeleted(deletedItem: TAbstractFile): void
    isBookmarkedForSorting(item: TAbstractFile): boolean
}

class BookmarksPluginWrapper implements BookmarksPluginInterface {

    plugin: Bookmarks_PluginInstance|undefined
    groupNameForSorting: string|undefined

    constructor () {
    }

    // Result:
    //    undefined ==> item not found in bookmarks
    //    > 0 ==> item found in bookmarks at returned position
    // Intentionally not returning 0 to allow simple syntax of processing the result
    determineBookmarkOrder = (path: string): number | undefined => {
        if (!bookmarksCache) {
            bookmarksCache = getOrderedBookmarks(this.plugin!, this.groupNameForSorting)
            bookmarksCacheTimestamp = Date.now()
        }

        const bookmarkedItemPosition: number | undefined = bookmarksCache?.[path]?.order

        return (bookmarkedItemPosition !== undefined && bookmarkedItemPosition >= 0) ? (bookmarkedItemPosition + 1) : undefined
    }

    bookmarkFolderItem = (item: TAbstractFile) => {
        this.bookmarkSiblings([item], true)
    }

    saveDataAndUpdateBookmarkViews = (updateBookmarkViews: boolean = true) => {
        this.plugin!.onItemsChanged(true)
        if (updateBookmarkViews) {
            const bookmarksLeafs = app.workspace.getLeavesOfType('bookmarks')
            bookmarksLeafs?.forEach((leaf) => {
                (leaf.view as any)?.update?.()
            })
        }
    }

    bookmarkSiblings = (siblings: Array<TAbstractFile>, inTheTop?: boolean) => {
        console.log('In this.bookmarksSiblings()')
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
                if (!bookmarksContainer.items.find((it) =>
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
}

export const BookmarksCorePluginId: string = 'bookmarks'

export const getBookmarksPlugin = (bookmarksGroupName?: string): BookmarksPluginInterface | undefined => {
    invalidateExpiredBookmarksCache()
    const installedBookmarksPlugin: InstalledPlugin | undefined = app?.internalPlugins?.getPluginById(BookmarksCorePluginId)
    console.log(installedBookmarksPlugin)
    const bookmarks = (installedBookmarksPlugin?.instance as any) ?.['getBookmarks']()
    console.log(bookmarks)
    if (installedBookmarksPlugin && installedBookmarksPlugin.enabled && installedBookmarksPlugin.instance) {
        const bookmarksPluginInstance: Bookmarks_PluginInstance = installedBookmarksPlugin.instance as Bookmarks_PluginInstance
        // defensive programming, in case Obsidian changes its internal APIs
        if (typeof bookmarksPluginInstance?.[BookmarksPlugin_getBookmarks_methodName] === 'function') {
            bookmarksPlugin.plugin = bookmarksPluginInstance
            bookmarksPlugin.groupNameForSorting = bookmarksGroupName
            return bookmarksPlugin
        }
    }
}

// cache can outlive the wrapper instances
let bookmarksCache: OrderedBookmarks | undefined = undefined
let bookmarksCacheTimestamp: number | undefined = undefined

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
        }
    }
}

type TraverseCallback = (item: BookmarkedItem, parentsGroupsPath: string) => boolean | void

const traverseBookmarksCollection = (items: Array<BookmarkedItem>, callback: TraverseCallback) => {
    const recursiveTraversal = (collection: Array<BookmarkedItem>, groupsPath: string) => {
        for (let idx = 0, collectionRef = collection; idx < collectionRef.length; idx++) {
            const item = collectionRef[idx];
            if (callback(item, groupsPath)) return;
            if ('group' === item.type) recursiveTraversal(item.items, `${groupsPath}${groupsPath?'/':''}${item.title}`);
        }
    };
    recursiveTraversal(items, '');
}

const ARTIFICIAL_ANCHOR_SORTING_BOOKMARK_INDICATOR = '#^-'

const getOrderedBookmarks = (plugin: Bookmarks_PluginInstance, bookmarksGroupName?: string): OrderedBookmarks | undefined => {
    console.log(`Populating bookmarks cache with group scope ${bookmarksGroupName}`)
    let bookmarks: Array<BookmarkedItem> | undefined = plugin?.[BookmarksPlugin_getBookmarks_methodName]()
    if (bookmarks) {
        if (bookmarksGroupName) {
            const bookmarksGroup: BookmarkedGroup|undefined = bookmarks.find(
                (item) => item.type === 'group' && item.title === bookmarksGroupName) as BookmarkedGroup
            bookmarks = bookmarksGroup ? bookmarksGroup.items : undefined
        }
        if (bookmarks) {
            const orderedBookmarks: OrderedBookmarks = {}
            let order: number = 0
            const consumeItem = (item: BookmarkedItem, parentGroupsPath: string) => {
                const isFile: boolean = item.type === 'file'
                const hasSortspecAnchor: boolean = isFile && (item as BookmarkedFile).subpath === ARTIFICIAL_ANCHOR_SORTING_BOOKMARK_INDICATOR
                const isFolder: boolean = item.type === 'folder'
                const isGroup: boolean = item.type === 'group'
                if ((isFile && hasSortspecAnchor) || isFolder || isGroup) {
                    const pathOfGroup: string = `${parentGroupsPath}${parentGroupsPath?'/':''}${item.title}`
                    const path = isGroup ? pathOfGroup : (item as BookmarkWithPath).path
                    // Consume only the first occurrence of a path in bookmarks, even if many duplicates can exist
                    // TODO: consume the occurrence at correct folders (groups) location resembling the original structure with highest prio
                    //     and only if not found, consider any (first) occurrence
                    const alreadyConsumed = orderedBookmarks[path]
                    const pathOfBookmarkGroupsMatches: boolean = true // TODO: !!! with fresh head determine the condition to check here
                    if (!alreadyConsumed || (pathOfBookmarkGroupsMatches && !alreadyConsumed.pathOfBookmarkGroupsMatches)) {
                        orderedBookmarks[path] = {
                            path: path,
                            order: order++,
                            file: isFile,
                            folder: isFile,
                            group: isGroup,
                            pathOfBookmarkGroupsMatches: pathOfBookmarkGroupsMatches
                        }
                    }
                }
            }
            traverseBookmarksCollection(bookmarks, consumeItem)
            return orderedBookmarks
        }
    }
}

const createBookmarkFileEntry = (path: string): BookmarkedFile => {
    // Artificial subpath added intentionally to prevent Bookmarks context menu from finding this item in bookmarks
    //    and - in turn - allow bookmarking it by the user for regular (non sorting) purposes
    return { type: "file", ctime: Date.now(), path: path, subpath: ARTIFICIAL_ANCHOR_SORTING_BOOKMARK_INDICATOR }
}

const createBookmarkGroupEntry = (title: string): BookmarkedGroup => {
    return { type: "group", ctime: Date.now(), items: [], title: title }
}

interface BookmarkedParentFolder {
    group?: BookmarkedGroup  // undefined when the item is at root level of bookmarks
    items: Array<BookmarkedItem> // reference to group.items or to root collection of bookmarks
}

interface ItemInBookmarks {
    parentItemsCollection: Array<BookmarkedItem>
    item: BookmarkedItem
}

const findGroupForItemPathInBookmarks = (itemPath: string, createIfMissing: boolean, plugin: Bookmarks_PluginInstance, bookmarksGroup?: string): BookmarkedParentFolder|undefined => {
    let items = plugin[BookmarksPlugin_items_collectionName]

    if (!itemPath || !itemPath.trim()) return undefined // for sanity

    const parentPath: string = extractParentFolderPath(itemPath)

    const parentPathComponents: Array<string> = parentPath ? parentPath.split('/')! : []

    if (bookmarksGroup) {
        parentPathComponents.unshift(bookmarksGroup)
    }

    let group: BookmarkedGroup|undefined = undefined

    parentPathComponents.forEach((pathSegment) => {
        let group: BookmarkedGroup|undefined = items.find((it) => it.type === 'group' && it.title === pathSegment) as BookmarkedGroup
        if (!group) {
            if (createIfMissing) {
                group = createBookmarkGroupEntry(pathSegment)
                items.push(group)
            } else {
                return undefined
            }
        }

        items = group.items
    })

    return {
        items: items,
        group: group
    }
}

const CreateIfMissing = true
const DontCreateIfMissing = false



const updateSortingBookmarksAfterItemRenamed = (plugin: Bookmarks_PluginInstance, renamedItem: TAbstractFile, oldPath: string, bookmarksGroup?: string) => {

    if (renamedItem.path === oldPath) return; // sanity

    let items = plugin[BookmarksPlugin_items_collectionName]
    const aFolder: boolean = renamedItem instanceof TFolder
    const aFolderWithChildren: boolean = aFolder && (renamedItem as TFolder).children.length > 0
    const aFile: boolean = !aFolder
    const oldParentPath: string = extractParentFolderPath(oldPath)
    const oldName: string = lastPathComponent(oldPath)
    const newParentPath: string = extractParentFolderPath(renamedItem.path)
    const newName: string = lastPathComponent(renamedItem.path)
    const moved: boolean = oldParentPath !== newParentPath
    const renamed: boolean = oldName !== newName

    const originalContainer: BookmarkedParentFolder|undefined = findGroupForItemPathInBookmarks(oldPath, DontCreateIfMissing, plugin, bookmarksGroup)

    if (!originalContainer) return;

    const item: BookmarkedItem|undefined = originalContainer.items.find((it) => {
        if (aFolder && it.type === 'group' && it.title === oldName) return true;
        if (aFile && it.type === 'file' && it.path === oldPath) return true;
    })

    if (!item) return;

    // The renamed/moved item was located in bookmarks, apply the necessary bookmarks updates

    let itemRemovedFromBookmarks: boolean = false
    if (moved) {
        originalContainer.items.remove(item)
        const createTargetLocation: boolean = aFolderWithChildren
        const targetContainer: BookmarkedParentFolder|undefined = findGroupForItemPathInBookmarks(renamedItem.path, createTargetLocation, plugin, bookmarksGroup)
        if (targetContainer) {
            targetContainer.items.push(item)
        } else {
            itemRemovedFromBookmarks = true  // open question: remove from bookmarks indeed, if target location was not under bookmarks control?
        }
    }

    if (aFolder && renamed && !itemRemovedFromBookmarks) {
        // Renames of files are handled automatically by Bookmarks core plugin, only need to handle folder rename
        //    because folders are represented (for sorting purposes) by groups with exact name
        (item as BookmarkedGroup).title = newName
    }

    console.log(`Folder renamel from ${oldPath} to ${renamedItem.path}`)
}

const updateSortingBookmarksAfterItemDeleted = (plugin: Bookmarks_PluginInstance, deletedItem: TAbstractFile, bookmarksGroup?: string) => {

    // Obsidian automatically deletes all bookmark instances of a file, nothing to be done here
    if (deletedItem instanceof TFile) return;

    let items = plugin[BookmarksPlugin_items_collectionName]
    const aFolder: boolean = deletedItem instanceof TFolder
    const aFile: boolean = !aFolder

    const originalContainer: BookmarkedParentFolder|undefined = findGroupForItemPathInBookmarks(deletedItem.path, DontCreateIfMissing, plugin, bookmarksGroup)

    if (!originalContainer) return;

    const item: BookmarkedItem|undefined = originalContainer.items.find((it) => {
        if (aFolder && it.type === 'group' && it.title === deletedItem.name) return true;
        if (aFile && it.type === 'file' && it.path === deletedItem.path) return true;
    })

    if (!item) return;

    originalContainer.items.remove(item)

    console.log(`Folder deletel ${deletedItem.path}`)
}
