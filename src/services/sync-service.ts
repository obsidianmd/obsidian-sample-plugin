import { App, TFile, Notice } from 'obsidian';
import { NotionService } from './notion-service';
import { MarkdownConverter } from '../utils/converter';
import { NotionSyncSettings } from '../types';
import { DataValidator } from '../utils/validator';

export class SyncService {
    private app: App;
    private notionService: NotionService;
    private settings: NotionSyncSettings;
    private readonly MAX_FILE_SIZE = 500 * 1024; // 500KB

    constructor(app: App, notionService: NotionService, settings: NotionSyncSettings) {
        this.app = app;
        this.notionService = notionService;
        this.settings = settings;
    }

    private validateSettings(): boolean {
        if (!this.settings) {
            new Notice('Configuration required');
            return false;
        }


        if (!this.settings.databaseId || this.settings.databaseId.length < 32) {
            new Notice('Invalid database ID');
            return false;
        }

        return true;
    }

    async syncFile(file: TFile): Promise<void> {
        if (!this.validateSettings()) {
            return;
        }

        if (!file || !(file instanceof TFile)) {
            new Notice('Invalid file');
            return;
        }

        try {
            // 检查文件大小
            if (file.stat.size > this.MAX_FILE_SIZE) {
                new Notice('File size exceeds maximum limit');
                return;
            }

            const content = await this.app.vault.read(file);
            
            if (!DataValidator.validateContent(content)) {
                new Notice('Invalid file content');
                return;
            }

            const blocks = MarkdownConverter.convertToNotionBlocks(content);
            
            await this.notionService.createOrUpdatePage(
                this.settings.databaseId,
                blocks,
                this.settings,
                file.basename
            );
            
            new Notice('Sync completed');
        } catch (error) {
            console.error('Sync failed:', error);
            new Notice('Sync failed. Check console for details.');
        }
    }
}