export interface NotionSyncSettings {
    notionToken: string;
    databaseId: string;
    handleDeepLists: 'convert' | 'skip' | 'keep';
    autoSync: boolean;
    syncOnSave: boolean;
} 