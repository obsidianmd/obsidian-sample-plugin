import { App, Editor, MarkdownView, Modal, Notice, ColorComponent, TextComponent, SliderComponent, Plugin, PluginSettingTab, Setting } from 'obsidian';

interface PaperSettings {
  paperType: 'grid' | 'lined' | 'bullet';
  transparency: number;
  colour: string; // Universal colour setting
}

interface GridSettings {
  gridSize: number;
}

interface LinedSettings {
  lineHeight: number;
}

interface BulletSettings {
  dotSize: number;
  dotSpacing: number;
}

interface PluginSettings {
  paper: PaperSettings;
  grid: GridSettings;
  lined: LinedSettings;
  bullet: BulletSettings;
}

const DEFAULT_SETTINGS: PluginSettings = {
  paper: {
    paperType: 'grid',
    transparency: 0.05,
    colour: 'rgba(255, 255, 255, 1)',
  },
  grid: {
    gridSize: 50,  
  },
  lined: {
    lineHeight: 20,
  },
  bullet: {
    dotSize: 5,
    dotSpacing: 20,
  },
};

export default class GridBackgroundPlugin extends Plugin {
  settings: PluginSettings;

  async onload() {
    await this.loadSettings();
    this.injectCSS();
    this.addSettingTab(new GridBackgroundSettingTab(this.app, this));
  }

  onunload() {
    const style = document.getElementById('paper-background-style');
    style?.remove();
  }

