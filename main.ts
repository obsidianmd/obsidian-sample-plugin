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

  public updateGridColourAlpha(alpha: number): void {
    const match = this.settings.gridColour.match(/\d+/g);
    const [r, g, b] = match ? match.slice(0, 3) : [255, 255, 255]; // Default to white if RGB values are missing
    this.settings.gridColour = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
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
    let gridColour: ColorComponent;

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
          .inputEl.style.width = '40px'
        }
      )
      .addExtraButton(button =>
        button
          .setIcon('rotate-ccw')
          .setTooltip('Restore default')
          .onClick(async () => {
            this.plugin.settings.gridSize = DEFAULT_SETTINGS.gridSize;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Grid Colour')
      .setDesc('Colour of the grid lines')
      .addColorPicker(colour => {
        gridColour = colour;
        colour
          .setValue(this.plugin.settings.gridColour)
          .onChange(async (value) => {
            this.plugin.settings.gridColour = value;
            await this.plugin.saveSettings();
          })
      });

    // BUG: This transparency setting has some bugs -> sometimes it reads a previous colour value which overrides
    // the intended colour. And sometimes the slider is off with the transparency values -> potentially a race
    // condition?

    new Setting(containerEl)
      .setName('Grid Transparency')
      .setDesc('Transparency of the grid lines')
      .addSlider(sliderValue => {
        sliderComponent = sliderValue;
        sliderValue
          .setInstant(true)
          .setValue((() => {
            const match = this.plugin.settings.gridColour.match(/\d+/g);
            if (match && match.length === 4) {
              return parseFloat(match[3]) * 100; // Extract alpha value and convert to percentage
            }
            return 5; // Default to 5% transparency if gridColour is not properly formatted
          })())
          .setLimits(0, 100, 1)
          .onChange(async (value) => {
            const alpha = (value / 100).toFixed(2); // Convert percentage back to alpha value
            this.plugin.updateGridColourAlpha(Number(alpha));
            await this.plugin.saveSettings();
          });
      })
      // TODO: Style this to reflect the current transparency value
      // .addText(text => {
      //   textComponent = text;
      //   text
      //     .setPlaceholder('e.g. 20')
      //     .setValue(this.plugin.settings.gridSize.toString())
      //     .onChange(async (value) => {
      //       let parsedValue = parseInt(value) || 20;

      //       if (parsedValue < 20) {
      //         parsedValue = 20
              
      //       } else if (parsedValue > 100) {
      //         parsedValue = 100
      //       } 

      //       textComponent.setValue(value.toString());

      //       this.plugin.settings.gridSize = parsedValue;
      //       await this.plugin.saveSettings();
      //       sliderComponent.setValue(parsedValue); // Update the slider when text changes
      //     })
      //     .inputEl.style.width = '40px'
      //   }
      // )
  }
}
