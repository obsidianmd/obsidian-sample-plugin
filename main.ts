import { App, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
import { FolderSuggest } from './src/suggestions/folderSuggest';
import { renderDonateButton } from './src/components/DonateButton';

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

export default class MyPlugin extends Plugin {
  settings: MyPluginSettings;

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new BulkRenameSettingsTab(this.app, this));
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
}

type State = {
  previewScroll: number;
  filesScroll: number;
};

class BulkRenameSettingsTab extends PluginSettingTab {
  plugin: MyPlugin;
  state: State;

  constructor(app: App, plugin: MyPlugin) {
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
      .setName('Symbols in existing file name')
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
        existingFilesTextArea = text.inputEl;
        const value = getRenderedFileNames(this.plugin);
        text.setValue(value);
        text.setDisabled(true);
        const previewLabel = createPreviewElement();
        text.inputEl.insertAdjacentElement('afterend', previewLabel);
        text.inputEl.addClass('templater_cmd');
      })
      .addTextArea((text) => {
        text.setPlaceholder(
          'How filenames will looks like after replacement(click preview first)',
        );
        replacedPreviewTextArea = text.inputEl;
        const value = getRenderedFileNamesReplaced(this.plugin);
        text.setValue(value);
        text.setDisabled(true);
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
        button.onClick(() => {
          const { replacePattern, existingSymbol } = this.plugin.settings;
          if (!replacePattern || !existingSymbol) {
            return;
          }

          this.plugin.settings.fileNames.forEach((fileName) => {
            this.app.fileManager.renameFile(
              fileName,
              replaceFilePath(this.plugin, fileName),
            );
          });
        });
      });
  }

  renderSupportDevelopment() {
    renderDonateButton(this.containerEl);
  }

  calculateFiles() {
    this.plugin.settings.fileNames = [
      ...getObsidianFiles(this.app, this.plugin.settings.folderName),
    ];
  }
}

const getObsidianFiles = (app: App, folderName: string) => {
  const abstractFiles = app.vault.getAllLoadedFiles();
  const files = [] as TFile[];
  abstractFiles.forEach((file) => {
    if (file instanceof TFile && file.parent.name.includes(folderName)) {
      files.push(file);
    }
  });

  return sortByname(files);
};

const sortByname = (files: TFile[]) => {
  return files.sort((a, b) => a.name.localeCompare(b.name));
};

const getRenderedFileNames = (plugin: MyPlugin) => {
  return prepareFileNameString(plugin.settings.fileNames);
};

const prepareFileNameString = (filesNames: TFile[]) => {
  let value = '';
  filesNames.forEach((fileName, index) => {
    const isLast = index + 1 === filesNames.length;
    if (isLast) {
      return (value += fileName.path);
    }
    value += fileName.path + '\r\n';
  });
  return value;
};

const getRenderedFileNamesReplaced = (plugin: MyPlugin) => {
  const { fileNames } = plugin.settings;
  const newFiles = fileNames.map((file) => {
    return {
      ...file,
      path: replaceFilePath(plugin, file),
    };
  });

  return prepareFileNameString(newFiles);
};

const replaceFilePath = (plugin: MyPlugin, file: TFile) => {
  const { replacePattern, existingSymbol } = plugin.settings;

  return file.path.replaceAll(existingSymbol, replacePattern);
};

const createPreviewElement = (textContent = '=> => => =>') => {
  const previewLabel = window.document.createElement('span');
  previewLabel.className = 'previewLabel';
  previewLabel.textContent = textContent;
  previewLabel.style.margin = '0 20px';
  return previewLabel;
};

const syncScrolls = (
  existingFilesArea: HTMLTextAreaElement,
  previewArea: HTMLTextAreaElement,
  state: State,
) => {
  existingFilesArea.addEventListener('scroll', (event) => {
    const target = event.target as HTMLTextAreaElement;
    if (target.scrollTop !== state.previewScroll) {
      previewArea.scrollTop = target.scrollTop;
      state.previewScroll = target.scrollTop;
    }
  });
  previewArea.addEventListener('scroll', (event) => {
    const target = event.target as HTMLTextAreaElement;
    if (target.scrollTop !== state.filesScroll) {
      existingFilesArea.scrollTop = target.scrollTop;
      state.filesScroll = target.scrollTop;
    }
  });
};
