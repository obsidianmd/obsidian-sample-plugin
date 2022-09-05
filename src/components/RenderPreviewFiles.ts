import {
  getFilesNamesInDirectory,
  getRenderedFileNamesReplaced,
  syncScrolls,
} from '../services/file.service';
import { createPreviewElement } from './PreviewElement';
import BulkRenamePlugin, { BulkRenameSettingsTab } from '../../main';

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
      text.inputEl.addClass('templater_cmd');
    })
    .addTextArea((text) => {
      text.setPlaceholder(
        'How filenames will looks like after replacement(click preview first)',
      );
      text.setDisabled(true);

      replacedPreviewTextArea = text.inputEl;
      const value = getRenderedFileNamesReplaced(plugin);
      text.setValue(value);
      text.inputEl.addClass('templater_cmd');
    })
    .then((setting) => {
      syncScrolls(existingFilesTextArea, replacedPreviewTextArea, state);
    });
};
