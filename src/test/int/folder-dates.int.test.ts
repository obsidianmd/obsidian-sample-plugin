import {
    TAbstractFile,
    TFolder,
    Vault
} from "obsidian";
import {
    DEFAULT_FOLDER_CTIME,
    determineFolderDatesIfNeeded,
    determineSortingGroup,
    FolderItemForSorting
} from "../../custom-sort/custom-sort";
import {
    CustomSortGroupType,
    CustomSortOrder,
    CustomSortSpec
} from "../../custom-sort/custom-sort-types";
import {
    TIMESTAMP_OLDEST,
    TIMESTAMP_NEWEST,
    mockTFolderWithChildren, TIMESTAMP_DEEP_NEWEST, TIMESTAMP_DEEP_OLDEST
} from "../mocks";

describe('determineFolderDatesIfNeeded', () => {
    it('should not be triggered if not needed - sorting method does not require it', () => {
        // given
        const folder: TFolder = mockTFolderWithChildren('Test folder 1')
        const OUTSIDERS_GROUP_IDX = 0
        const sortSpec: CustomSortSpec = {
            targetFoldersPaths: ['/'],
            groups: [{
                type: CustomSortGroupType.Outsiders,
                sorting: { order: CustomSortOrder.alphabetical }
            }],
            outsidersGroupIdx: OUTSIDERS_GROUP_IDX
        }

        // when
        const result: FolderItemForSorting = determineSortingGroup(folder, sortSpec)
        determineFolderDatesIfNeeded([result], sortSpec)

        // then
        expect(result.ctime).toEqual(DEFAULT_FOLDER_CTIME)
        expect(result.mtime).toEqual(DEFAULT_FOLDER_CTIME)
    })
    it.each(
        [
            [CustomSortOrder.byCreatedTimeReverseAdvanced, undefined],
            [CustomSortOrder.byCreatedTimeAdvanced, undefined],
            [CustomSortOrder.byModifiedTimeAdvanced, undefined],
            [CustomSortOrder.byModifiedTimeReverseAdvanced, undefined],
            [CustomSortOrder.alphabetical, CustomSortOrder.byCreatedTimeReverseAdvanced],
            [CustomSortOrder.alphabetical, CustomSortOrder.byCreatedTimeAdvanced],
            [CustomSortOrder.alphabetical, CustomSortOrder.byModifiedTimeAdvanced],
            [CustomSortOrder.alphabetical, CustomSortOrder.byModifiedTimeReverseAdvanced],
        ])('should correctly determine dates, if triggered by %s under default %s (no deep orders requested)', (order: CustomSortOrder, folderOrder: CustomSortOrder | undefined) => {
        // given
        const folder: TFolder = mockTFolderWithChildren('Test folder 1')
        const OUTSIDERS_GROUP_IDX = 0
        const sortSpec: CustomSortSpec = {
            targetFoldersPaths: ['/'],
            defaultSorting: folderOrder ? { order: folderOrder } : undefined,
            groups: [{
                type: CustomSortGroupType.Outsiders,
                sorting: { order: order }
            }],
            outsidersGroupIdx: OUTSIDERS_GROUP_IDX
        }

        // when
        const result: FolderItemForSorting = determineSortingGroup(folder, sortSpec)
        determineFolderDatesIfNeeded([result], sortSpec)

        // then
        expect(result.ctime).toEqual(TIMESTAMP_OLDEST)
        expect(result.mtime).toEqual(TIMESTAMP_NEWEST)
    })
    it.each(
        [
            [CustomSortOrder.alphabetical, CustomSortOrder.byCreatedTimeReverseAdvancedRecursive],
            [CustomSortOrder.alphabetical, CustomSortOrder.byCreatedTimeAdvancedRecursive],
            [CustomSortOrder.alphabetical, CustomSortOrder.byModifiedTimeAdvancedRecursive],
            [CustomSortOrder.alphabetical, CustomSortOrder.byModifiedTimeReverseAdvancedRecursive],
            [CustomSortOrder.byCreatedTimeReverseAdvancedRecursive,  CustomSortOrder.byCreatedTimeReverseAdvanced],
            [CustomSortOrder.byCreatedTimeAdvancedRecursive,         CustomSortOrder.byCreatedTimeAdvanced],
            [CustomSortOrder.byModifiedTimeAdvancedRecursive,        CustomSortOrder.byModifiedTimeAdvanced],
            [CustomSortOrder.byModifiedTimeReverseAdvancedRecursive, CustomSortOrder.byModifiedTimeReverseAdvanced],
        ])('should correctly determine dates, if triggered by %s under default %s (deep orders)', (order: CustomSortOrder, folderOrder: CustomSortOrder | undefined) => {
        // given
        const folder: TFolder = mockTFolderWithChildren('Test folder 1')
        const OUTSIDERS_GROUP_IDX = 0
        const sortSpec: CustomSortSpec = {
            targetFoldersPaths: ['/'],
            defaultSorting: folderOrder ? { order: folderOrder} : undefined,
            groups: [{
                type: CustomSortGroupType.Outsiders,
                sorting: { order: order }
            }],
            outsidersGroupIdx: OUTSIDERS_GROUP_IDX
        }

        // when
        const result: FolderItemForSorting = determineSortingGroup(folder, sortSpec)
        determineFolderDatesIfNeeded([result], sortSpec)

        // then
        expect(result.ctime).toEqual(TIMESTAMP_DEEP_OLDEST)
        expect(result.mtime).toEqual(TIMESTAMP_DEEP_NEWEST)
    })
})



