import { App, Notice, TFile } from 'obsidian';
import BulkRenamePlugin from '../../main';

export const getFilesNamesInDirectory = (plugin: BulkRenamePlugin) => {
  const { fileNames } = plugin.settings;

  return getFilesAsString(fileNames);
};

const getFilesAsString = (fileNames: TFile[]) => {
  let value = '';
  fileNames.forEach((fileName, index) => {
    const isLast = index + 1 === fileNames.length;
    if (isLast) {
      return (value += fileName.path);
    }
    value += fileName.path + '\r\n';
  });

  return value;
};

export const getRenderedFileNamesReplaced = (plugin: BulkRenamePlugin) => {
  const newFiles = selectFilenamesWithReplacedPath(plugin);

  return getFilesAsString(newFiles);
};

export const selectFilenamesWithReplacedPath = (plugin: BulkRenamePlugin) => {
  const { fileNames } = plugin.settings;

  return fileNames.map((file) => {
    return {
      ...file,
      path: replaceFilePath(plugin, file),
    };
  });
};

export const replaceFilePath = (plugin: BulkRenamePlugin, file: TFile) => {
  const { replacePattern, existingSymbol } = plugin.settings;

  const pathWithoutExtension = file.path.split('.').slice(0, -1).join('.');

  const convertedToRegExpString = escapeRegExp(existingSymbol);

  const regExpSymbol = new RegExp(convertedToRegExpString, 'g');

  const newPath = pathWithoutExtension?.replace(regExpSymbol, replacePattern);

  return `${newPath}.${file.extension}`;
};

export const renameFilesInObsidian = async (
  app: App,
  plugin: BulkRenamePlugin,
) => {
  const { existingSymbol, fileNames } = plugin.settings;

  if (!existingSymbol) {
    new Notice('please fill Existing Symbol');
    return;
  }

  if (!fileNames.length) {
    new Notice('Please check your results before rename!');
    return;
  }

  new Notice('renaming has been started');
  for (const fileName of fileNames) {
    await app.fileManager.renameFile(
      fileName,
      replaceFilePath(plugin, fileName),
    );
  }
  new Notice('successfully renamed all files');
};

let reRegExpChar = /[\\^$.*+?()[\]{}]/g,
  reHasRegExpChar = RegExp(reRegExpChar.source);

export function escapeRegExp(s: string) {
  return s && reHasRegExpChar.test(s) ? s.replace(reRegExpChar, '\\$&') : s;
}
