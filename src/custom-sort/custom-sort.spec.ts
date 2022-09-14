import {TFile, TFolder, Vault} from 'obsidian';
import {determineSortingGroup} from './custom-sort';
import {CustomSortGroupType, CustomSortSpec} from './custom-sort-types';
import {CompoundDashNumberNormalizerFn, CompoundDotRomanNumberNormalizerFn} from "./sorting-spec-processor";

const mockTFile = (basename: string, ext: string, size?: number, ctime?: number, mtime?: number): TFile => {
	return {
		stat: {
			ctime: ctime ?? 0,
			mtime: mtime ?? 0,
			size: size ?? 0
		},
		basename: basename,
		extension: ext,
		vault: {} as Vault, // To satisfy TS typechecking
		path: `Some parent folder/${basename}.${ext}`,
		name: `${basename}.${ext}`,
		parent: {} as TFolder // To satisfy TS typechecking
	}
}

const MOCK_TIMESTAMP: number = 1656417542418

describe('determineSortingGroup', () => {
	describe('CustomSortGroupType.ExactHeadAndTail', () => {
		it('should correctly recognize head and tail', () => {
			// given
			const file: TFile = mockTFile('References', 'md', 111, MOCK_TIMESTAMP + 222, MOCK_TIMESTAMP + 333);
			const sortSpec: CustomSortSpec = {
				targetFoldersPaths: ['/'],
				groups: [{
					type: CustomSortGroupType.ExactHeadAndTail,
					exactPrefix: 'Ref',
					exactSuffix: 'ces'
				}]
			}

			// when
			const result = determineSortingGroup(file, sortSpec)

			// then
			expect(result).toEqual({
				groupIdx: 0,
				isFolder: false,
				sortString: "References.md",
				ctime: MOCK_TIMESTAMP + 222,
				mtime: MOCK_TIMESTAMP + 333,
				path: 'Some parent folder/References.md'
			});
		})
		it('should not allow overlap of head and tail', () => {
			// given
			const file: TFile = mockTFile('References', 'md', 444, MOCK_TIMESTAMP + 555, MOCK_TIMESTAMP + 666);
			const sortSpec: CustomSortSpec = {
				targetFoldersPaths: ['/'],
				groups: [{
					type: CustomSortGroupType.ExactHeadAndTail,
					exactPrefix: 'Referen',
					exactSuffix: 'rences'
				}]
			}

			// when
			const result = determineSortingGroup(file, sortSpec)

			// then
			expect(result).toEqual({
				groupIdx: 1, // This indicates the last+1 idx
				isFolder: false,
				sortString: "References.md",
				ctime: MOCK_TIMESTAMP + 555,
				mtime: MOCK_TIMESTAMP + 666,
				path: 'Some parent folder/References.md'
			});
		})
		it('should not allow overlap of head and tail, when regexp in head', () => {
			// given
			const file: TFile = mockTFile('Part123:-icle', 'md', 444, MOCK_TIMESTAMP + 555, MOCK_TIMESTAMP + 666);
			const sortSpec: CustomSortSpec = {
				targetFoldersPaths: ['Some parent folder'],
				groups: [{
					type: CustomSortGroupType.ExactHeadAndTail,
					regexSpec: {
						regex: /^Part *(\d+(?:-\d+)*):/i,
						normalizerFn: CompoundDashNumberNormalizerFn
					},
					exactSuffix: ':-icle'
				}]
			}

			// when
			const result = determineSortingGroup(file, sortSpec)

			// then
			expect(result).toEqual({
				groupIdx: 1, // This indicates the last+1 idx
				isFolder: false,
				sortString: "Part123:-icle.md",
				ctime: MOCK_TIMESTAMP + 555,
				mtime: MOCK_TIMESTAMP + 666,
				path: 'Some parent folder/Part123:-icle.md'
			});
		})
		it('should match head and tail, when regexp in head', () => {
			// given
			const file: TFile = mockTFile('Part123:-icle', 'md', 444, MOCK_TIMESTAMP + 555, MOCK_TIMESTAMP + 666);
			const sortSpec: CustomSortSpec = {
				targetFoldersPaths: ['Some parent folder'],
				groups: [{
					type: CustomSortGroupType.ExactHeadAndTail,
					regexSpec: {
						regex: /^Part *(\d+(?:-\d+)*):/i,
						normalizerFn: CompoundDashNumberNormalizerFn
					},
					exactSuffix: '-icle'
				}]
			}

			// when
			const result = determineSortingGroup(file, sortSpec)

			// then
			expect(result).toEqual({
				groupIdx: 0, // Matched!
				isFolder: false,
				sortString: "00000123////Part123:-icle.md",
				matchGroup: '00000123//',
				ctime: MOCK_TIMESTAMP + 555,
				mtime: MOCK_TIMESTAMP + 666,
				path: 'Some parent folder/Part123:-icle.md'
			});
		})
		it('should not allow overlap of head and tail, when regexp in tail', () => {
			// given
			const file: TFile = mockTFile('Part:123-icle', 'md', 444, MOCK_TIMESTAMP + 555, MOCK_TIMESTAMP + 666);
			const sortSpec: CustomSortSpec = {
				targetFoldersPaths: ['Some parent folder'],
				groups: [{
					type: CustomSortGroupType.ExactHeadAndTail,
					exactPrefix: 'Part:',
					regexSpec: {
						regex: /: *(\d+(?:-\d+)*)-icle$/i,
						normalizerFn: CompoundDashNumberNormalizerFn
					}
				}]
			}

			// when
			const result = determineSortingGroup(file, sortSpec)

			// then
			expect(result).toEqual({
				groupIdx: 1, // This indicates the last+1 idx
				isFolder: false,
				sortString: "Part:123-icle.md",
				ctime: MOCK_TIMESTAMP + 555,
				mtime: MOCK_TIMESTAMP + 666,
				path: 'Some parent folder/Part:123-icle.md'
			});
		});
		it('should match head and tail, when regexp in tail', () => {
			// given
			const file: TFile = mockTFile('Part:123-icle', 'md', 444, MOCK_TIMESTAMP + 555, MOCK_TIMESTAMP + 666);
			const sortSpec: CustomSortSpec = {
				targetFoldersPaths: ['Some parent folder'],
				groups: [{
					type: CustomSortGroupType.ExactHeadAndTail,
					exactPrefix: 'Part',
					regexSpec: {
						regex: /: *(\d+(?:-\d+)*)-icle$/i,
						normalizerFn: CompoundDashNumberNormalizerFn
					}
				}]
			}

			// when
			const result = determineSortingGroup(file, sortSpec)

			// then
			expect(result).toEqual({
				groupIdx: 0, // Matched!
				isFolder: false,
				sortString: "00000123////Part:123-icle.md",
				matchGroup: '00000123//',
				ctime: MOCK_TIMESTAMP + 555,
				mtime: MOCK_TIMESTAMP + 666,
				path: 'Some parent folder/Part:123-icle.md'
			});
		});
	})
	describe('CustomSortGroupType.ExactPrefix', () => {
		it('should correctly recognize exact prefix', () => {
			// given
			const file: TFile = mockTFile('References', 'md', 111, MOCK_TIMESTAMP + 222, MOCK_TIMESTAMP + 333);
			const sortSpec: CustomSortSpec = {
				targetFoldersPaths: ['/'],
				groups: [{
					type: CustomSortGroupType.ExactPrefix,
					exactPrefix: 'Ref'
				}]
			}

			// when
			const result = determineSortingGroup(file, sortSpec)

			// then
			expect(result).toEqual({
				groupIdx: 0,
				isFolder: false,
				sortString: "References.md",
				ctime: MOCK_TIMESTAMP + 222,
				mtime: MOCK_TIMESTAMP + 333,
				path: 'Some parent folder/References.md'
			});
		})
		it('should correctly recognize exact prefix, regex variant', () => {
			// given
			const file: TFile = mockTFile('Reference i.xxx.vi.mcm', 'md', 111, MOCK_TIMESTAMP + 222, MOCK_TIMESTAMP + 333);
			const sortSpec: CustomSortSpec = {
				targetFoldersPaths: ['/'],
				groups: [{
					type: CustomSortGroupType.ExactPrefix,
					regexSpec: {
						regex: /^Reference *([MDCLXVI]+(?:\.[MDCLXVI]+)*)/i,
						normalizerFn: CompoundDotRomanNumberNormalizerFn
					}
				}]
			}

			// when
			const result = determineSortingGroup(file, sortSpec)

			// then
			expect(result).toEqual({
				groupIdx: 0,
				isFolder: false,
				sortString: '00000001|00000030|00000006|00001900////Reference i.xxx.vi.mcm.md',
				matchGroup: "00000001|00000030|00000006|00001900//",
				ctime: MOCK_TIMESTAMP + 222,
				mtime: MOCK_TIMESTAMP + 333,
				path: 'Some parent folder/Reference i.xxx.vi.mcm.md'
			});
		})
		it('should correctly process not matching prefix', () => {
			// given
			const file: TFile = mockTFile('References', 'md', 111, MOCK_TIMESTAMP + 222, MOCK_TIMESTAMP + 333);
			const sortSpec: CustomSortSpec = {
				targetFoldersPaths: ['/'],
				groups: [{
					type: CustomSortGroupType.ExactPrefix,
					exactPrefix: 'Pref'
				}]
			}

			// when
			const result = determineSortingGroup(file, sortSpec)

			// then
			expect(result).toEqual({
				groupIdx: 1, // This indicates the last+1 idx
				isFolder: false,
				sortString: "References.md",
				ctime: MOCK_TIMESTAMP + 222,
				mtime: MOCK_TIMESTAMP + 333,
				path: 'Some parent folder/References.md'
			});
		})
	})
})
