import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { AppView, INTELLIGENCE_VIEW_TYPE } from './src/ui/AppView';
import OpenAI from 'openai';
import { IThread } from './src/ui/types';

interface IntelligenceSettings {
    openaiKey: string;
    threads: IThread[];
    activeThread: IThread | undefined;
    activeAssistant: OpenAI.Beta.Assistant | undefined;
    activeAssistantFiles: OpenAI.Files.FileObject[] | undefined;
}

const DEFAULT_SETTINGS: IntelligenceSettings = {
    openaiKey: '',
    threads: [],
    activeThread: undefined,
    activeAssistant: undefined,
    activeAssistantFiles: undefined,
};

export default class Intelligence extends Plugin {
    settings: IntelligenceSettings;
    view: AppView;

    async onload() {
        await this.loadSettings();
        this.registerView(INTELLIGENCE_VIEW_TYPE, (leaf) => new AppView(leaf, this));

        this.addCommand({
            id: 'intelligence-view-open',
            name: 'Open Intelligence',
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
        
        if (this.app.workspace.getLeavesOfType(INTELLIGENCE_VIEW_TYPE).length > 0) {
            this.revealView();
            return;
        }
        await this.app.workspace.getRightLeaf(false).setViewState({
            type: INTELLIGENCE_VIEW_TYPE,
            active: true,
        });
        this.revealView();
    }

    async revealView() {
        this.app.workspace.revealLeaf(
            this.app.workspace.getLeavesOfType(INTELLIGENCE_VIEW_TYPE)[0],
        );
    }
}

class OISettingTab extends PluginSettingTab {
    plugin: Intelligence;

    constructor(app: App, plugin: Intelligence) {
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
