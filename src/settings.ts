import { App, PluginSettingTab, Setting } from "obsidian";
import ChessMatePlugin from "./main";
import { t } from "./lang/helper";

export interface ChessMateSettings {
    boardColor: string;
    maxBoardSize: number;
}

export const DEFAULT_SETTINGS: ChessMateSettings = {
    boardColor: '#f0d9b5',
    maxBoardSize: 800
};

export class ChessMateSettingTab extends PluginSettingTab {
    plugin: ChessMatePlugin;

    constructor(app: App, plugin: ChessMatePlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: t('settings.title') });

        new Setting(containerEl)
            .setName(t('settings.boardColor'))
            .setDesc(t('settings.boardColorDesc'))
            .addText(text => text
                .setValue(this.plugin.settings.boardColor)
                .onChange(async (value) => {
                    this.plugin.settings.boardColor = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName(t('settings.maxBoardSize'))
            .setDesc(t('settings.maxBoardSizeDesc'))
            .addSlider(slider => slider
                .setLimits(200, 800, 50)
                .setValue(this.plugin.settings.maxBoardSize)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.maxBoardSize = value;
                    await this.plugin.saveSettings();
                }));
    }
} 
