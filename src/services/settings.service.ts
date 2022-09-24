import BulkRenamePlugin from '../../main';

export const isViewTypeFolder = (settings: BulkRenamePlugin['settings']) => {
  return settings.viewType === 'folder';
};

export const isViewTypeTags = (settings: BulkRenamePlugin['settings']) => {
  return settings.viewType === 'tags';
};

export const isViewTypeRegExp = (settings: BulkRenamePlugin['settings']) => {
  return settings.viewType === 'regexp';
};
