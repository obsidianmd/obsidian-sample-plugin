import { App, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';

import { FolderSuggest } from './src/suggestions/folderSuggest';
import { renderDonateButton } from './src/components/DonateButton';
import {
  getFilesNamesInDirectory,
  getRenderedFileNamesReplaced,
  renameFilesInObsidian,
  syncScrolls,
} from './src/services/file.service';
import { createPreviewElement } from './src/components/PreviewElement';
import {
  getObsidianFilesByFolderName,
  getObsidianFilesWithTagName,
} from './src/services/obsidian.service';
import { renderPreviewFiles } from './src/components/RenderPreviewFiles';

interface BulkRenamePluginSettings {
  folderName: string;
  fileNames: TFile[];
  existingSymbol: string;
  replacePattern: string;
  tags: string[];
  viewType: 'tags' | 'folder';
}

const DEFAULT_SETTINGS: BulkRenamePluginSettings = {
  folderName: '',
  fileNames: [],
  existingSymbol: '',
  replacePattern: '',
  tags: [],
  viewType: 'folder',
};

const isViewTypeFolder = ({ settings }: BulkRenamePlugin) => {
  return settings.viewType === 'folder';
};
const isViewTypeTags = ({ settings }: BulkRenamePlugin) => {
  return settings.viewType === 'tags';
};

class BulkRenamePlugin extends Plugin {
  settings: BulkRenamePluginSettings;

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new BulkRenameSettingsTab(this.app, this));
  }

  onunload() {}

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

export type State = {
  previewScroll: number;
  filesScroll: number;
};

export class BulkRenameSettingsTab extends PluginSettingTab {
  plugin: BulkRenamePlugin;
  state: State;
  filesAndPreview: Setting;

