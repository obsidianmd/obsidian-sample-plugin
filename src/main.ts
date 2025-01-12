import { Plugin, Menu, TFile, Notice } from 'obsidian';
import { NotionSyncSettings } from './types';
import { NotionSyncSettingTab, DEFAULT_SETTINGS } from './settings';
import { NotionService } from './services/notion-service';
import { SyncService } from './services/sync-service';
import { DataValidator } from './utils/validator';
import { StorageService } from './services/storage-service';

export default class NotionSyncPlugin extends Plugin {
    settings: NotionSyncSettings;
    notionService: NotionService;
    syncService: SyncService;
    private storageService: StorageService;

    async onload() {
        try {
            this.storageService = new StorageService(this.app.vault.adapter);
            await this.loadSettings();

            this.notionService = new NotionService(this.settings.notionToken);
            this.syncService = new SyncService(this.app, this.notionService, this.settings);

            // 添加设置标签页
            this.addSettingTab(new NotionSyncSettingTab(this.app, this));

            // 添加同步命令
            this.addCommand({
                id: 'sync-to-notion',
                name: '同步当前文件到 Notion',
                callback: async () => {
                    const file = this.app.workspace.getActiveFile();
                    if (file) {
                        await this.syncService.syncFile(file);
                    } else {
                        new Notice('请先打开要同步的文件');
                    }
                }
            });

            // 添加文件菜单项
            this.registerEvent(
                this.app.workspace.on('file-menu', (menu: Menu, file: TFile) => {
                    if (file && file instanceof TFile) {
                        menu.addItem((item) => {
                            item
                                .setTitle('同步到 Notion')
                                .setIcon('upload-cloud')
                                .onClick(async () => {
                                    await this.syncService.syncFile(file);
                                });
                        });
                    }
                })
            );
        } catch (error) {
            new Notice('插件加载失败');
            console.error('Plugin load error:', error);
        }
    }

    async loadSettings() {
        const savedSettings = await this.storageService.loadSettings();
        this.settings = Object.assign({}, DEFAULT_SETTINGS, savedSettings);
    }

    async saveSettings() {
        if (this.settings) {
            await this.storageService.saveSettings(this.settings);
        }
    }

    async onunload() {
        // Obsidian 会自动处理插件的清理工作
    }
} 