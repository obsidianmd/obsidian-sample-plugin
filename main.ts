import { App, Editor, MarkdownView, Modal, Notice, ColorComponent, TextComponent, SliderComponent, Plugin, PluginSettingTab, Setting } from 'obsidian';

interface PaperSettings {
  paperType: 'grid' | 'lined' | 'bullet';
  transparency: number;
  colour: string; // Universal colour setting
}

interface GridSettings {
  gridSize: number;
  gridColour: string;
}

interface LinedSettings {
  lineHeight: number;
  lineColour: string;
}

interface BulletSettings {
  dotSize: number;
  dotSpacing: number;
  dotColour: string;
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
    gridColour: 'rgba(255, 255, 255, 1)',
  },
  lined: {
    lineHeight: 20,
    lineColour: 'rgba(255, 255, 255, 1)',
  },
  bullet: {
    dotSize: 5,
    dotSpacing: 20,
    dotColour: 'rgba(255, 255, 255, 1)',
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
            linear-gradient(to right, rgba(${validColour.match(/\d+, \d+, \d+/)?.[0]}, ${transparency}) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(${validColour.match(/\d+, \d+, \d+/)?.[0]}, ${transparency}) 1px, transparent 1px);
          background-size: ${gridSize}px ${gridSize}px;
        }
      `;
    } else if (paperType === 'lined') {
      const { lineHeight } = this.settings.lined;
      cssContent = `
        .markdown-source-view,
        .markdown-preview-view {
          background-image: linear-gradient(to bottom, rgba(${validColour.match(/\d+, \d+, \d+/)?.[0]}, ${transparency}) 1px, transparent ${lineHeight - 1}px);
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
    containerEl.createEl('h2', { text: 'Paper Background Settings' });

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
            this.display(); // Refresh settings UI
          });
      });

    // Universal Transparency Setting
    new Setting(containerEl)
      .setName('Transparency')
      .setDesc('Set the transparency level (0 to 1)')
      .addSlider(slider => {
        slider
          .setLimits(0, 1, 0.01)
          .setValue(this.plugin.settings.paper.transparency)
          .onChange(async (value) => {
            this.plugin.settings.paper.transparency = value;
            await this.plugin.saveSettings();
          });
      });

    // Universal Colour Setting
    new Setting(containerEl)
      .setName('Universal Colour')
      .setDesc('Set the colour for the paper background (RGBA)')
      .addText(text => {
        text
          .setValue(this.plugin.settings.paper.colour)
          .onChange(async (value) => {
            this.plugin.settings.paper.colour = value;
            await this.plugin.saveSettings();
          });
      });

    // Specific Settings Based on Paper Type
    if (this.plugin.settings.paper.paperType === 'grid') {
      new Setting(containerEl)
        .setName('Grid Size')
        .setDesc('Set the size of the grid (in px)')
        .addSlider(slider => {
          slider
            .setLimits(20, 100, 1)
            .setValue(this.plugin.settings.grid.gridSize)
            .onChange(async (value) => {
              this.plugin.settings.grid.gridSize = value;
              await this.plugin.saveSettings();
            });
        });
    } else if (this.plugin.settings.paper.paperType === 'lined') {
      new Setting(containerEl)
        .setName('Line Height')
        .setDesc('Set the height between lines (in px)')
        .addSlider(slider => {
          slider
            .setLimits(10, 50, 1)
            .setValue(this.plugin.settings.lined.lineHeight)
            .onChange(async (value) => {
              this.plugin.settings.lined.lineHeight = value;
              await this.plugin.saveSettings();
            });
        });
    } else if (this.plugin.settings.paper.paperType === 'bullet') {
      new Setting(containerEl)
        .setName('Dot Size')
        .setDesc('Set the size of the dots (in px)')
        .addSlider(slider => {
          slider
            .setLimits(2, 10, 1)
            .setValue(this.plugin.settings.bullet.dotSize)
            .onChange(async (value) => {
              this.plugin.settings.bullet.dotSize = value;
              await this.plugin.saveSettings();
            });
        });

      new Setting(containerEl)
        .setName('Dot Spacing')
        .setDesc('Set the spacing between dots (in px)')
        .addSlider(slider => {
          slider
            .setLimits(10, 50, 1)
            .setValue(this.plugin.settings.bullet.dotSpacing)
            .onChange(async (value) => {
              this.plugin.settings.bullet.dotSpacing = value;
              await this.plugin.saveSettings();
            });
        });
    }
  }
}
