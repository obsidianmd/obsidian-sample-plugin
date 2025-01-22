import * as React from 'react';
import { App, Plugin, WorkspaceLeaf, addIcon, PluginSettingTab, Setting } from 'obsidian';
import { createRoot, Root } from 'react-dom/client';
import { ClipperCatalogView, VIEW_TYPE_CLIPPER_CATALOG } from './ClipperCatalogView';

interface ObsidianClipperCatalogSettings {
  sourcePropertyName: string;
}

// Add this before the ObsidianClipperCatalog class definition
export const ICON_NAME = 'clipper-catalog';

const DEFAULT_SETTINGS: ObsidianClipperCatalogSettings = {
  sourcePropertyName: 'source'
}

export default class ObsidianClipperCatalog extends Plugin {
  settings: ObsidianClipperCatalogSettings;

  async onload() {
    await this.loadSettings();

    // Register the custom icon
    addIcon(ICON_NAME, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5"/>
      <line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" stroke-width="1"/>
      <line x1="3" y1="15" x2="21" y2="15" stroke="currentColor" stroke-width="1"/>
      <line x1="7" y1="3" x2="7" y2="21" stroke="currentColor" stroke-width="1"/>
      </svg>`);
    
    this.registerView(
      VIEW_TYPE_CLIPPER_CATALOG,
      (leaf: WorkspaceLeaf) => new ClipperCatalogView(leaf, this)
    );
  
    // Add ribbon icon
    this.addRibbonIcon(ICON_NAME, 'Clipper Catalog', (evt: MouseEvent) => {
      // Get active leaf or create new one in center
      const leaf = this.app.workspace.getLeaf('tab');
      if (leaf) {
        leaf.setViewState({
          type: VIEW_TYPE_CLIPPER_CATALOG,
          active: true
        });
        this.app.workspace.revealLeaf(leaf);
      }
    });


    this.addCommand({
      id: 'show-all-clippings',
      name: 'Show All Clippings',
      callback: () => {
        // Get active leaf or create new one in center
        const leaf = this.app.workspace.getLeaf('tab');
        if (leaf) {
          leaf.setViewState({
            type: VIEW_TYPE_CLIPPER_CATALOG,
            active: true,
          });
          this.app.workspace.revealLeaf(leaf);
        }
      }
    });

    this.addSettingTab(new ClipperCatalogSettingTab(this.app, this));
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class ClipperCatalogSettingTab extends PluginSettingTab {
  plugin: ObsidianClipperCatalog;
  settingsHeaderEl: HTMLDivElement;
  settingsHeaderContentEl: HTMLDivElement;
  advancedSettingsEl: HTMLDetailsElement;
  advancedContentEl: HTMLDivElement;

  constructor(app: App, plugin: ObsidianClipperCatalog) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const {containerEl} = this;
    containerEl.empty();
    containerEl.addClass('clipper-catalog-plugin');
    containerEl.addClass('clipper-catalog-settings');

    // Create Header section using <div> element
    this.settingsHeaderEl = containerEl.createEl('div', {
      cls: 'settings-title',
    });
    
    const settingsHeader = this.settingsHeaderEl.createEl('div', {
        cls: 'settings-clipper-catalog-name',
        text: 'Clipper Catalog Settings'
    });

    // Create a container for advanced settings content
    this.settingsHeaderContentEl = this.settingsHeaderEl.createEl('div', {
      cls: 'advanced-settings-name'
    });

    new Setting(containerEl)
    .setName('Property Name')
    .setDesc('Specify which frontmatter property contains your clipped URLs (e.g., "source", "url", "link").')
    .addText(text => text
      .setValue(this.plugin.settings.sourcePropertyName)
      .onChange(async (value) => {
        this.plugin.settings.sourcePropertyName = value;
        await this.plugin.saveSettings();
      }));
  }
}