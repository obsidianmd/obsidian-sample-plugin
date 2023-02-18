import {
  App,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
  Platform,
} from 'obsidian';

import { FolderSuggest } from './src/suggestions/folderSuggest';
import { renderDonateButton } from './src/components/DonateButton';
import { renameFilesInObsidian } from './src/services/file.service';
import { createPreviewElement } from './src/components/PreviewElement';
import {
  getObsidianFilesByFolderName,
  getObsidianFilesByRegExp,
  getObsidianFilesWithTagName,
} from './src/services/obsidian.service';
import { renderPreviewFiles } from './src/components/RenderPreviewFiles';
import { createBackslash } from './src/components/RegExpBackslash';
import { RegExpFlag } from './src/constants/RegExpFlags';
import { RegExpFlagsSuggest } from './src/suggestions/RegExpFlagsSuggest';
import {
  isViewTypeRegExp,
  isViewTypeFolder,
  isViewTypeTags,
} from './src/services/settings.service';

export interface BulkRenamePluginSettings {
  folderName: string;
  fileNames: TFile[];
  existingSymbol: string;
  replacePattern: string;
  tags: string[];
  regExpState: {
    regExp: string;
    withRegExpForReplaceSymbols: boolean;
    flags: RegExpFlag[];
  };
  viewType: 'tags' | 'folder' | 'regexp';
}

