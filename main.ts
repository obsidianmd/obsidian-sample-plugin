import { App, Editor, MarkdownView, Modal, Notice, ColorComponent, TextComponent, SliderComponent, Plugin, PluginSettingTab, Setting } from 'obsidian';

interface GridBackgroundSettings {
	gridSize: number;
	gridColour: string;
	gridTransparency: number;
}

const DEFAULT_SETTINGS: GridBackgroundSettings = {
  gridSize: 50,
  gridColour: 'rgba(255, 255, 255, 1)',
  gridTransparency: 0.05
};

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
          linear-gradient(to right, rgba(${this.settings.gridColour.match(/\d+, \d+, \d+/)?.[0]}, ${this.settings.gridTransparency}) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(${this.settings.gridColour.match(/\d+, \d+, \d+/)?.[0]}, ${this.settings.gridTransparency}) 1px, transparent 1px);
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

    let gridSizeSliderComponent: SliderComponent;
    let gridSizeTextComponent: TextComponent;

    let gridTransparencySliderComponent: SliderComponent;
    let gridTransparencyTextComponent: TextComponent;

    let gridColour: ColorComponent;

    const gridSizeSetting = new Setting(containerEl)
      .setName('Grid Size')
      .setDesc('Spacing between grid lines (in px) - min value is 20px, max is 100px')
      .addSlider(sliderValue => {
        gridSizeSliderComponent = sliderValue;
        sliderValue
          .setInstant(true)
          .setValue(this.plugin.settings.gridSize)
          .setLimits(20, 100, 1)
          .onChange(async (value) => {
            this.plugin.settings.gridSize = value || 20;
            gridSizeTextComponent.setValue(value.toString()); // Update the text field when slider changes
            await this.plugin.saveSettings();
          });
      })
      .addText(text => {
        gridSizeTextComponent = text;
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

            this.plugin.settings.gridSize = parsedValue;
            
            gridSizeTextComponent.setValue(parsedValue.toString());
            gridSizeSliderComponent.setValue(parsedValue); // Update the slider when text changes
            await this.plugin.saveSettings();
          })
          .inputEl.style.width = '50px'
        }
      )
      .addExtraButton(button =>
        button
          .setIcon('rotate-ccw')
          .setTooltip('Restore default')
          .onClick(async () => {
            this.plugin.settings.gridSize = DEFAULT_SETTINGS.gridSize;
            gridSizeSliderComponent.setValue(50);
            gridSizeTextComponent.setValue('50');
            await this.plugin.saveSettings();
          })
      );

    // TODO: Need to add a reset thing here
    new Setting(containerEl)
      .setName('Grid Colour')
      .setDesc('Colour of the grid lines')
      .addColorPicker(colour => {
        gridColour = colour;
        colour
          .setValue(this.plugin.settings.gridColour)
          .onChange(async (value) => {
            let rgbValue: { r: number; g: number; b: number } = colour.getValueRgb();

            const colourValue = `rgba(${rgbValue.r}, ${rgbValue.g}, ${rgbValue.b}, ${this.plugin.settings.gridTransparency})`;
            console.log(colourValue)
            this.plugin.settings.gridColour = colourValue;

            await this.plugin.saveSettings();
          })
      });

    new Setting(containerEl)
      .setName('Grid Transparency')
      .setDesc('Transparency of the grid lines on a scale of 0 (transparent) to 1 (opaque)')
      .addSlider(sliderValue => {
        gridTransparencySliderComponent = sliderValue;
        sliderValue
          .setInstant(true)
          .setValue(this.plugin.settings.gridTransparency * 100)
          .setLimits(0, 100, 1)
          .onChange(async (value) => {
            const realValue = value / 100;

            this.plugin.settings.gridTransparency = realValue;
            gridTransparencyTextComponent.setValue(realValue.toString());
            gridTransparencySliderComponent.setValue(value);

            await this.plugin.saveSettings();
          });
      })
      .addText(text => {
        gridTransparencyTextComponent = text;
        text
          .setPlaceholder('e.g. 0.05')
          .setValue(this.plugin.settings.gridTransparency.toString())
          .onChange(async (value) => {
            let parsedValue = parseInt(value) || 0.05;

            if (parsedValue < 0) {
              parsedValue = 0
              
            } else if (parsedValue > 1) {
              parsedValue = 1
            } 

            this.plugin.settings.gridTransparency = parsedValue;

            gridTransparencyTextComponent.setValue(parsedValue.toString());
            gridTransparencySliderComponent.setValue(parsedValue);
            await this.plugin.saveSettings();
          })
          .inputEl.style.width = '50px'
        }
      )
      .addExtraButton(button =>
        button
          .setIcon('rotate-ccw')
          .setTooltip('Restore default')
          .onClick(async () => {

            this.plugin.settings.gridTransparency = DEFAULT_SETTINGS.gridTransparency;
            gridTransparencyTextComponent.setValue('0.05');
            gridTransparencySliderComponent.setValue(5);

            await this.plugin.saveSettings();
          })
      );
  }
}
