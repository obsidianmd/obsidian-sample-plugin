import { App, Notice, TFile } from 'obsidian';
import XRegExp from 'xregexp';
import BulkRenamePlugin, { BulkRenamePluginSettings } from '../../main';
import { isViewTypeFolder } from './settings.service';
import { ROOT_FOLDER_NAME } from '../constants/folders';

export const getFilesNamesInDirectory = (plugin: BulkRenamePlugin) => {
  return getFilesAsString(plugin.settings);
};

const getFilesAsString = (settings: BulkRenamePluginSettings) => {
  let value = '';
  const { fileNames, folderName } = settings;
  const shouldPrependSlash =
    isViewTypeFolder(settings) && folderName === ROOT_FOLDER_NAME;

  fileNames.forEach((fileName, index) => {
    const isLast = index + 1 === fileNames.length;
    const filePath = shouldPrependSlash ? '/' + fileName.path : fileName.path;

    if (isLast) {
      return (value += filePath);
    }

    value += filePath + '\r\n';
  });

  return value;
};

export const getRenderedFileNamesReplaced = (plugin: BulkRenamePlugin) => {
  const newFiles = selectFilenamesWithReplacedPath(plugin);

  return getFilesAsString({
    ...plugin.settings,
    fileNames: newFiles,
  });
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
  const pathWithoutExtension = file.path.split('.').slice(0, -1).join('.');
  const { replacePattern, existingSymbol, regExpState } = plugin.settings;

  if (isRootFilesSelected(plugin)) {
    const newPath = replacePattern + pathWithoutExtension;
    return `${newPath}.${file.extension}`;
  }

  let regExpExistingSymbol: RegExp | string = existingSymbol;
  if (regExpState.withRegExpForReplaceSymbols) {
    regExpExistingSymbol = XRegExp(existingSymbol, 'x');
  }

  const newPath = XRegExp.replace(
    pathWithoutExtension,
    regExpExistingSymbol,
    replacePattern,
    'all',
  );

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
  let success = true;
  for (const fileName of fileNames) {
    try {
      await app.fileManager.renameFile(
        fileName,
        replaceFilePath(plugin, fileName),
      );
    } catch (e) {
      if (e.code === 'ENOENT') {
        new Notice('FILES NOT RENAMED!');
        new Notice(
          'WARNING: YOU MUST CREATE FOLDER BEFORE MOVING INTO IT',
          7000,
        );
        success = false;
        break;
      }
    }
  }
  success && new Notice('successfully renamed all files');
};

const isRootFilesSelected = (plugin: BulkRenamePlugin) => {
  const { existingSymbol, folderName } = plugin.settings;

  return (
    existingSymbol === ROOT_FOLDER_NAME &&
    folderName === ROOT_FOLDER_NAME &&
    isViewTypeFolder(plugin.settings)
  );
};
