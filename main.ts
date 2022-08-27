import { App, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
import { FolderSuggest } from './suggestions/folderSuggest';

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
    containerEl.createEl('h2', { text: 'General Settings' });
    this.renderFileLocation();
    this.renderReplaceSymbol();
    this.renderFilesAndPreview();
    this.renderRenameFiles();
  }

  renderReplaceSymbol() {
    const { settings } = this.plugin;
    new Setting(this.containerEl)
      .setName('Replace pattern')
      .setDesc('Files in this folder will be available renamed.')
      .addText((textComponent) => {
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
        });
      })
      .addButton((button) => {
        button.setButtonText('Preview');
        button.onClick(() => {
          this.display();
        });
      });
  }

  renderFileLocation() {
    const { settings } = this.plugin;
    new Setting(this.containerEl)
      .setName('Folder location')
      .setDesc('Files in this folder will be available renamed.')
      .addSearch((cb) => {
        new FolderSuggest(this.app, cb.inputEl);
        cb.setPlaceholder('Example: folder1/')
          .setValue(settings.folderName)
          .onChange((newFolder) => {
            settings.folderName = newFolder;
            settings.fileNames = [...getObsidianFiles(this.app, newFolder)];
            this.plugin.saveSettings();
          });
        // @ts-ignore
        cb.containerEl.addClass('templater_search');
      })
      .addButton((button) => {
        button.setButtonText('Refresh');
        button.onClick(() => {
          this.display();
        });
      });
  }
  renderFilesAndPreview() {
    const { settings } = this.plugin;
    let existingFilesTextArea: HTMLTextAreaElement;
    let replacedPreviewTextArea: HTMLTextAreaElement;
    new Setting(this.containerEl)
      .setName('files within the folder')
      .setDesc(`Total Files: ${settings.fileNames.length}`)
      .addTextArea((text) => {
        existingFilesTextArea = text.inputEl;
        const value = getRenderedFileNames(this.plugin);
        text.setValue(value);
        text.setDisabled(true);
        const previewLabel = createPreviewElement();
        text.inputEl.insertAdjacentElement('afterend', previewLabel);
        text.inputEl.addClass('templater_cmd');
      })
      .addTextArea((text) => {
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
    new Setting(this.containerEl)
      .setName('Replace pattern')
      .setDesc('Files in this folder will be available renamed.')
      .addButton((button) => {
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
      })
      .addText((cb) => {});
    this.plugin.settings.fileNames;
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

const createPreviewElement = () => {
  const previewLabel = window.document.createElement('span');
  previewLabel.className = 'previewLabel';
  previewLabel.textContent = 'Preview';
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
