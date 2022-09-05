import { App, TFile } from 'obsidian';
import BulkRenamePlugin from '../../main';

export const getObsidianFilesByFolderName = (
  app: App,
  plugin: BulkRenamePlugin,
) => {
  const { folderName } = plugin.settings;
  const abstractFiles = app.vault.getAllLoadedFiles();

  const files = abstractFiles.filter(
    (file) => file instanceof TFile && file.parent.name.includes(folderName),
  ) as TFile[];

  const filesSortedByName = sortFilesByName(files);

  return filesSortedByName;
};

export const getObsidianFilesWithTagName = (
  app: App,
  plugin: BulkRenamePlugin,
) => {
  const { tags } = plugin.settings;
  const abstractFiles = app.vault.getAllLoadedFiles();

  const files = abstractFiles.filter((file) => {
    if (!(file instanceof TFile)) {
      return;
    }

    const fileMetadata = app.metadataCache.getFileCache(file);
    if (!fileMetadata || !fileMetadata.tags) {
      return;
    }

    const hasTagsInTheFile = fileMetadata.tags.find((fileTags) => {
      return tags.includes(fileTags.tag);
    });

    if (!hasTagsInTheFile) {
      return;
    }

    return file;
  }) as TFile[];

  const filesSortedByName = sortFilesByName(files);

  return filesSortedByName;
};

const sortFilesByName = (files: TFile[]) => {
  return files.sort((a, b) => a.name.localeCompare(b.name));
};
