import { Plugin } from 'obsidian';

export interface NotionSyncSettings {
    notionToken: string;
    notionDatabaseId: string;
    handleDeepLists: 'convert' | 'skip' | 'keep';
}

export interface NotionSyncPlugin extends Plugin {
    settings: NotionSyncSettings;
    loadSettings(): Promise<void>;
    saveSettings(): Promise<void>;
} 