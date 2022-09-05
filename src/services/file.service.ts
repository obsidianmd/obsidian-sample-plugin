import { App, Notice, TFile } from 'obsidian';
import BulkRenamePlugin, { State } from '../../main';

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

const selectFilenamesWithReplacedPath = (plugin: BulkRenamePlugin) => {
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

  const newPath = pathWithoutExtension?.replaceAll(
    existingSymbol,
    replacePattern,
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

  // if (replacePattern === existingSymbol) {
  //   new Notice("Replace Pattern shouldn't much Existing Symbol");
  //   return;
  // }

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

export const syncScrolls = (
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
