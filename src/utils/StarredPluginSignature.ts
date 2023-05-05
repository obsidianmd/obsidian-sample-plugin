import {InstalledPlugin, PluginInstance, TAbstractFile, TFile, TFolder} from "obsidian";

export const StarredPlugin_findStarredFile_methodName = 'findStarredFile'

export interface findStarredFile_pathParam {
    path: string
}

export interface Starred_PluginInstance extends PluginInstance {
    [StarredPlugin_findStarredFile_methodName]: (filePath: findStarredFile_pathParam) => TFile | null
}

export const StarredCorePluginId: string = 'starred'

export const getStarredPlugin = (): Starred_PluginInstance | undefined => {
    const starredPlugin: InstalledPlugin | undefined = app?.internalPlugins?.getPluginById(StarredCorePluginId)
    if (starredPlugin && starredPlugin.enabled && starredPlugin.instance) {
        const starredPluginInstance: Starred_PluginInstance = starredPlugin.instance as Starred_PluginInstance
        // defensive programming, in case Obsidian changes its internal APIs
        if (typeof starredPluginInstance?.[StarredPlugin_findStarredFile_methodName] === 'function') {
            return starredPluginInstance
        }
    }
}

const isFolder = (entry: TAbstractFile) => {
    // The plain obvious 'entry instanceof TFolder' doesn't work inside Jest unit tests, hence a workaround below
    return !!((entry as any).isRoot);
}

export const determineStarredStatusOfFolder = (folder: TFolder, starredPluginInstance: Starred_PluginInstance): boolean => {
    return folder.children.some((folderItem) => {
        return !isFolder(folderItem) && starredPluginInstance[StarredPlugin_findStarredFile_methodName]({path: folderItem.path})
    })
}

export const determineStarredStatusOf = (entry: TFile | TFolder, aFile: boolean, starredPluginInstance: Starred_PluginInstance) => {
    if (aFile) {
        return !!starredPluginInstance[StarredPlugin_findStarredFile_methodName]({path: entry.path})
    } else { // aFolder
        return determineStarredStatusOfFolder(entry as TFolder, starredPluginInstance)
    }
}
