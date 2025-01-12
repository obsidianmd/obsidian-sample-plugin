import { DataAdapter, Notice } from 'obsidian';
import { NotionSyncSettings } from '../types';
import * as crypto from 'crypto';

export class StorageService {
    private adapter: DataAdapter;
    private readonly SETTINGS_PATH = '.obsidian/plugins/obsidian-notion-sync/settings.encrypted';
    private readonly LEGACY_SETTINGS_PATH = '.obsidian/plugins/obsidian-notion-sync/data.json';
    private readonly ALGORITHM = 'aes-256-cbc';
    private readonly KEY = crypto.scryptSync('obsidian-notion-sync', 'salt', 32);
    private readonly IV_LENGTH = 16;

    constructor(adapter: DataAdapter) {
        this.adapter = adapter;
    }

    private encrypt(text: string): string {
        if (!text) return '';
        try {
            const iv = crypto.randomBytes(this.IV_LENGTH);
            const cipher = crypto.createCipheriv(this.ALGORITHM, this.KEY, iv);
            
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            return iv.toString('hex') + ':' + encrypted;
        } catch (error) {
            console.error('Encryption failed:', error);
            return '';
        }
    }

    private decrypt(encryptedData: string): string {
        if (!encryptedData) return '';
        try {
            if (!encryptedData.includes(':')) {
                // 未加密的数据，直接返回
                return encryptedData;
            }

            const [ivHex, encryptedText] = encryptedData.split(':');
            if (!ivHex || !encryptedText) {
                console.warn('Invalid encrypted data format');
                return encryptedData;
            }

            const iv = Buffer.from(ivHex, 'hex');
            const decipher = crypto.createDecipheriv(this.ALGORITHM, this.KEY, iv);
            
            let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            console.error('Decryption failed:', error);
            return encryptedData; // 如果解密失败，返回原始数据
        }
    }

    async saveSettings(settings: NotionSyncSettings): Promise<void> {
        const encryptedSettings = {
            ...settings,
            notionToken: this.encrypt(settings.notionToken),
            notionDatabaseId: this.encrypt(settings.databaseId)
        };
        
        await this.adapter.write(
            this.SETTINGS_PATH,
            JSON.stringify(encryptedSettings)
        );

        try {
            if (await this.adapter.exists(this.LEGACY_SETTINGS_PATH)) {
                await this.adapter.remove(this.LEGACY_SETTINGS_PATH);
            }
        } catch (error) {
            console.warn('Failed to remove legacy settings file:', error);
        }
    }

    async loadSettings(): Promise<NotionSyncSettings | null> {
        try {
            if (await this.adapter.exists(this.SETTINGS_PATH)) {
                const data = await this.adapter.read(this.SETTINGS_PATH);
                const encryptedSettings = JSON.parse(data);
                const decryptedToken = this.decrypt(encryptedSettings.notionToken);

                return {
                    ...encryptedSettings,
                    notionToken: decryptedToken,
                    notionDatabaseId: this.decrypt(encryptedSettings.notionDatabaseId)
                };
            }

            if (await this.adapter.exists(this.LEGACY_SETTINGS_PATH)) {
                const legacyData = await this.adapter.read(this.LEGACY_SETTINGS_PATH);
                const legacySettings = JSON.parse(legacyData);
                await this.saveSettings(legacySettings);
                return legacySettings;
            }

            return null;
        } catch (error) {
            console.error('Failed to load settings:', error);
            return null;
        }
    }

    async clearSettings(): Promise<void> {
        try {
            if (await this.adapter.exists(this.SETTINGS_PATH)) {
                await this.adapter.remove(this.SETTINGS_PATH);
            }
            if (await this.adapter.exists(this.LEGACY_SETTINGS_PATH)) {
                await this.adapter.remove(this.LEGACY_SETTINGS_PATH);
            }
        } catch (error) {
            console.error('Failed to clear settings:', error);
            throw error;
        }
    }
} 