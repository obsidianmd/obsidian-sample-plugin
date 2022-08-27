import {
  App,
  normalizePath,
  TAbstractFile,
  TFile,
  TFolder,
  Vault,
} from 'obsidian';
import { TemplaterError } from '../errors/errors';

export function resolveFolder(app: App, folder_str: string): TFolder {
  folder_str = normalizePath(folder_str);

  const folder = app.vault.getAbstractFileByPath(folder_str);
  if (!folder) {
    throw new TemplaterError(`Folder "${folder_str}" doesn't exist`);
  }
  if (!(folder instanceof TFolder)) {
    throw new TemplaterError(`${folder_str} is a file, not a folder`);
  }

  return folder;
}

export function getFilesFromTheFolder(
  app: App,
  folder_str: string,
): Array<TFile> {
  const folder = resolveFolder(app, folder_str);

  const files: Array<TFile> = [];
  Vault.recurseChildren(folder, (file: TAbstractFile) => {
    if (file instanceof TFile) {
      files.push(file);
    }
  });

  files.sort((a, b) => {
    return a.basename.localeCompare(b.basename);
  });

  return files;
}