const DEFAULT_SETTINGS: BulkRenamePluginSettings = {
  folderName: '',
  fileNames: [],
  existingSymbol: '',
  replacePattern: '',
  regExpState: {
    regExp: '',
    flags: [],
    withRegExpForReplaceSymbols: false,
  },
  tags: [],
  viewType: 'folder',
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
  totalFiles: HTMLSpanElement;

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
    containerEl.createEl('h1', { text: 'Bulk Rename - Settings' });
    containerEl.addEventListener('keyup', (event) => {
      if (event.key !== 'Enter') {
        return;
      }

      this.reRenderPreview();
    });

    this.containerEl.addClass('bulk_rename_plugin');
    this.renderTabs();
    this.renderFileLocation();
    this.renderTagNames();
    this.renderRegExpInput();
    this.renderReplaceSymbol();
    this.renderFilesAndPreview();
    this.renderRenameFiles();
    this.renderSupportDevelopment();
  }

  renderTabs() {
    new Setting(this.containerEl)
      .setName('Search by: ')
      .addButton((button) => {
        button.setButtonText('Folder');
        if (isViewTypeFolder(this.plugin.settings)) {
          button.setCta();
        }
        button.onClick(async () => {
          this.plugin.settings.viewType = 'folder';
          await this.plugin.saveSettings();
          this.display();
        });
      })
      .addButton((button) => {
        button.setButtonText('Tags');
        if (isViewTypeTags(this.plugin.settings)) {
          button.setCta();
        }
        button.onClick(async () => {
          this.plugin.settings.viewType = 'tags';
          await this.plugin.saveSettings();
          this.display();
        });
      })
      .addButton((button) => {
        button.setButtonText('RegExp');
        if (isViewTypeRegExp(this.plugin.settings)) {
          button.setCta();
        }
        button.onClick(async () => {
          this.plugin.settings.viewType = 'regexp';
          await this.plugin.saveSettings();
          this.display();
        });
      });
  }

  renderFileLocation() {
    if (!isViewTypeFolder(this.plugin.settings)) {
      return;
    }
    new Setting(this.containerEl).setName('Folder location').addSearch((cb) => {
      new FolderSuggest(this.app, cb.inputEl, this.plugin);
      cb.setPlaceholder('Example: folder1/')
        .setValue(this.plugin.settings.folderName)
        .onChange((newFolder) => {
          this.plugin.settings.folderName = newFolder;
          this.plugin.saveSettings();
          this.getFilesByFolder();
        });
      // @ts-ignore
      cb.containerEl.addClass('bulk_rename');
      cb.inputEl.addClass('bulk_input');
      cb.inputEl.onblur = this.reRenderPreview;
    });
  }

  renderTagNames() {
    if (!isViewTypeTags(this.plugin.settings)) {
      return;
    }

    new Setting(this.containerEl).setName('Tag names ').addSearch((cb) => {
      cb.inputEl.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') {
          return;
        }
        const target = event.target as HTMLInputElement;

        this.plugin.settings.tags = target.value.replace(/ /g, '').split(',');
        this.plugin.saveSettings();
      });
      cb.setPlaceholder('Example: #tag, #tag2')
        .setValue(this.plugin.settings.tags.join(','))
        .onChange((newFolder) => {
          this.plugin.settings.tags = newFolder.replace(/ /g, '').split(',');
          this.plugin.saveSettings();
          this.getFilesByTags();
        });
      // @ts-ignore
      cb.containerEl.addClass('bulk_rename');
      cb.inputEl.addClass('bulk_input');
      cb.inputEl.onblur = this.reRenderPreview;
    });
  }

  renderRegExpInput() {
    if (!isViewTypeRegExp(this.plugin.settings)) {
      return;
    }

    const settings = new Setting(this.containerEl);
    settings.infoEl.addClass('bulk_regexp_search');
    settings.setClass('bulk_regexp_container');
    settings
      .setName('RegExp Search')
      .addText((cb) => {
        const backslash = createBackslash('/');
        cb.inputEl.insertAdjacentElement('beforebegin', backslash);
        // @ts-ignore
        cb.inputEl.addEventListener('keydown', (event) => {
          if (event.key !== 'Enter') {
            return;
          }
          const target = event.target as HTMLInputElement;

          this.plugin.settings.regExpState.regExp = target.value;
          this.plugin.saveSettings();
        });
        cb.setPlaceholder('Put your RegExp here')
          .setValue(this.plugin.settings.regExpState.regExp)
          .onChange((newFolder) => {
            this.plugin.settings.regExpState.regExp = newFolder;
            this.plugin.saveSettings();
            this.getFilesByRegExp();
          });
        // @ts-ignore
        cb.inputEl.addClass('bulk_regexp');
        cb.inputEl.onblur = this.reRenderPreview;
      })
      .addText((cb) => {
        new RegExpFlagsSuggest(this.app, cb.inputEl, this.plugin);
        const backslash = createBackslash('/');
        cb.inputEl.insertAdjacentElement('beforebegin', backslash);
        cb.inputEl.addEventListener('keydown', (event) => {
          // @ts-ignore
          event.stopPropagation();
          event.stopImmediatePropagation();
          event.preventDefault();
        });
        cb.setPlaceholder('flags here')
          // .setDisabled(true)
          .setValue(this.plugin.settings.regExpState.flags.join(''))
          .onChange((flag: RegExpFlag) => {
            this.plugin.saveSettings();
            this.getFilesByRegExp();
            this.reRenderPreview();
          });
        cb.inputEl.addClass('bulk_regexp_flags');
      })
      .controlEl.addClass('bulk_regexp_control');
  }

  renderUseRegExpForExistingAndReplacement() {
    if (!isViewTypeRegExp(this.plugin.settings)) {
      return;
    }

    const newSettings = new Setting(this.containerEl);
    newSettings.setClass('bulk_toggle');
    newSettings
      .setName('Use RegExp For Existing & Replacement?')
      .setDesc(
        "Only RegExp will work now, however it doesn't prevent you to pass string",
      )
      .addToggle((toggle) => {
        toggle
          .setValue(
            this.plugin.settings.regExpState.withRegExpForReplaceSymbols,
          )
          .setTooltip('Use RegExp For Existing & Replacement?')
          .onChange((isRegExpForNames) => {
            this.plugin.settings.regExpState.withRegExpForReplaceSymbols =
              isRegExpForNames;
            this.reRenderPreview();
            this.plugin.saveSettings();
          });
      });
  }

  renderReplaceSymbol() {
    const { settings } = this.plugin;

    this.renderUseRegExpForExistingAndReplacement();
    const newSettings = new Setting(this.containerEl);
    if (Platform.isDesktop) {
      const previewLabel = createPreviewElement('Existing');
      const replacementLabel = createPreviewElement('Replacement');
      newSettings.infoEl.replaceChildren(previewLabel, replacementLabel);
      newSettings.setClass('flex');
      newSettings.setClass('flex-col');
      newSettings.infoEl.addClass('bulk_info');
    }
    newSettings.controlEl.addClass('replaceRenderSymbols');
    newSettings.addTextArea((textComponent) => {
      textComponent.setValue(settings.existingSymbol);
      textComponent.setPlaceholder('existing chars');
      textComponent.onChange((newValue) => {
        settings.existingSymbol = newValue;
        this.plugin.saveSettings();
      });
      textComponent.inputEl.addClass('bulk_input');
      textComponent.inputEl.onblur = this.reRenderPreview;
    });

    newSettings.addTextArea((textComponent) => {
      textComponent.setValue(settings.replacePattern);
      textComponent.setPlaceholder('replace with');
      textComponent.onChange((newValue) => {
        settings.replacePattern = newValue;
        this.plugin.saveSettings();
        this.getFilesByFolder();
      });
      textComponent.inputEl.addClass('bulk_input');
      textComponent.inputEl.onblur = this.reRenderPreview;
    });
  }

  renderFilesAndPreview = () => {
    this.containerEl.createEl('h2', { text: 'Preview' }, (el) => {
      el.className = 'bulk_preview_header';
    });

    this.filesAndPreview = new Setting(this.containerEl);
    this.totalFiles = this.containerEl.createEl('span', {
      text: `Total Files: ${this.plugin.settings.fileNames.length}`,
    });

    this.filesAndPreview.infoEl.detach();

    this.filesAndPreview.controlEl.addClass('bulk_rename_preview');
    this.reRenderPreview();
  };

  renderRenameFiles() {
    const desc = document.createDocumentFragment();
    desc.append(
      'You are going to update all files from preview section',
      desc.createEl('br'),
      desc.createEl('b', {
        text: 'Warning: ',
      }),
      'Make sure you verified all files in preview',
    );

    new Setting(this.containerEl)
      .setDesc(desc)
      .setName('Replace patterns')
      .addButton((button) => {
        button.setClass('bulk_button');
        button.setTooltip("Your files won't be changed");
        button.setButtonText('Preview');
        button.onClick(this.reRenderPreview);
      })
      .addButton((button) => {
        button.setClass('bulk_button');
        button.setTooltip(
          "We don't have undone button yet!\r\n Do we need it?",
        );
        button.setButtonText('Rename');
        button.onClick(async () => {
          button.setDisabled(true);
          await renameFilesInObsidian(this.app, this.plugin);
          this.reRenderPreview();
          button.setDisabled(false);
        });
      });
  }

  renderSupportDevelopment() {
    renderDonateButton(this.containerEl);
  }

  reRenderPreview = () => {
    this.calculateFileNames();
    renderPreviewFiles(this.filesAndPreview, this.plugin, this.state);
    this.totalFiles.setText(
      `Total Files: ${this.plugin.settings.fileNames.length}`,
    );
  };

  calculateFileNames() {
    if (isViewTypeTags(this.plugin.settings)) {
      this.getFilesByTags();
      return;
    }

    if (isViewTypeRegExp(this.plugin.settings)) {
      this.getFilesByRegExp();
      return;
    }

    this.getFilesByFolder();
  }

  getFilesByFolder() {
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

  getFilesByRegExp() {
    this.plugin.settings.fileNames = getObsidianFilesByRegExp(
      this.app,
      this.plugin,
    );
  }
}

export default BulkRenamePlugin;
