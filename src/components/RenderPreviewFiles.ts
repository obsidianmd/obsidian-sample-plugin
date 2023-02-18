import {
  getFilesNamesInDirectory,
  getRenderedFileNamesReplaced,
} from '../services/file.service';
import { createPreviewElement } from './PreviewElement';
import BulkRenamePlugin, { BulkRenameSettingsTab, State } from '../../main';

export const renderPreviewFiles = (
  setting: BulkRenameSettingsTab['filesAndPreview'],
  plugin: BulkRenamePlugin,
  state: BulkRenameSettingsTab['state'],
) => {
  let existingFilesTextArea: HTMLTextAreaElement;
  let replacedPreviewTextArea: HTMLTextAreaElement;

  return setting
    .clear()
    .addTextArea((text) => {
      text.setPlaceholder('Here you will see files under folder location');
      text.setDisabled(true);
      existingFilesTextArea = text.inputEl;

      const value = getFilesNamesInDirectory(plugin);
      text.setValue(value);

      const previewLabel = createPreviewElement();
      text.inputEl.insertAdjacentElement('afterend', previewLabel);
      text.inputEl.addClass('bulk_preview_textarea');
      text.inputEl.wrap = 'soft';
    })
    .addTextArea((text) => {
      text.setPlaceholder(
        'How filenames will looks like after replacement(click preview first)',
      );
      text.setDisabled(true);

      replacedPreviewTextArea = text.inputEl;
      const value = getRenderedFileNamesReplaced(plugin);
      text.setValue(value);
      text.inputEl.addClass('bulk_preview_textarea');
      text.inputEl.wrap = 'soft';
    })
    .then((setting) => {
      syncScrolls(existingFilesTextArea, replacedPreviewTextArea, state);
    });
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
