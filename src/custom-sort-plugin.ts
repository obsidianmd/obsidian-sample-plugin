import {
    Plugin
} from 'obsidian'

export interface CustomSortPluginAPI extends Plugin {
    indexNoteBasename(): string|undefined
}
