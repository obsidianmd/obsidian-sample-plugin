import {
	FolderItemForSorting,
	getComparator,
	OS_byCreatedTime,
	OS_byModifiedTime,
	OS_byModifiedTimeReverse, SortingLevelId
} from './custom-sort';
import * as CustomSortModule from './custom-sort';
import {CustomSortGroupType, CustomSortOrder, CustomSortSpec} from './custom-sort-types';

const MOCK_TIMESTAMP: number = 1656417542418

const FlatLevelSortSpec: CustomSortSpec = {
	groups: [{  // Not relevant in unit test
		exactText: "Nothing",
		filesOnly: true,
		order: CustomSortOrder.alphabetical,
		type: CustomSortGroupType.ExactName
	},{  // prepared for unit test
		exactPrefix: "Fi",
		order: CustomSortOrder.byMetadataFieldAlphabeticalReverse,
		type: CustomSortGroupType.ExactPrefix
	},{  // Not relevant in unit test
		type: CustomSortGroupType.Outsiders,
		order: CustomSortOrder.byCreatedTime
	}],
	outsidersGroupIdx: 2,
	defaultOrder: CustomSortOrder.byCreatedTime,
	targetFoldersPaths: ['parent folder']
}

const MultiLevelSortSpecGroupLevel: CustomSortSpec = {
	groups: [{  // Not relevant in unit test
		exactText: "Nothing",
		filesOnly: true,
		order: CustomSortOrder.alphabetical,
		type: CustomSortGroupType.ExactName
	},{  // prepared for unit test
		exactPrefix: "Fi",
		order: CustomSortOrder.byMetadataFieldAlphabeticalReverse,
		secondaryOrder: CustomSortOrder.byMetadataFieldTrueAlphabetical,
		type: CustomSortGroupType.ExactPrefix
	},{  // Not relevant in unit test
		type: CustomSortGroupType.Outsiders,
		order: CustomSortOrder.byCreatedTime
	}],
	outsidersGroupIdx: 2,
	defaultOrder: CustomSortOrder.byCreatedTime,
	targetFoldersPaths: ['parent folder']
}

const MultiLevelSortSpecTargetFolderLevel: CustomSortSpec = {
	groups: [{  // Not relevant in unit test
		exactText: "Nothing",
		filesOnly: true,
		order: CustomSortOrder.alphabetical,
		type: CustomSortGroupType.ExactName
	},{  // prepared for unit test
		exactPrefix: "Fi",
		order: CustomSortOrder.byMetadataFieldAlphabeticalReverse,
		type: CustomSortGroupType.ExactPrefix
	},{  // Not relevant in unit test
		type: CustomSortGroupType.Outsiders,
		order: CustomSortOrder.byCreatedTime
	}],
	outsidersGroupIdx: 2,
	defaultOrder: CustomSortOrder.byCreatedTime,
	defaultSecondaryOrder: CustomSortOrder.byMetadataFieldTrueAlphabeticalReverse,
	targetFoldersPaths: ['parent folder']
}

const MultiLevelSortSpecAndTargetFolderLevel: CustomSortSpec = {
	groups: [{  // Not relevant in unit test
		exactText: "Nothing",
		filesOnly: true,
		order: CustomSortOrder.alphabetical,
		type: CustomSortGroupType.ExactName
	},{  // prepared for unit test
		exactPrefix: "Fi",
		order: CustomSortOrder.byMetadataFieldAlphabetical,
		secondaryOrder: CustomSortOrder.byMetadataFieldAlphabeticalReverse,
		type: CustomSortGroupType.ExactPrefix
	},{  // Not relevant in unit test
		type: CustomSortGroupType.Outsiders,
		order: CustomSortOrder.byCreatedTime
	}],
	outsidersGroupIdx: 2,
	defaultOrder: CustomSortOrder.byMetadataFieldTrueAlphabetical,
	defaultSecondaryOrder: CustomSortOrder.byMetadataFieldTrueAlphabeticalReverse,
	targetFoldersPaths: ['parent folder']
}

const A_GOES_FIRST: number = -1
const B_GOES_FIRST: number = 1
const AB_EQUAL: number = 0

