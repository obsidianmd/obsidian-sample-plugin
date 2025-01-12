import { App, PluginSettingTab, Setting } from 'obsidian';
import NotionSyncPlugin from './main';
import { NotionSyncSettings } from './types';

export const DEFAULT_SETTINGS: NotionSyncSettings = {
    notionToken: '',
    databaseId: '',
    handleDeepLists: 'keep',
    autoSync: false,
    syncOnSave: false
};

export class NotionSyncSettingTab extends PluginSettingTab {
    plugin: NotionSyncPlugin;

    constructor(app: App, plugin: NotionSyncPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: '同步设置' });

        // Token 设置
        new Setting(containerEl)
            .setName('Integration Token')
            .setDesc(createFragment(fragment => {
                fragment.appendText('用于连接 Notion 的授权凭证，');
                fragment.createEl('a', {
                    text: '点击这里创建',
                    href: 'https://www.notion.so/my-integrations'
                });
                fragment.appendText('。创建后请确保赋予读写权限。');
            }))
            .addText(text => text
                .setPlaceholder('secret_...')
                .setValue(this.maskToken(this.plugin.settings.notionToken))
                .onChange(async (value) => {
                    if (value && !value.startsWith('••••')) {
                        this.plugin.settings.notionToken = value;
                        await this.plugin.saveSettings();
                    }
                }));

        // Database ID 设置
        new Setting(containerEl)
            .setName('Database ID')
            .setDesc(createFragment(fragment => {
                fragment.appendText('目标数据库的唯一标识，可在数据库页面的网址中找到：');
                fragment.createEl('code', { text: 'notion.so/workspace/[database-id]' });
                fragment.createEl('br');
                fragment.appendText('请先确保数据库已与你的 Integration 共享。');
            }))
            .addText(text => text
                .setPlaceholder('Enter Database ID')
                .setValue(this.plugin.settings.databaseId)
                .onChange(async (value) => {
                    this.plugin.settings.databaseId = value;
                    await this.plugin.saveSettings();
                }));

        // 高级设置
        containerEl.createEl('h3', { text: '高级设置' });

        new Setting(containerEl)
            .setName('列表处理方式')
            .setDesc(createFragment(fragment => {
                fragment.appendText('设置如何处理多层级的列表结构。');
                fragment.createEl('br');
                fragment.createEl('a', {
                    text: '查看详细说明和示例',
                    href: 'https://github.com/e6g2cyvryi/obsidian-notion-sync#多级列表处理'
                });
            }))
            .addDropdown(dropdown => dropdown
                .addOption('keep', '保持原有层级')
                .addOption('convert', '转为平级结构')
                .addOption('skip', '忽略子级内容')
                .setValue(this.plugin.settings.handleDeepLists)
                .onChange(async (value: any) => {
                    this.plugin.settings.handleDeepLists = value;
                    await this.plugin.saveSettings();
                }));
    }

    private maskToken(token: string): string {
        if (!token) return '';
        return '••••' + token.slice(-4);
    }
} 