import {
  App,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
} from 'obsidian';
import { FolderSuggest } from './src/suggestions/folderSuggest';
import { renderDonateButton } from './src/components/DonateButton';
import {
  getFilesNamesInDirectory,
  getObsidianFiles,
  getRenderedFileNamesReplaced,
  renameFilesInObsidian,
  syncScrolls,
} from './src/services/file.service';
import { createPreviewElement } from './src/components/PreviewElement';

interface MyPluginSettings {
  folderName: string;
  fileNames: TFile[];
  existingSymbol: string;
  replacePattern: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
  folderName: '',
  fileNames: [],
  existingSymbol: '',
  replacePattern: '',
};

class BulkRenamePlugin extends Plugin {
  settings: MyPluginSettings;

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new BulkRenameSettingsTab(this.app, this));

    // this.app.vault.on('rename', (file, oldPath) => {
    // });
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

class BulkRenameSettingsTab extends PluginSettingTab {
  plugin: BulkRenamePlugin;
  state: State;

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

    this.renderFileLocation();
    this.renderReplaceSymbol();
    this.renderFilesAndPreview();
    this.renderRenameFiles();
    this.renderSupportDevelopment();
  }

  renderReplaceSymbol() {
    const { settings } = this.plugin;
    const desc = document.createDocumentFragment();

    const button = document.createElement('button');
    button.textContent = 'Preview';
    button.className = 'mod-cta';
    button.onclick = () => {
      this.display();
    };

    desc.appendChild(button);

    new Setting(this.containerEl)
      .setName('Existing Symbol')
      .setDesc(desc)
      .addText((textComponent) => {
        const previewLabel = createPreviewElement('Replacement symbols');
        textComponent.inputEl.insertAdjacentElement('afterend', previewLabel);
        textComponent.setValue(settings.existingSymbol);
        textComponent.setPlaceholder('existing symbols');
        textComponent.onChange((newValue) => {
          settings.existingSymbol = newValue;
          this.plugin.saveSettings();
        });
      })
      .addText((textComponent) => {
        textComponent.setValue(settings.replacePattern);
        textComponent.setPlaceholder('replace with');
        textComponent.onChange((newValue) => {
          settings.replacePattern = newValue;
          this.plugin.saveSettings();
          this.calculateFiles();
        });
      });
  }

  renderFileLocation() {
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
          this.display();
        });
      });
  }

  renderFilesAndPreview() {
    let existingFilesTextArea: HTMLTextAreaElement;
    let replacedPreviewTextArea: HTMLTextAreaElement;
    new Setting(this.containerEl)
      .setName('Files within the folder')
      .setDesc(`Total Files: ${this.plugin.settings.fileNames.length}`)
      .addTextArea((text) => {
        text.setPlaceholder('Here you will see files under folder location');
        text.setDisabled(true);
        existingFilesTextArea = text.inputEl;

        const value = getFilesNamesInDirectory(this.plugin);
        text.setValue(value);

        const previewLabel = createPreviewElement();
        text.inputEl.insertAdjacentElement('afterend', previewLabel);
        text.inputEl.addClass('templater_cmd');
      })
      .addTextArea((text) => {
        text.setPlaceholder(
          'How filenames will looks like after replacement(click preview first)',
        );
        text.setDisabled(true);

        replacedPreviewTextArea = text.inputEl;
        const value = getRenderedFileNamesReplaced(this.plugin);
        text.setValue(value);
        text.inputEl.addClass('templater_cmd');
      })
      .then((setting) => {
        syncScrolls(existingFilesTextArea, replacedPreviewTextArea, this.state);
      });
  }

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
        button.setTooltip("FYI: We don't have undone button yet!");
        button.setButtonText('Rename');
        button.onClick(async () => {
          button.setDisabled(true);
          renameFilesInObsidian(this.app, this.plugin);
          this.display();
        });
      });
  }

  renderSupportDevelopment() {
    renderDonateButton(this.containerEl);
  }

  calculateFiles() {
    this.plugin.settings.fileNames = getObsidianFiles(this.app, this.plugin);
  }
}

export default BulkRenamePlugin;
