import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

interface GridBackgroundSettings {
	gridSize: number;
	gridColour: string;
}

const DEFAULT_SETTINGS: GridBackgroundSettings = {
  gridSize: 50,
  gridColour: 'rgba(255, 255, 255, 0.05)'
}

export default class GridBackgroundPlugin extends Plugin {
	settings: GridBackgroundSettings;

	async onload() {
		await this.loadSettings();

    this.injectGridCSS();
    this.addSettingTab(new GridBackgroundSettingTab(this.app, this));

	}

	onunload() {
    const style = document.getElementById('grid-background-style');
    style?.remove();
	}

  injectGridCSS() {
    const style = document.createElement('style');
    style.id = 'grid-background-style';
    style.textContent = `
      .markdown-source-view,
      .markdown-preview-view {
        background-image: 
          linear-gradient(to right, ${this.settings.gridColour} 1px, transparent 1px),
          linear-gradient(to bottom, ${this.settings.gridColour} 1px, transparent 1px);
        background-size: ${this.settings.gridSize}px ${this.settings.gridSize}px;
      }
    `;
    document.head.appendChild(style);
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.onunload();
    this.injectGridCSS();
  }
}

class GridBackgroundSettingTab extends PluginSettingTab {
	plugin: GridBackgroundPlugin;

	constructor(app: App, plugin: GridBackgroundPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'Grid Background Settings' });

    new Setting(containerEl)
      .setName('Grid Size')
      .setDesc('Spacing between grid lines (in px)')
      .addText(text =>
        text
          .setPlaceholder('e.g. 20')
          .setValue(this.plugin.settings.gridSize.toString())
          .onChange(async (value) => {
            this.plugin.settings.gridSize = parseInt(value) || 20;
            await this.plugin.saveSettings();
          }));

    new Setting(containerEl)
      .setName('Grid Colour')
      .setDesc('Colour of the grid lines (rgba or hex)')
      .addText(text =>
        text
          .setPlaceholder('e.g. rgba(0,0,0,0.05)')
          .setValue(this.plugin.settings.gridColour)
          .onChange(async (value) => {
            this.plugin.settings.gridColour = value;
            await this.plugin.saveSettings();
          }));
  }
}
