import { App, PluginSettingTab, Setting } from "obsidian";
import ChessMatePlugin from "./main";
import { t } from "./lang/helper";

export interface ChessMateSettings {
    boardTheme: string;
    pieceTheme: string;
    showMoves: boolean;
	accentColor: string;
    boardSize: number;
}

export const DEFAULT_SETTINGS: ChessMateSettings = {
    boardTheme: 'brown',
    pieceTheme: 'cburnett',
    showMoves: true,
	accentColor: "#ffeac3",
    boardSize: 600
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
            .setName(t('settings.boardTheme'))
            .setDesc(t('settings.boardThemeDesc'))
            .addText(text => text
                .setValue(this.plugin.settings.boardTheme)
                .onChange(async (value) => {
                    this.plugin.settings.boardTheme = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName(t('settings.pieceTheme'))
            .setDesc(t('settings.pieceThemeDesc'))
            .addDropdown(dropdown => dropdown
                .addOptions({
                    cburnett: 'Cburnett',
                    alpha: 'Alpha',
                    classic: 'Classic'
                })
                .setValue(this.plugin.settings.pieceTheme)
                .onChange(async (value) => {
                    this.plugin.settings.pieceTheme = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName(t('settings.showMoves'))
            .setDesc(t('settings.showMovesDesc'))
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showMoves)
                .onChange(async (value) => {
                    this.plugin.settings.showMoves = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName(t('settings.boardSize'))
            .setDesc(t('settings.boardSizeDesc'))
            .addSlider(slider => slider
                .setLimits(200, 800, 50)
                .setValue(this.plugin.settings.boardSize)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.boardSize = value;
                    await this.plugin.saveSettings();
                }));
    }
} 
