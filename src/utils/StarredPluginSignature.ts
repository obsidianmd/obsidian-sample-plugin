import {PluginInstance, TFile} from "obsidian";

export const StarredPlugin_findStarredFile_methodName = 'findStarredFile'

export interface findStarredFile_pathParam {
    path: string
}

export interface Starred_PluginInstance extends PluginInstance {
    [StarredPlugin_findStarredFile_methodName]: (filePath: findStarredFile_pathParam) => TFile | null
}