  constructor(app: App, plugin: BulkRenamePlugin) {
    super(app, plugin);
    this.state = {
      previewScroll: 0,
      filesScroll: 0,
    };

    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'Bulk Rename - Settings' });

    this.renderTabs();
    this.renderFileLocation();
    this.renderTagNames();
    this.renderReplaceSymbol();
    this.renderFilesAndPreview();
    this.renderRenameFiles();
    this.renderSupportDevelopment();
  }

  renderTabs() {
    new Setting(this.containerEl)
      .setName('toggle view')
      .addButton((button) => {
        button.setButtonText('Search by folder');
        if (isViewTypeFolder(this.plugin)) {
          button.setCta();
        }
        button.onClick(async () => {
          this.plugin.settings.viewType = 'folder';
          await this.plugin.saveSettings();
          this.display();
        });
      })
      .addButton((button) => {
        button.setButtonText('Search By Tags');
        if (isViewTypeTags(this.plugin)) {
          button.setCta();
        }
        button.onClick(async () => {
          this.plugin.settings.viewType = 'tags';
          await this.plugin.saveSettings();
          this.display();
        });
      });
  }

  renderFileLocation() {
    if (!isViewTypeFolder(this.plugin)) {
      return;
    }
    new Setting(this.containerEl)
      .setName('Folder location')
      .setDesc('Files in this folder will be available renamed.')
      .addSearch((cb) => {
        new FolderSuggest(this.app, cb.inputEl);
        cb.setPlaceholder('Example: folder1/')
          .setValue(this.plugin.settings.folderName)
          .onChange((newFolder) => {
            this.plugin.settings.folderName = newFolder;
            this.plugin.saveSettings();
            this.calculateFiles();
          });
        // @ts-ignore
        cb.containerEl.addClass('templater_search');
      })
      .addButton((button) => {
        button.setButtonText('Refresh');
        button.onClick(() => {
          this.calculateFiles();
          this.reRenderPreview();
        });
      });
  }

  renderTagNames() {
    if (!isViewTypeTags(this.plugin)) {
      return;
    }
    new Setting(this.containerEl)
      .setName('Tag names ')
      .setDesc('all files with the tags will be found')
      .addSearch((cb) => {
        // @ts-ignore
        cb.inputEl.addEventListener('keydown', (event) => {
          if (event.key !== 'Enter') {
            return;
          }
          const target = event.target as HTMLInputElement;

          this.plugin.settings.tags = target.value.replace(/ /g, '').split(',');
          this.plugin.saveSettings();
          this.getFilesByTags();
          this.reRenderPreview();
        });
        cb.setPlaceholder('Example: #tag, #tag2')
          .setValue(this.plugin.settings.tags.join(','))
          .onChange((newFolder) => {
            this.plugin.settings.tags = newFolder.replace(/ /g, '').split(',');
            this.plugin.saveSettings();
            this.getFilesByTags();
          });
        // @ts-ignore
        cb.containerEl.addClass('templater_search');
      })
      .addButton((button) => {
        button.setButtonText('Refresh');
        button.onClick(() => {
          this.getFilesByTags();
          this.reRenderPreview();
        });
      });
  }

  renderReplaceSymbol() {
    // if (isViewTypeTags(this.plugin)) {
    //   return;
    // }
    const { settings } = this.plugin;
    const desc = document.createDocumentFragment();

    const button = document.createElement('button');
    button.textContent = 'Preview';
    button.className = 'mod-cta';
    button.onclick = this.reRenderPreview;

    desc.appendChild(button);

    const newSettings = new Setting(this.containerEl)
      .setName('Existing Symbol')
      .setDesc(desc);

    // if (!isViewTypeTags(this.plugin)) {
    newSettings.addText((textComponent) => {
      textComponent.setValue(settings.existingSymbol);
      textComponent.setPlaceholder('existing symbols');
      textComponent.onChange((newValue) => {
        settings.existingSymbol = newValue;
        this.plugin.saveSettings();
      });
    });
    // }
    newSettings.addText((textComponent) => {
      const previewLabel = createPreviewElement('Replacement symbols');
      textComponent.inputEl.insertAdjacentElement('beforebegin', previewLabel);
      textComponent.setValue(settings.replacePattern);
      textComponent.setPlaceholder('replace with');
      textComponent.onChange((newValue) => {
        settings.replacePattern = newValue;
        this.plugin.saveSettings();
        this.calculateFiles();
      });
    });
  }

  renderFilesAndPreview = () => {
    this.filesAndPreview = new Setting(this.containerEl)
      .setName('Files within the folder')
      .setDesc(`Total Files: ${this.plugin.settings.fileNames.length}`);

    renderPreviewFiles(this.filesAndPreview, this.plugin, this.state);
  };

  renderRenameFiles() {
    const desc = document.createDocumentFragment();
    desc.append(
      'You are going to update all marked files and their directories',
      desc.createEl('br'),
      desc.createEl('b', {
        text: 'Warning: ',
      }),
      'This plugin in Beta, make sure you verified all files in preview',
    );

    new Setting(this.containerEl)
      .setDesc(desc)
      .setName('Replace patterns')
      .addButton((button) => {
        button.buttonEl.style.width = '100%';
        button.setTooltip(
          "We don't have undone button yet!\r\n Do we need it?",
        );
        button.setButtonText('Rename');
        button.onClick(async () => {
          button.setDisabled(true);
          await renameFilesInObsidian(this.app, this.plugin);
          this.reRenderPreview();
        });
      });
  }

  renderSupportDevelopment() {
    renderDonateButton(this.containerEl);
  }

  calculateFiles() {
    this.plugin.settings.fileNames = getObsidianFilesByFolderName(
      this.app,
      this.plugin,
    );
  }

  getFilesByTags() {
    this.plugin.settings.fileNames = getObsidianFilesWithTagName(
      this.app,
      this.plugin,
    );
  }

  reRenderPreview = () => {
    renderPreviewFiles(this.filesAndPreview, this.plugin, this.state);
  };
}

export default BulkRenamePlugin;
