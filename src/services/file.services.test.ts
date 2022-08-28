import { TFile } from 'obsidian';

import { replaceFilePath } from './file.service';
import BulkRenamePlugin from '../../main';

describe('File Services', () => {
  describe('Notifications', () => {
    it.todo('should display notification before renaming');
    it.todo('should display notification after renaming');
  });
  describe('Validation', () => {
    it.todo('should display notification if there an error');
    it.todo('should display notification if there an error');
    it.todo("should display notification if Existing Symbol doesn't exists");
    it.todo(
      'should display notification if Existing Symbol match Replace Pattern',
    );
  });

  describe('Renaming', () => {
    it('should not rename extensions', () => {
      const plugin = {
        settings: {
          replacePattern: '-',
          existingSymbol: '.',
        },
      } as unknown as BulkRenamePlugin;

      const file = {
        path: '2022.10.13.md',
      } as unknown as TFile;

      const expectedResult = '2022-10-13.md';

      const result = replaceFilePath(plugin, file);

      expect(result).toEqual(expectedResult);
    });
    it.todo('should replace symbols in naming');
    it.todo(
      'Should rename files only in a particular directory if the name could match other directories',
    );
  });
});
