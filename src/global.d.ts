import { App, TFile, Notice, PluginSettingTab, Setting } from 'obsidian';
import { Client as NotionClient } from '@notionhq/client';

declare global {
    interface Window {
        app: App;
    }
}

declare module "obsidian" {
    interface App {
        workspace: Workspace;
        vault: Vault;
    }

    interface Workspace {
        getActiveFile(): TFile | null;
        on(name: string, callback: (menu: Menu, file: TFile) => any): EventRef;
    }

    interface Vault {
        read(file: TFile): Promise<string>;
    }
}

declare module "@notionhq/client" {
    interface NotionClientTypes {
        // 如果需要扩展 Notion 客户端类型，在这里添加
    }
}

export {}; 