  injectCSS() {
    const style = document.createElement('style');
    style.id = 'paper-background-style';

    let cssContent = '';
    const { paperType, transparency, colour } = this.settings.paper;

    // Ensure colour is valid and fallback to default if undefined or invalid
    const validColour = colour && colour.match(/\d+, \d+, \d+/) ? colour : 'rgba(255, 255, 255, 1)';

    if (paperType === 'grid') {
      const { gridSize } = this.settings.grid;
      cssContent = `
        .markdown-source-view,
        .markdown-preview-view {
          background-image: 
            linear-gradient(to right, transparent ${gridSize - 1}px, rgba(${validColour.match(/\d+, \d+, \d+/)?.[0]}, ${transparency}) 1px),
            linear-gradient(to bottom, transparent ${gridSize - 1}px, rgba(${validColour.match(/\d+, \d+, \d+/)?.[0]}, ${transparency}) 1px);
          background-size: ${gridSize}px ${gridSize}px;
        }
      `;
    } else if (paperType === 'lined') {
      const { lineHeight } = this.settings.lined;
      cssContent = `
        .markdown-source-view,
        .markdown-preview-view {
          background-image: repeating-linear-gradient(
            to bottom,
            rgba(${validColour.match(/\d+, \d+, \d+/)?.[0]}, ${transparency}) 0px,
            rgba(${validColour.match(/\d+, \d+, \d+/)?.[0]}, ${transparency}) 1px,
            transparent 1px,
            transparent ${lineHeight}px
          );
        }
      `;
    } else if (paperType === 'bullet') {
      const { dotSize, dotSpacing } = this.settings.bullet;
      cssContent = `
        .markdown-source-view,
        .markdown-preview-view {
          background-image: radial-gradient(circle, rgba(${validColour.match(/\d+, \d+, \d+/)?.[0]}, ${transparency}) ${dotSize}px, transparent ${dotSize}px);
          background-size: ${dotSpacing}px ${dotSpacing}px;
        }
      `;
    }

    style.textContent = cssContent;
    document.head.appendChild(style);
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.onunload();
    this.injectCSS();
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
    containerEl.createEl('h2', { text: 'Bookify Settings' });

    let pageColour: ColorComponent;
    let transparencySliderComponent: SliderComponent;
    let transparencyTextComponent: TextComponent;

    let gridSizeSliderComponent: SliderComponent;
    let gridSizeTextComponent: TextComponent;

    let lineHeightSliderComponent: SliderComponent;
    let lineHeightTextComponent: TextComponent;

    let dotSizeSliderComponent: SliderComponent;
    let dotSizeTextComponent: TextComponent;

    let dotSpacingSliderComponent: SliderComponent;
    let dotSpacingTextComponent: TextComponent;

    // Paper Type Selection
    new Setting(containerEl)
      .setName('Paper Type')
      .setDesc('Select the type of paper background')
      .addDropdown(dropdown => {
        dropdown
          .addOption('grid', 'Grid')
          .addOption('lined', 'Lined')
          .addOption('bullet', 'Bullet Journal')
          .setValue(this.plugin.settings.paper.paperType)
          .onChange(async (value) => {
            this.plugin.settings.paper.paperType = value as 'grid' | 'lined' | 'bullet';
            await this.plugin.saveSettings();
            this.display();
          });
      });

    // Universal Colour Setting
    new Setting(containerEl)
      .setName('Universal Colour')
      .setDesc('Set the colour for the lines/dots/grids')
      .addColorPicker(colour => {
        pageColour = colour;
        colour
          .setValue(this.plugin.settings.paper.colour)
          .onChange(async (value) => {
            let rgbValue: { r: number; g: number; b: number } = colour.getValueRgb();

            const colourValue = `rgba(${rgbValue.r}, ${rgbValue.g}, ${rgbValue.b}, ${this.plugin.settings.paper.transparency})`;
            console.log(colourValue)
            this.plugin.settings.paper.colour = colourValue;

            await this.plugin.saveSettings();
          })
      });

    // Universal Transparency Setting
    new Setting(containerEl)
      .setName('Universal Transparency')
      .setDesc('Set the transparency level on a scale of 0 (transparent) to 1 (opaque)')
      .addSlider(slider => {
        transparencySliderComponent = slider;
        slider
          .setInstant(true)
          .setLimits(0, 1, 0.01)
          .setValue(this.plugin.settings.paper.transparency)
          .onChange(async (value) => {
            this.plugin.settings.paper.transparency = value;
            transparencySliderComponent.setValue(value);
            transparencyTextComponent.setValue(value.toString());

            await this.plugin.saveSettings();
          });
      })
      .addText(text => {
        transparencyTextComponent = text;
        text
          .setPlaceholder('e.g. 0.05')
          .setValue(this.plugin.settings.paper.transparency.toString())
          .onChange(async (value) => {
            let parsedValue = parseInt(value) || 0.05;

            if (parsedValue < 0) {
              parsedValue = 0
              
            } else if (parsedValue > 1) {
              parsedValue = 1
            } 

            this.plugin.settings.paper.transparency = parsedValue;

            transparencyTextComponent.setValue(parsedValue.toString());
            transparencySliderComponent.setValue(parsedValue);
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

            this.plugin.settings.paper.transparency = DEFAULT_SETTINGS.paper.transparency;
            transparencyTextComponent.setValue('0.05');
            transparencySliderComponent.setValue(0.05);

            await this.plugin.saveSettings();
          })
      );

    // Specific Settings Based on Paper Type
    if (this.plugin.settings.paper.paperType === 'grid') {
      new Setting(containerEl)
        .setName('Grid Size')
        .setDesc('Set the size of the grid (in px) - min value is 20px, max is 100px')
        .addSlider(slider => {
          gridSizeSliderComponent = slider;
          slider
            .setInstant(true)
            .setLimits(20, 100, 1)
            .setValue(this.plugin.settings.grid.gridSize)
            .onChange(async (value) => {
              this.plugin.settings.grid.gridSize = value || 20;
              gridSizeTextComponent.setValue(value.toString());
              await this.plugin.saveSettings();
            });
        })
        .addText(text => {
          gridSizeTextComponent = text;
          text
            .setPlaceholder('e.g. 20')
            .setValue(this.plugin.settings.grid.gridSize.toString())
            .onChange(async (value) => {
              let parsedValue = parseInt(value) || 20;
  
              if (parsedValue < 20) {
                parsedValue = 20
                
              } else if (parsedValue > 100) {
                parsedValue = 100
              } 
  
              this.plugin.settings.grid.gridSize = parsedValue;
              
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
              this.plugin.settings.grid.gridSize = DEFAULT_SETTINGS.grid.gridSize;
              gridSizeSliderComponent.setValue(50);
              gridSizeTextComponent.setValue('50');
              await this.plugin.saveSettings();
            })
        );

    } else if (this.plugin.settings.paper.paperType === 'lined') {
      new Setting(containerEl)
        .setName('Line Height')
        .setDesc('Set the height between lines (in px) - min value is 20px, max is 100')
        .addSlider(slider => {
          lineHeightSliderComponent = slider;
          slider
            .setInstant(true)
            .setLimits(20, 100, 1)
            .setValue(this.plugin.settings.lined.lineHeight)
            .onChange(async (value) => {
              this.plugin.settings.lined.lineHeight = value;
              lineHeightSliderComponent.setValue(value);
              lineHeightTextComponent.setValue(value.toString());
              await this.plugin.saveSettings();
            });
        })
        .addText(text => {
        lineHeightTextComponent = text;
        text
          .setPlaceholder('e.g. 20')
          .setValue(this.plugin.settings.lined.lineHeight.toString())
          .onChange(async (value) => {
            let parsedValue = parseInt(value) || 20;


            if (parsedValue < 0) {
              parsedValue = 20
              
            } else if (parsedValue > 100) {
              parsedValue = 100
            } 

            this.plugin.settings.lined.lineHeight = parsedValue;

            lineHeightTextComponent.setValue(parsedValue.toString());
            lineHeightSliderComponent.setValue(parsedValue);
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

            this.plugin.settings.lined.lineHeight = DEFAULT_SETTINGS.lined.lineHeight;
            lineHeightTextComponent.setValue('20');
            lineHeightSliderComponent.setValue(20);

            await this.plugin.saveSettings();
          })
      );

    } else if (this.plugin.settings.paper.paperType === 'bullet') {
      new Setting(containerEl)
        .setName('Dot Size')
        .setDesc('Set the size of the dots (in px) - min value is 1px, max is 10px. ' +
          'Additionally, set to a whole number for cirle dots, and a number ending in 0.5 for square dots'
        )
        .addSlider(slider => {
          dotSizeSliderComponent = slider;
          slider
            .setInstant(true)
            .setLimits(1, 10, 0.5)
            .setValue(this.plugin.settings.bullet.dotSize)
            .onChange(async (value) => {
              this.plugin.settings.bullet.dotSize = value || 5;

              dotSizeSliderComponent.setValue(value);
              dotSizeTextComponent.setValue(value.toString());
              await this.plugin.saveSettings();
            });
        })
        .addText(text => {
          dotSizeTextComponent = text;
          text
            .setPlaceholder('e.g. 5')
            .setValue(this.plugin.settings.bullet.dotSize.toString())
            .onChange(async (value) => {
              let parsedValue = parseInt(value);
  
              if (parsedValue < 1) {
                parsedValue = 1
                
              } else if (parsedValue > 10) {
                parsedValue = 10
              } 

              this.plugin.settings.grid.gridSize = parsedValue;
              
              dotSizeTextComponent.setValue(parsedValue.toString());
              dotSizeSliderComponent.setValue(parsedValue);
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
              this.plugin.settings.grid.gridSize = DEFAULT_SETTINGS.bullet.dotSize;
              dotSizeSliderComponent.setValue(5);
              dotSizeTextComponent.setValue('5');
              await this.plugin.saveSettings();
            })
        );

      new Setting(containerEl)
        .setName('Dot Spacing')
        .setDesc(
          'Set the spacing between dots (in px) - min value is 10px, max is 50px.')
        .addSlider(slider => {
          dotSpacingSliderComponent = slider;
          slider
            .setInstant(true)
            .setLimits(10, 50, 1)
            .setValue(this.plugin.settings.bullet.dotSpacing)
            .onChange(async (value) => {
              this.plugin.settings.bullet.dotSpacing = value || 20;

              dotSpacingSliderComponent.setValue(value);
              dotSpacingTextComponent.setValue(value.toString());
              await this.plugin.saveSettings();
            });
        })
        .addText(text => {
          dotSpacingTextComponent = text;
          text
            .setPlaceholder('e.g. 5')
            .setValue(this.plugin.settings.bullet.dotSize.toString())
            .onChange(async (value) => {
              let parsedValue = parseInt(value) || 20;

              if (parsedValue < 20) {
                parsedValue = 20
                
              } else if (parsedValue > 50) {
                parsedValue = 50
              } 
  
              this.plugin.settings.bullet.dotSpacing = parsedValue;
              
              dotSpacingTextComponent.setValue(parsedValue.toString());
              dotSpacingSliderComponent.setValue(parsedValue);
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
              this.plugin.settings.bullet.dotSpacing = DEFAULT_SETTINGS.bullet.dotSpacing;
              dotSpacingSliderComponent.setValue(20);
              dotSpacingTextComponent.setValue('20');
              await this.plugin.saveSettings();
            })
        );
    }
  }
}
