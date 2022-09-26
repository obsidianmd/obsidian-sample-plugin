import {TFile, TFolder, Vault} from 'obsidian';
import {
	DEFAULT_FOLDER_CTIME,
	determineFolderDatesIfNeeded,
	determineSortingGroup,
	FolderItemForSorting
} from './custom-sort';
import {CustomSortGroupType, CustomSortOrder, CustomSortSpec} from './custom-sort-types';
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

const mockTFolder = (name: string, children?: Array<TFolder|TFile>, parent?: TFolder): TFolder => {
	return {
		isRoot(): boolean { return name === '/' },
		vault: {} as Vault, // To satisfy TS typechecking
		path: `/${name}`,
		name: name,
		parent: parent ?? ({} as TFolder), // To satisfy TS typechecking
		children: children ?? []
	}
}

const MOCK_TIMESTAMP: number = 1656417542418
const TIMESTAMP_OLDEST: number = MOCK_TIMESTAMP
const TIMESTAMP_NEWEST: number = MOCK_TIMESTAMP + 1000
const TIMESTAMP_INBETWEEN: number = MOCK_TIMESTAMP + 500

const mockTFolderWithChildren = (name: string): TFolder => {
	const child1: TFolder = mockTFolder('Section A')
	const child2: TFolder = mockTFolder('Section B')
	const child3: TFile = mockTFile('Child file 1 created as oldest, modified recently', 'md', 100, TIMESTAMP_OLDEST, TIMESTAMP_NEWEST)
	const child4: TFile = mockTFile('Child file 2 created as newest, not modified at all', 'md', 100, TIMESTAMP_NEWEST, TIMESTAMP_NEWEST)
	const child5: TFile = mockTFile('Child file 3 created inbetween, modified inbetween', 'md', 100, TIMESTAMP_INBETWEEN, TIMESTAMP_INBETWEEN)

	return mockTFolder('Mock parent folder', [child1, child2, child3, child4, child5])
}

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
				ctimeNewest: MOCK_TIMESTAMP + 222,
				ctimeOldest: MOCK_TIMESTAMP + 222,
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
				ctimeNewest: MOCK_TIMESTAMP + 555,
				ctimeOldest: MOCK_TIMESTAMP + 555,
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
				ctimeNewest: MOCK_TIMESTAMP + 555,
				ctimeOldest: MOCK_TIMESTAMP + 555,
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
				ctimeNewest: MOCK_TIMESTAMP + 555,
				ctimeOldest: MOCK_TIMESTAMP + 555,
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
				ctimeNewest: MOCK_TIMESTAMP + 555,
				ctimeOldest: MOCK_TIMESTAMP + 555,
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
				ctimeNewest: MOCK_TIMESTAMP + 555,
				ctimeOldest: MOCK_TIMESTAMP + 555,
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
				ctimeNewest: MOCK_TIMESTAMP + 222,
				ctimeOldest: MOCK_TIMESTAMP + 222,
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
				ctimeNewest: MOCK_TIMESTAMP + 222,
				ctimeOldest: MOCK_TIMESTAMP + 222,
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
				ctimeNewest: MOCK_TIMESTAMP + 222,
				ctimeOldest: MOCK_TIMESTAMP + 222,
				mtime: MOCK_TIMESTAMP + 333,
				path: 'Some parent folder/References.md'
			});
		})
	})
})

describe('determineFolderDatesIfNeeded', () => {
	it('should not be triggered if not needed - sorting method does not require it', () => {
		// given
		const folder: TFolder = mockTFolderWithChildren('Test folder 1')
		const OUTSIDERS_GROUP_IDX = 0
		const sortSpec: CustomSortSpec = {
			targetFoldersPaths: ['/'],
			groups: [{
				type: CustomSortGroupType.Outsiders,
				order: CustomSortOrder.alphabetical
			}],
			outsidersGroupIdx: OUTSIDERS_GROUP_IDX
		}
		const cardinality = {[OUTSIDERS_GROUP_IDX]: 10}  // Group 0 contains 10 items

		// when
		const result: FolderItemForSorting = determineSortingGroup(folder, sortSpec)
		determineFolderDatesIfNeeded([result], sortSpec, cardinality)

		// then
		expect(result.ctimeOldest).toEqual(DEFAULT_FOLDER_CTIME)
		expect(result.ctimeNewest).toEqual(DEFAULT_FOLDER_CTIME)
		expect(result.mtime).toEqual(DEFAULT_FOLDER_CTIME)
	})
	it('should not be triggered if not needed - the folder is an only item', () => {
		// given
		const folder: TFolder = mockTFolderWithChildren('Test folder 1')
		const OUTSIDERS_GROUP_IDX = 0
		const sortSpec: CustomSortSpec = {
			targetFoldersPaths: ['/'],
			groups: [{
				type: CustomSortGroupType.Outsiders,
				order: CustomSortOrder.byModifiedTimeAdvanced
			}],
			outsidersGroupIdx: OUTSIDERS_GROUP_IDX
		}
		const cardinality = {[OUTSIDERS_GROUP_IDX]: 1}  // Group 0 contains the folder alone

		// when
		const result: FolderItemForSorting = determineSortingGroup(folder, sortSpec)
		determineFolderDatesIfNeeded([result], sortSpec, cardinality)

		// then
		expect(result.ctimeOldest).toEqual(DEFAULT_FOLDER_CTIME)
		expect(result.ctimeNewest).toEqual(DEFAULT_FOLDER_CTIME)
		expect(result.mtime).toEqual(DEFAULT_FOLDER_CTIME)
	})
	it('should correctly determine dates, if triggered', () => {
		// given
		const folder: TFolder = mockTFolderWithChildren('Test folder 1')
		const OUTSIDERS_GROUP_IDX = 0
		const sortSpec: CustomSortSpec = {
			targetFoldersPaths: ['/'],
			groups: [{
				type: CustomSortGroupType.Outsiders,
				order: CustomSortOrder.byCreatedTimeReverseAdvanced
			}],
			outsidersGroupIdx: OUTSIDERS_GROUP_IDX
		}
		const cardinality = {[OUTSIDERS_GROUP_IDX]: 10}  // Group 0 contains 10 items

		// when
		const result: FolderItemForSorting = determineSortingGroup(folder, sortSpec)
		determineFolderDatesIfNeeded([result], sortSpec, cardinality)

		// then
		expect(result.ctimeOldest).toEqual(TIMESTAMP_OLDEST)
		expect(result.ctimeNewest).toEqual(TIMESTAMP_NEWEST)
		expect(result.mtime).toEqual(TIMESTAMP_NEWEST)
	})
})
