import { TFile } from 'obsidian';

import {
  replaceFilePath,
  selectFilenamesWithReplacedPath,
} from './file.service';
import BulkRenamePlugin from '../../main';

describe('File Services', () => {
  describe('Notifications', () => {
    it.todo('should display notification before renaming');
    it.todo('should display notification after renaming');
  });
  describe('Validation', () => {
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
          regExpState: {
            withRegExpForReplaceSymbols: false,
          },
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
          regExpState: {
            withRegExpForReplaceSymbols: false,
          },
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
          regExpState: {
            withRegExpForReplaceSymbols: false,
          },
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

    describe('selectFilenamesWithReplacedPath', () => {
      const files = [
        {
          path: 'journals/2022_10_13.md',
          extension: 'md',
        },
        {
          path: 'pages/2022_10_13.md',
          extension: 'md',
        },
        {
          path: 'bulkRenameTets/2022_10_13.md',
          extension: 'md',
        },
        {
          path: 'YesWecan/canWe/2022_10_13.md',
          extension: 'md',
        },
      ] as unknown as TFile[];

      const mockPluginPlugin = {
        settings: {
          fileNames: files,
          regExpState: {
            withRegExpForReplaceSymbols: false,
          },
        },
      } as unknown as BulkRenamePlugin;

      it('should rename many files with RegExp', () => {
        const plugin = {
          ...mockPluginPlugin,
          settings: {
            ...mockPluginPlugin.settings,
            existingSymbol: 'journals|pages|bulkRenameTets|canWe',
            replacePattern: 'qwe',
            regExpState: {
              withRegExpForReplaceSymbols: true,
            },
          },
        } as unknown as BulkRenamePlugin;

        const expectedResults = [
          {
            path: 'qwe/2022_10_13.md',
            extension: 'md',
          },
          {
            path: 'qwe/2022_10_13.md',
            extension: 'md',
          },
          {
            path: 'qwe/2022_10_13.md',
            extension: 'md',
          },
          {
            path: 'YesWecan/qwe/2022_10_13.md',
            extension: 'md',
          },
        ];

        const updatedFiles = selectFilenamesWithReplacedPath(plugin);

        expect(expectedResults).toEqual(updatedFiles);
      });

      it('should select all files', () => {
        const plugin = {
          ...mockPluginPlugin,
          settings: {
            ...mockPluginPlugin.settings,
            existingSymbol: '',
            replacePattern: '',
          },
        } as unknown as BulkRenamePlugin;

        const updatedFiles = selectFilenamesWithReplacedPath(plugin);

        expect(files).toEqual(updatedFiles);
      });

      it('should rename many files using capture groups', () => {
        const plugin = {
          ...mockPluginPlugin,
          settings: {
            ...mockPluginPlugin.settings,
            existingSymbol: '2022_(.+)',
            replacePattern: '$1_2022',
            regExpState: {
              withRegExpForReplaceSymbols: true,
            },
          },
        } as unknown as BulkRenamePlugin;

        const expectedResults = [
          {
            path: 'journals/10_13_2022.md',
            extension: 'md',
          },
          {
            path: 'pages/10_13_2022.md',
            extension: 'md',
          },
          {
            path: 'bulkRenameTets/10_13_2022.md',
            extension: 'md',
          },
          {
            path: 'YesWecan/canWe/10_13_2022.md',
            extension: 'md',
          },
        ];

        const updatedFiles = selectFilenamesWithReplacedPath(plugin);

        expect(expectedResults).toEqual(updatedFiles);
      });

      it('should rename many files using capture groups', () => {
        const files = [
          {
            path: '2022_10_13.md',
            extension: 'md',
          },
          {
            path: '2022_10_14.md',
            extension: 'md',
          },
          {
            path: '2022_10_15.md',
            extension: 'md',
          },
          {
            path: '2022_10_16.md',
            extension: 'md',
          },
        ] as unknown as TFile[];
        const plugin = {
          settings: {
            fileNames: files,
            existingSymbol: `(?<year>  [0-9]{4} ) _?  # year
                             (?<month> [0-9]{2} ) _?  # month
                             (?<day>   [0-9]{2} )     # day`,
            replacePattern: '$<month>-$<day>-$<year>',
            regExpState: {
              withRegExpForReplaceSymbols: true,
            },
          },
        } as unknown as BulkRenamePlugin;

        const expectedResults = [
          {
            path: '10-13-2022.md',
            extension: 'md',
          },
          {
            path: '10-14-2022.md',
            extension: 'md',
          },
          {
            path: '10-15-2022.md',
            extension: 'md',
          },
          {
            path: '10-16-2022.md',
            extension: 'md',
          },
        ];

        const updatedFiles = selectFilenamesWithReplacedPath(plugin);

        expect(expectedResults).toEqual(updatedFiles);
      });
    });
  });
});
