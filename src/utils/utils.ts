import {
    App,
    normalizePath,
    TAbstractFile,
    TFile,
    TFolder,
    Vault,
} from 'obsidian';
import { createNotice } from './Logs';

export function escape_RegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

export function generate_command_regex(): RegExp {
    return /<%(?:-|_)?\s*[*~]{0,1}((?:.|\s)*?)(?:-|_)?%>/g;
}

export function generate_dynamic_command_regex(): RegExp {
    return /(<%(?:-|_)?\s*[*~]{0,1})\+((?:.|\s)*?%>)/g;
}

export function resolve_tfolder(folder_str: string): TFolder {
    folder_str = normalizePath(folder_str);

    const folder = app.vault.getAbstractFileByPath(folder_str);
    if (!folder) {
        const message = `Folder "${folder_str}" doesn't exist`;
        createNotice(message);
        throw new Error(message);
    }
    if (!(folder instanceof TFolder)) {
        const message = `${folder_str} is a file, not a folder`;
        createNotice(message);
        throw new Error(message);
    }

    return folder;
}

export function resolve_tfile(file_str: string): TFile {
    file_str = normalizePath(file_str);

    const file = app.vault.getAbstractFileByPath(file_str);
    if (!file) {
        const message = `File "${file_str}" doesn't exist`;
        createNotice(message);
        throw new Error(message);
    }
    if (!(file instanceof TFile)) {
        const message = `${file_str} is a folder, not a file`;
        createNotice(message);
        throw new Error(message);
    }

    return file;
}

export function get_tfiles_from_folder(
    folder_str: string,
    extension?: string,
): Array<TFile> {
    const folder = resolve_tfolder(folder_str);

    const files: Array<TFile> = [];
    Vault.recurseChildren(folder, (file: TAbstractFile) => {
        if (
            file instanceof TFile &&
            extension &&
            file.extension === extension
        ) {
            files.push(file);
        }
    });

    files.sort((a, b) => {
        return a.basename.localeCompare(b.basename);
    });

    return files;
}

export function arraymove<T>(
    arr: T[],
    fromIndex: number,
    toIndex: number,
): void {
    if (toIndex < 0 || toIndex === arr.length) {
        return;
    }
    const element = arr[fromIndex];
    arr[fromIndex] = arr[toIndex];
    arr[toIndex] = element;
}

export function get_active_file(app: App) {
    return app.workspace.activeEditor?.file ?? app.workspace.getActiveFile();
}

