// Credits go to Liam's Periodic Notes Plugin: https://github.com/liamcain/obsidian-periodic-notes

import { App, TAbstractFile, TextAreaComponent, TFile } from 'obsidian';
import { TextInputSuggest } from './suggest';
import TemplaterPlugin from 'main';
import { errorWrapperSync } from '../errors/errors';
import { getFilesFromTheFolder } from '../files/files';

export class FileSuggest extends TextInputSuggest<TFile> {
  constructor(
    public app: App,
    public inputEl: any,
    private plugin: TemplaterPlugin,
  ) {
    super(app, inputEl);
  }

  getFolder(): string {
    return this.plugin.settings.mySetting;
  }

  get_error_msg(): string {
    return `Templates folder doesn't exist`;
  }

  getSuggestions(input_str: string): TFile[] {
    const all_files = errorWrapperSync(
      () => getFilesFromTheFolder(this.app, this.getFolder()),
      this.get_error_msg(),
    );
    if (!all_files) {
      return [];
    }

    const files: TFile[] = [];
    const lower_input_str = input_str.toLowerCase();

    all_files.forEach((file: TAbstractFile) => {
      if (
        file instanceof TFile &&
        file.extension === 'md' &&
        file.path.toLowerCase().contains(lower_input_str)
      ) {
        files.push(file);
      }
    });

    return files;
  }

  renderSuggestion(file: TFile, el: HTMLElement): void {
    el.setText(file.path);
  }

  selectSuggestion(file: TFile): void {
    this.inputEl.value = file.path;
    this.inputEl.trigger('input');
    this.close();
  }
}
