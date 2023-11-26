import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { AppView, VIEW_TYPE } from './src/ui/AppView';
import OpenAI from 'openai';
import { IThread } from './src/ui/types';

interface ObsidianIntelligenceSettings {
    openaiKey: string;
    threads: IThread[];
    activeThread: IThread | undefined;
    activeAssistant: OpenAI.Beta.Assistant | undefined;
    activeAssistantFiles: OpenAI.Files.FileObject[] | undefined;
}

const DEFAULT_SETTINGS: ObsidianIntelligenceSettings = {
    openaiKey: '',
    threads: [],
    activeThread: undefined,
    activeAssistant: undefined,
    activeAssistantFiles: undefined,
};

export default class ObsidianIntelligence extends Plugin {
    settings: ObsidianIntelligenceSettings;
    view: AppView;

    async onload() {
        await this.loadSettings();
        this.registerView(VIEW_TYPE, (leaf) => new AppView(leaf, this));

        const ribbonIconEl = this.addRibbonIcon(
            'bot',
            'Open Obsidian Intelligence',
            (evt: MouseEvent) => {
                this.activateView();
            },
        );
        // Perform additional things with the ribbon
        ribbonIconEl.addClass('my-plugin-ribbon-class');

        // This adds a status bar item to the bottom of the app. Does not work on mobile apps.
        const statusBarItemEl = this.addStatusBarItem();
        statusBarItemEl.setText('Status Bar Text');

        this.addCommand({
            id: 'obsidian-intelligence-view-open',
            name: 'Open Obsidian Intelligence',
            hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'I' }],
            callback: () => {
                this.activateView();
            },
        });

        // This adds a settings tab so the user can configure various aspects of the plugin
        this.addSettingTab(new OISettingTab(this.app, this));
    }

    onunload() {}

    async loadSettings() {
        this.settings = Object.assign(
            {},
            DEFAULT_SETTINGS,
            await this.loadData(),
        );
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async activateView() {
        this.app.workspace.detachLeavesOfType(VIEW_TYPE);

        await this.app.workspace.getRightLeaf(false).setViewState({
            type: VIEW_TYPE,
            active: true,
        });

        this.app.workspace.revealLeaf(
            this.app.workspace.getLeavesOfType(VIEW_TYPE)[0],
        );
    }
}

class OISettingTab extends PluginSettingTab {
    plugin: ObsidianIntelligence;

    constructor(app: App, plugin: ObsidianIntelligence) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        new Setting(containerEl)
            .setName('OpenAI Key')
            .setDesc('Can find it https://platform.openai.com/api-keys')
            .addText((text) =>
                text
                    .setPlaceholder('Enter your API Key')
                    .setValue(this.plugin.settings.openaiKey)
                    .onChange(async (value) => {
                        this.plugin.settings.openaiKey = value;
                        await this.plugin.saveSettings();
                    }),
            );
    }
}
