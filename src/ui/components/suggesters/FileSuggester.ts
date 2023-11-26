// Credits go to Liam's Periodic Notes Plugin: https://github.com/liamcain/obsidian-periodic-notes

import { App, TAbstractFile, TFile } from 'obsidian';
import { TextInputSuggest } from './suggest';
import { get_tfiles_from_folder } from '@/utils/utils';

export class FileSuggest extends TextInputSuggest<TFile> {
    private onSelect: (file: string) => void;

    constructor(
        app: App,
        public inputEl: HTMLInputElement,
        onSelect: (file: string) => void,
    ) {
        super(app, inputEl);
        this.onSelect = onSelect;
    }

    getSuggestions(input_str: string): TFile[] {
        //TODO: allow other file types
        const all_files = get_tfiles_from_folder('', 'md');
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
        this.onSelect(file.path);
        this.close();
    }
}
