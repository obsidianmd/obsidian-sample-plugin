import {App, InstalledPlugin, PluginInstance} from "obsidian";

const BookmarksPlugin_getBookmarks_methodName = 'getBookmarks'

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
    subpath?: string  // Anchor within the file
    title?: string
}

interface BookmarkedFolder {
    type: 'folder'
    path: Path
    title?: string
}

interface BookmarkedGroup {
    type: 'group'
    items: Array<BookmarkedItem>
    title?: string
}

export type BookmarkedItemPath = string

export interface OrderedBookmarkedItem {
    file: boolean
    folder: boolean
    path: BookmarkedItemPath
    order: number
}

interface OrderedBookmarks {
    [key: BookmarkedItemPath]: OrderedBookmarkedItem
}

export interface Bookmarks_PluginInstance extends PluginInstance {
    [BookmarksPlugin_getBookmarks_methodName]: () => Array<BookmarkedItem> | undefined
}

let bookmarksCache: OrderedBookmarks | undefined = undefined
let bookmarksCacheTimestamp: number | undefined = undefined

const CacheExpirationMilis = 1000  // One second seems to be reasonable

export const invalidateExpiredBookmarksCache = (force?: boolean): void => {
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

export const BookmarksCorePluginId: string = 'bookmarks'

export const getBookmarksPlugin = (app?: App): Bookmarks_PluginInstance | undefined => {
    invalidateExpiredBookmarksCache()
    const bookmarksPlugin: InstalledPlugin | undefined = app?.internalPlugins?.getPluginById(BookmarksCorePluginId)
    console.log(bookmarksPlugin)
    const bookmarks = (bookmarksPlugin?.instance as any) ?.['getBookmarks']()
    console.log(bookmarks)
    if (bookmarksPlugin && bookmarksPlugin.enabled && bookmarksPlugin.instance) {
        const bookmarksPluginInstance: Bookmarks_PluginInstance = bookmarksPlugin.instance as Bookmarks_PluginInstance
        // defensive programming, in case Obsidian changes its internal APIs
        if (typeof bookmarksPluginInstance?.[BookmarksPlugin_getBookmarks_methodName] === 'function') {
            return bookmarksPluginInstance
        }
    }
}

type TraverseCallback = (item: BookmarkedItem) => boolean | void

const traverseBookmarksCollection = (items: Array<BookmarkedItem>, callback: TraverseCallback) => {
    const recursiveTraversal = (collection: Array<BookmarkedItem>) => {
        for (let idx = 0, collectionRef = collection; idx < collectionRef.length; idx++) {
            const item = collectionRef[idx];
            if (callback(item)) return;
            if ('group' === item.type) recursiveTraversal(item.items);
        }
    };
    recursiveTraversal(items);
}

// TODO: extend this function to take a scope as parameter: a path to Bookmarks group to start from
//       Initially consuming all bookmarks is ok - finally the starting point (group) should be configurable
const getOrderedBookmarks = (plugin: Bookmarks_PluginInstance): OrderedBookmarks | undefined => {
    const bookmarks: Array<BookmarkedItem> | undefined = plugin?.[BookmarksPlugin_getBookmarks_methodName]()
    if (bookmarks) {
        const orderedBookmarks: OrderedBookmarks = {}
        let order: number = 0
        const consumeItem = (item: BookmarkedItem) => {
            const isFile: boolean = item.type === 'file'
            const isAnchor: boolean = isFile && !!(item as BookmarkedFile).subpath
            const isFolder: boolean = item.type === 'folder'
            if ((isFile && !isAnchor) || isFolder) {
                const path = (item as BookmarkWithPath).path
                // Consume only the first occurrence of a path in bookmarks, even if many duplicates can exist
                const alreadyConsumed = orderedBookmarks[path]
                if (!alreadyConsumed) {
                    orderedBookmarks[path] = {
                        path: path,
                        order: order++,
                        file: isFile,
                        folder: isFile
                    }
                }
            }
        }
        traverseBookmarksCollection(bookmarks, consumeItem)
        return orderedBookmarks
    }
}

// Result:
//    undefined ==> item not found in bookmarks
//    > 0 ==> item found in bookmarks at returned position
// Intentionally not returning 0 to allow simple syntax of processing the result
export const determineBookmarkOrder = (path: string, plugin: Bookmarks_PluginInstance): number | undefined => {
    if (!bookmarksCache) {
        bookmarksCache = getOrderedBookmarks(plugin)
        bookmarksCacheTimestamp = Date.now()
    }

    const bookmarkedItemPosition: number | undefined = bookmarksCache?.[path]?.order

    return (bookmarkedItemPosition !== undefined && bookmarkedItemPosition >= 0) ? (bookmarkedItemPosition + 1) : undefined
}
