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
    it.todo(
      "should throw an error if there files didn't reviewed before submit",
    );
  });

  describe('Renaming', () => {
    it('should replace symbols in naming', () => {
      const plugin = {
        settings: {
          replacePattern: '-',
          existingSymbol: '_',
        },
      } as unknown as BulkRenamePlugin;

      const file = {
        path: 'journals/2022_10_13.md',
        extension: 'md',
      } as unknown as TFile;

      const expectedResult = 'journals/2022-10-13.md';

      const result = replaceFilePath(plugin, file);

      expect(result).toEqual(expectedResult);
    });

    it('should not rename extensions', () => {
      const plugin = {
        settings: {
          replacePattern: '-',
          existingSymbol: '.',
        },
      } as unknown as BulkRenamePlugin;

      const file = {
        path: '2022.10.13.md',
        extension: 'md',
      } as unknown as TFile;

      const expectedResult = '2022-10-13.md';

      const result = replaceFilePath(plugin, file);

      expect(result).toEqual(expectedResult);
    });

    it('should update directory path', () => {
      const plugin = {
        settings: {
          replacePattern: 'days',
          existingSymbol: 'journals',
        },
      } as unknown as BulkRenamePlugin;

      const file = {
        path: 'journals/2022_10_13.md',
        extension: 'md',
      } as unknown as TFile;

      const expectedResult = 'days/2022_10_13.md';

      const result = replaceFilePath(plugin, file);

      expect(result).toEqual(expectedResult);
    });
  });
});
