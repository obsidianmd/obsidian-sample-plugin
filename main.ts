import { App, Editor, MarkdownView, Modal, Notice, ColorComponent, TextComponent, SliderComponent, Plugin, PluginSettingTab, Setting } from 'obsidian';

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
	sliderGridSize: SliderComponent;

	constructor(app: App, plugin: GridBackgroundPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'Grid Background Settings' });

    let sliderComponent: SliderComponent;
    let textComponent: TextComponent;

    const gridSizeSetting = new Setting(containerEl)
      .setName('Grid Size')
      .setDesc('Spacing between grid lines (in px) - min value is 20px, max is 100px')
      .addSlider(sliderValue => {
        sliderComponent = sliderValue;
        sliderValue
          .setInstant(true)
          .setValue(this.plugin.settings.gridSize)
          .setLimits(20, 100, 1)
          .onChange(async (value) => {
            this.plugin.settings.gridSize = value || 20;
            await this.plugin.saveSettings();
            textComponent.setValue(value.toString()); // Update the text field when slider changes
          });
      })
      .addText(text => {
        textComponent = text;
        text
          .setPlaceholder('e.g. 20')
          .setValue(this.plugin.settings.gridSize.toString())
          .onChange(async (value) => {
            let parsedValue = parseInt(value) || 20;

            if (parsedValue < 20) {
              parsedValue = 20
              
            } else if (parsedValue > 100) {
              parsedValue = 100
            } 

            textComponent.setValue(value.toString());

            this.plugin.settings.gridSize = parsedValue;
            await this.plugin.saveSettings();
            sliderComponent.setValue(parsedValue); // Update the slider when text changes
          })
        }
      )
      .addButton(button =>
        button
          .setButtonText('Reset')
          .setCta()
          .onClick(async () => {
            this.plugin.settings.gridSize = DEFAULT_SETTINGS.gridSize;
            await this.plugin.saveSettings();
          })
      );

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