const BaseItemForSorting1: FolderItemForSorting = {
	groupIdx: 1,
	isFolder: false,
	sortString: "References",
	sortStringWithExt: "References.md",
	ctime: MOCK_TIMESTAMP + 222,
	mtime: MOCK_TIMESTAMP + 333,
	path: 'parent folder/References.md',
	metadataFieldValue: 'direct metadata on file, under default name',
	metadataFieldValueSecondary: 'only used if secondary sort by metadata is used',
	metadataFieldValueForDerived: 'only used if derived primary sort by metadata is used',
	metadataFieldValueForDerivedSecondary: 'only used if derived secondary sort by metadata is used'
}

function getBaseItemForSorting(overrides?: Partial<FolderItemForSorting>): FolderItemForSorting {
	return Object.assign({}, BaseItemForSorting1, overrides)
}

describe('getComparator', () => {
	const sp = jest.spyOn(CustomSortModule, 'getSorterFnFor')
	const collatorCmp = jest.spyOn(CustomSortModule, 'CollatorCompare')
	beforeEach(() => {
		sp.mockClear()
	})
	describe('should correctly handle flat sorting spec', () => {
		const comparator = getComparator(FlatLevelSortSpec, OS_byModifiedTime)
		it( 'in simple case - group-level comparison succeeds', () => {
			const a = getBaseItemForSorting({
				metadataFieldValue: 'value X'
			})
			const b= getBaseItemForSorting({
				metadataFieldValue: 'value Y'
			})
			const result = comparator(a,b)
			expect(result).toBe(B_GOES_FIRST)
			expect(sp).toBeCalledTimes(1)
			expect(sp).toBeCalledWith(CustomSortOrder.byMetadataFieldAlphabeticalReverse, OS_byModifiedTime, SortingLevelId.forPrimary)
		})
		it( 'in simple case - group-level comparison fails, use folder-level', () => {
			const a = getBaseItemForSorting()
			const b= getBaseItemForSorting({
				ctime: a.ctime - 100
			})
			const result = Math.sign(comparator(a,b))
			expect(result).toBe(B_GOES_FIRST)
			expect(sp).toBeCalledTimes(2)
			expect(sp).toHaveBeenNthCalledWith(1, CustomSortOrder.byMetadataFieldAlphabeticalReverse, OS_byModifiedTime, SortingLevelId.forPrimary)
			expect(sp).toHaveBeenNthCalledWith(2, CustomSortOrder.byCreatedTime, OS_byModifiedTime, SortingLevelId.forDerivedPrimary)
		})
		it( 'in simple case - group-level comparison fails, folder-level fails, the last resort default comes into play - case A', () => {
			const a = getBaseItemForSorting({
				sortString: 'Second'
			})
			const b= getBaseItemForSorting({
				sortString: 'First'
			})
			const result = comparator(a,b)
			expect(result).toBe(B_GOES_FIRST)
			expect(sp).toBeCalledTimes(3)
			expect(sp).toHaveBeenNthCalledWith(1, CustomSortOrder.byMetadataFieldAlphabeticalReverse, OS_byModifiedTime, SortingLevelId.forPrimary)
			expect(sp).toHaveBeenNthCalledWith(2, CustomSortOrder.byCreatedTime, OS_byModifiedTime, SortingLevelId.forDerivedPrimary)
			expect(sp).toHaveBeenNthCalledWith(3, CustomSortOrder.default, undefined, SortingLevelId.forDefaultWhenUnspecified)
		})
	})
	describe('should correctly handle secondary sorting spec', () => {
		beforeEach(() => {
			sp.mockClear()
		})
		describe('at group level', () => {
			const comparator = getComparator(MultiLevelSortSpecGroupLevel, OS_byModifiedTimeReverse)
			it('in simple case - secondary sort comparison succeeds', () => {
				const a = getBaseItemForSorting({
					metadataFieldValueSecondary: 'This goes 1'
				})
				const b = getBaseItemForSorting({
					metadataFieldValueSecondary: 'This goes 2'
				})
				const result = comparator(a, b)
				expect(result).toBe(A_GOES_FIRST)
				expect(sp).toBeCalledTimes(2)
				expect(sp).toHaveBeenNthCalledWith(1, CustomSortOrder.byMetadataFieldAlphabeticalReverse, OS_byModifiedTimeReverse, SortingLevelId.forPrimary)
				expect(sp).toHaveBeenNthCalledWith(2, CustomSortOrder.byMetadataFieldTrueAlphabetical, OS_byModifiedTimeReverse, SortingLevelId.forSecondary)
			})
			it( 'in complex case - secondary sort comparison fails, last resort default comes into play', () => {
				const a = getBaseItemForSorting({
					sortString: 'Second'
				})
				const b= getBaseItemForSorting({
					sortString: 'First'
				})
				const result = comparator(a,b)
				expect(result).toBe(B_GOES_FIRST)
				expect(sp).toBeCalledTimes(4)
				expect(sp).toHaveBeenNthCalledWith(1, CustomSortOrder.byMetadataFieldAlphabeticalReverse, OS_byModifiedTimeReverse, SortingLevelId.forPrimary)
				expect(sp).toHaveBeenNthCalledWith(2, CustomSortOrder.byMetadataFieldTrueAlphabetical, OS_byModifiedTimeReverse, SortingLevelId.forSecondary)
				expect(sp).toHaveBeenNthCalledWith(3, CustomSortOrder.byCreatedTime, OS_byModifiedTimeReverse, SortingLevelId.forDerivedPrimary )
				expect(sp).toHaveBeenNthCalledWith(4, CustomSortOrder.default, undefined, SortingLevelId.forDefaultWhenUnspecified)
			})
		})
		describe('at target folder level (aka derived)', () => {
			const comparator = getComparator(MultiLevelSortSpecTargetFolderLevel, OS_byModifiedTimeReverse)
			it('in simple case - derived secondary sort comparison succeeds', () => {
				const a = getBaseItemForSorting({
					metadataFieldValueForDerivedSecondary: 'This goes 2 first (reverse is in effect)'
				})
				const b = getBaseItemForSorting({
					metadataFieldValueForDerivedSecondary: 'This goes 1 second (reverse is in effect)'
				})
				const result = comparator(a, b)
				expect(result).toBe(A_GOES_FIRST)
				expect(sp).toBeCalledTimes(3)
				expect(sp).toHaveBeenNthCalledWith(1, CustomSortOrder.byMetadataFieldAlphabeticalReverse, OS_byModifiedTimeReverse, SortingLevelId.forPrimary)
				expect(sp).toHaveBeenNthCalledWith(2, CustomSortOrder.byCreatedTime, OS_byModifiedTimeReverse, SortingLevelId.forDerivedPrimary)
				expect(sp).toHaveBeenNthCalledWith(3, CustomSortOrder.byMetadataFieldTrueAlphabeticalReverse, OS_byModifiedTimeReverse, SortingLevelId.forDerivedSecondary)
			})
			it( 'in complex case - secondary sort comparison fails, last resort default comes into play', () => {
				const a = getBaseItemForSorting({
					sortString: 'Second'
				})
				const b= getBaseItemForSorting({
					sortString: 'First'
				})
				const result = comparator(a,b)
				expect(result).toBe(B_GOES_FIRST)
				expect(sp).toBeCalledTimes(4)
				expect(sp).toHaveBeenNthCalledWith(1, CustomSortOrder.byMetadataFieldAlphabeticalReverse, OS_byModifiedTimeReverse, SortingLevelId.forPrimary)
				expect(sp).toHaveBeenNthCalledWith(2, CustomSortOrder.byCreatedTime, OS_byModifiedTimeReverse, SortingLevelId.forDerivedPrimary)
				expect(sp).toHaveBeenNthCalledWith(3, CustomSortOrder.byMetadataFieldTrueAlphabeticalReverse, OS_byModifiedTimeReverse, SortingLevelId.forDerivedSecondary)
				expect(sp).toHaveBeenNthCalledWith(4, CustomSortOrder.default, undefined, SortingLevelId.forDefaultWhenUnspecified)
			})
		})
		describe('at group and at target folder level (aka derived)', () => {
			const comparator = getComparator(MultiLevelSortSpecAndTargetFolderLevel, OS_byCreatedTime)
			const mdataGetter = jest.spyOn(CustomSortModule, 'getMdata')
			beforeEach(() => {
				mdataGetter.mockClear()
			})
			it('most complex case - last resort default comes into play, all sort levels present, all involve metadata', () => {
				const a = getBaseItemForSorting({
					path: 'test 1',   // Not used in comparisons, used only to identify source of compared metadata
					metadataFieldValue: 'm',
					metadataFieldValueSecondary: 'ms',
					metadataFieldValueForDerived: 'dm',
					metadataFieldValueForDerivedSecondary: 'dms'
				})
				const b= getBaseItemForSorting({
					path: 'test 2',   // Not used in comparisons, used only to identify source of compared metadata
					metadataFieldValue: 'm',
					metadataFieldValueSecondary: 'ms',
					metadataFieldValueForDerived: 'dm',
					metadataFieldValueForDerivedSecondary: 'dms'
				})
				const result = Math.sign(comparator(a,b))
				expect(result).toBe(AB_EQUAL)
				expect(sp).toBeCalledTimes(5)
				expect(sp).toHaveBeenNthCalledWith(1, CustomSortOrder.byMetadataFieldAlphabetical, OS_byCreatedTime, SortingLevelId.forPrimary)
				expect(sp).toHaveBeenNthCalledWith(2, CustomSortOrder.byMetadataFieldAlphabeticalReverse, OS_byCreatedTime, SortingLevelId.forSecondary)
				expect(sp).toHaveBeenNthCalledWith(3, CustomSortOrder.byMetadataFieldTrueAlphabetical, OS_byCreatedTime, SortingLevelId.forDerivedPrimary)
				expect(sp).toHaveBeenNthCalledWith(4, CustomSortOrder.byMetadataFieldTrueAlphabeticalReverse, OS_byCreatedTime, SortingLevelId.forDerivedSecondary)
				expect(sp).toHaveBeenNthCalledWith(5, CustomSortOrder.default, undefined, SortingLevelId.forDefaultWhenUnspecified)
				expect(mdataGetter).toHaveBeenCalledTimes(8)
				expect(mdataGetter).toHaveBeenNthCalledWith(1, expect.objectContaining({path: 'test 1'}), SortingLevelId.forPrimary)
				expect(mdataGetter).toHaveNthReturnedWith(1, 'm')
				expect(mdataGetter).toHaveBeenNthCalledWith(2, expect.objectContaining({path: 'test 2'}), SortingLevelId.forPrimary)
				expect(mdataGetter).toHaveNthReturnedWith(2, 'm')
				expect(mdataGetter).toHaveBeenNthCalledWith(3, expect.objectContaining({path: 'test 1'}), SortingLevelId.forSecondary)
				expect(mdataGetter).toHaveNthReturnedWith(3, 'ms')
				expect(mdataGetter).toHaveBeenNthCalledWith(4, expect.objectContaining({path: 'test 2'}), SortingLevelId.forSecondary)
				expect(mdataGetter).toHaveNthReturnedWith(4, 'ms')
				expect(mdataGetter).toHaveBeenNthCalledWith(5, expect.objectContaining({path: 'test 1'}), SortingLevelId.forDerivedPrimary)
				expect(mdataGetter).toHaveNthReturnedWith(5, 'dm')
				expect(mdataGetter).toHaveBeenNthCalledWith(6, expect.objectContaining({path: 'test 2'}), SortingLevelId.forDerivedPrimary)
				expect(mdataGetter).toHaveNthReturnedWith(6, 'dm')
				expect(mdataGetter).toHaveBeenNthCalledWith(7, expect.objectContaining({path: 'test 1'}), SortingLevelId.forDerivedSecondary)
				expect(mdataGetter).toHaveNthReturnedWith(7, 'dms')
				expect(mdataGetter).toHaveBeenNthCalledWith(8, expect.objectContaining({path: 'test 2'}), SortingLevelId.forDerivedSecondary)
				expect(mdataGetter).toHaveNthReturnedWith(8, 'dms')
			})
		})
	})
})
