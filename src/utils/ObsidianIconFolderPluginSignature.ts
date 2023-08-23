import {CommunityPlugin, TAbstractFile} from "obsidian";

// For https://github.com/FlorianWoelki/obsidian-icon-folder

export const ObsidianIconFolderPlugin_getData_methodName = 'getData'

export interface FolderIconObject {
    iconName: string | null;
    inheritanceIcon: string;
}

export type ObsidianIconFolderPlugin_Data = Record<string, boolean | string | FolderIconObject | any>

export interface ObsidianIconFolder_PluginInstance extends CommunityPlugin {
    [ObsidianIconFolderPlugin_getData_methodName]: () => ObsidianIconFolderPlugin_Data
}

// https://github.com/FlorianWoelki/obsidian-icon-folder/blob/fd9c7df1486744450cec3d7ee9cee2b34d008e56/manifest.json#L2
export const ObsidianIconFolderPluginId: string = 'obsidian-icon-folder'

export const getIconFolderPlugin = (): ObsidianIconFolder_PluginInstance | undefined => {
    const iconFolderPlugin: CommunityPlugin | undefined = app?.plugins?.plugins?.[ObsidianIconFolderPluginId]
    if (iconFolderPlugin && iconFolderPlugin._loaded && app?.plugins?.enabledPlugins?.has(ObsidianIconFolderPluginId)) {
        const iconFolderPluginInstance: ObsidianIconFolder_PluginInstance = iconFolderPlugin as ObsidianIconFolder_PluginInstance
        // defensive programming, in case the community plugin changes its internal APIs
        if (typeof iconFolderPluginInstance?.[ObsidianIconFolderPlugin_getData_methodName] === 'function') {
            return iconFolderPluginInstance
        }
    }
}

// Intentionally partial and simplified, only detect icons configured directly,
//    ignoring any icon inheritance or regexp-based applied icons
export const determineIconOf = (entry: TAbstractFile, iconFolderPluginInstance: ObsidianIconFolder_PluginInstance): string | undefined => {
    const iconsData: ObsidianIconFolderPlugin_Data | undefined = iconFolderPluginInstance[ObsidianIconFolderPlugin_getData_methodName]()
    const entryForPath: any = iconsData?.[entry.path]
    // Icons configured directly
    if (typeof entryForPath === 'string') {
        return entryForPath
    } else if (typeof (entryForPath as FolderIconObject)?.iconName === 'string') {
        return (entryForPath as FolderIconObject)?.iconName ?? undefined
    } else {
        return undefined
    }
}


