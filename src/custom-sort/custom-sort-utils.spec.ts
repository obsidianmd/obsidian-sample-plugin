import {
    CustomSortGroupType,
    CustomSortOrder,
    CustomSortSpec
} from "./custom-sort-types";
import {
    collectSortingAndGroupingTypes,
    hasOnlyByBookmarkOrStandardObsidian,
    HasSortingOrGrouping,
    ImplicitSortspecForBookmarksIntegration
} from "./custom-sort-utils";
import {SortingSpecProcessor, SortSpecsCollection} from "./sorting-spec-processor";

type NM = number

const getHas = (gTotal?: NM, gBkmrk?: NM, gStar?: NM, gIcon?: NM, sTot?: NM, sBkmrk?: NM, sStd?: NM) => {
    const has: HasSortingOrGrouping = {
        grouping: {
            total: gTotal ||0,
            byBookmarks: gBkmrk ||0,
            byStarred: gStar ||0,
            byIcon: gIcon ||0
        },
        sorting: {
            total: sTot ||0,
            byBookmarks: sBkmrk ||0,
            standardObsidian: sStd ||0
        }
    }
    return has
}

describe('hasOnlyByBookmarkOrStandardObsidian and collectSortingAndGroupingTypes', () => {
    it('should handle empty spec correctly', () => {
        const spec: Partial<CustomSortSpec>|undefined|null = undefined
        const expectedHas: HasSortingOrGrouping = getHas()
        const has = collectSortingAndGroupingTypes(spec)
        const hasOnly = hasOnlyByBookmarkOrStandardObsidian(has)
        expect(has).toEqual(expectedHas)
        expect(hasOnly).toBeTruthy()
    })
    it('should handle empty spec correctly (null variant)', () => {
        const spec: Partial<CustomSortSpec>|undefined|null = null
        const expectedHas: HasSortingOrGrouping = getHas()
        const has = collectSortingAndGroupingTypes(spec)
        const hasOnly = hasOnlyByBookmarkOrStandardObsidian(has)
        expect(hasOnly).toBeTruthy()
        expect(has).toEqual(expectedHas)
    })
    it('should handle spec with empty orders correctly', () => {
        const spec: Partial<CustomSortSpec>|undefined = {
            groups: [
                {type: CustomSortGroupType.Outsiders, filesOnly: true},
                {type: CustomSortGroupType.Outsiders}
            ]
        }
        const expectedHas: HasSortingOrGrouping = getHas()
        const has = collectSortingAndGroupingTypes(spec as CustomSortSpec)
        const hasOnly = hasOnlyByBookmarkOrStandardObsidian(has)
        expect(hasOnly).toBeTruthy()
        expect(has).toEqual(expectedHas)
    })
    it('should detect not matching default order', () => {
        const spec: Partial<CustomSortSpec>|undefined = {
            defaultOrder: CustomSortOrder.default,
            groups: [
                {
                    type: CustomSortGroupType.ExactName,
                },
                {
                    type: CustomSortGroupType.Outsiders,
                }
            ]
        }
        const expectedHas: HasSortingOrGrouping = getHas(1, 0, 0, 0, 1, 0, 0)
        const has = collectSortingAndGroupingTypes(spec as CustomSortSpec)
        const hasOnly = hasOnlyByBookmarkOrStandardObsidian(has)
        expect(hasOnly).toBeFalsy()
        expect(has).toEqual(expectedHas)
    })
    it('should detect not matching default secondary order', () => {
        const spec: Partial<CustomSortSpec>|undefined = {
            defaultOrder: CustomSortOrder.byBookmarkOrder,
            defaultSecondaryOrder: CustomSortOrder.default,
            groups: [
                {
                    type: CustomSortGroupType.BookmarkedOnly,
                },
                {
                    type: CustomSortGroupType.Outsiders,
                }
            ]
        }
        const expectedHas: HasSortingOrGrouping = getHas(1, 1, 0, 0, 2, 1, 0)
        const has = collectSortingAndGroupingTypes(spec as CustomSortSpec)
        const hasOnly = hasOnlyByBookmarkOrStandardObsidian(has)
        expect(hasOnly).toBeFalsy()
        expect(has).toEqual(expectedHas)
    })
    it('should detect not matching order in group', () => {
        const spec: Partial<CustomSortSpec>|undefined = {
            defaultOrder: CustomSortOrder.byBookmarkOrder,
            defaultSecondaryOrder: CustomSortOrder.standardObsidian,
            groups: [
                {
                    type: CustomSortGroupType.ExactName,
                    order: CustomSortOrder.byCreatedTimeReverse
                },
                {
                    type: CustomSortGroupType.Outsiders,
                }
            ]
        }
        const expectedHas: HasSortingOrGrouping = getHas(1, 0, 0, 0, 3, 1, 1)
        const has = collectSortingAndGroupingTypes(spec as CustomSortSpec)
        const hasOnly = hasOnlyByBookmarkOrStandardObsidian(has)
        expect(hasOnly).toBeFalsy()
        expect(has).toEqual(expectedHas)
    })
    it('should detect not matching secondary order in group', () => {
        const spec: Partial<CustomSortSpec>|undefined = {
            defaultOrder: CustomSortOrder.byBookmarkOrder,
            defaultSecondaryOrder: CustomSortOrder.standardObsidian,
            groups: [
                {
                    type: CustomSortGroupType.ExactName,
                    order: CustomSortOrder.byBookmarkOrderReverse,
                    secondaryOrder: CustomSortOrder.standardObsidian
                },
                {
                    type: CustomSortGroupType.Outsiders,
                    order: CustomSortOrder.byBookmarkOrder,
                    secondaryOrder: CustomSortOrder.alphabetical
                }
            ]
        }
        const expectedHas: HasSortingOrGrouping = getHas(1, 0, 0, 0, 6, 3, 2)
        const has = collectSortingAndGroupingTypes(spec as CustomSortSpec)
        const hasOnly = hasOnlyByBookmarkOrStandardObsidian(has)
        expect(hasOnly).toBeFalsy()
        expect(has).toEqual(expectedHas)
    })
    it('should detect matching orders at all levels', () => {
        const spec: Partial<CustomSortSpec>|undefined = {
            defaultOrder: CustomSortOrder.byBookmarkOrder,
            defaultSecondaryOrder: CustomSortOrder.standardObsidian,
            groups: [
                {
                    type: CustomSortGroupType.BookmarkedOnly,
                    order: CustomSortOrder.byBookmarkOrderReverse,
                    secondaryOrder: CustomSortOrder.standardObsidian
                },
                {
                    type: CustomSortGroupType.Outsiders,
                    order: CustomSortOrder.byBookmarkOrder,
                    secondaryOrder: CustomSortOrder.byBookmarkOrderReverse
                }
            ]
        }
        const expectedHas: HasSortingOrGrouping = getHas(1, 1, 0, 0, 6, 4, 2)
        const has = collectSortingAndGroupingTypes(spec as CustomSortSpec)
        const hasOnly = hasOnlyByBookmarkOrStandardObsidian(has)
        expect(hasOnly).toBeTruthy()
        expect(has).toEqual(expectedHas)
    })
})

describe('ImplicitSortspecForBookmarksIntegration', () => {
    it('should correctly be recognized as only bookmark and obsidian standard', () => {
        const processor: SortingSpecProcessor = new SortingSpecProcessor();
        const inputTxtArr: Array<string> = ImplicitSortspecForBookmarksIntegration.replace(/\t/gi, '').split('\n')
        const spec: SortSpecsCollection|null|undefined = processor.parseSortSpecFromText(
            inputTxtArr,
            'mock-folder',
            'custom-name-note.md',
            null,
            true
        )
        const expectedHas: HasSortingOrGrouping = getHas(1, 1, 0, 0, 2, 1, 1)
        const has = collectSortingAndGroupingTypes(spec?.sortSpecByPath!['/'])
        const hasOnly = hasOnlyByBookmarkOrStandardObsidian(has)
        expect(hasOnly).toBeTruthy()
        expect(has).toEqual(expectedHas)
    })
})

// TODO - czy tamto sprawdzanie dla itemów w rootowym filderze hasBookmarkInFolder dobrze zadziala
