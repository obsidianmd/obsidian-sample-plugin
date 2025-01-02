import {
    TAbstractFile,
    TFolder,
    Vault
} from "obsidian";
import {
    DEFAULT_FOLDER_CTIME,
    determineFolderDatesIfNeeded,
    determineSortingGroup,
    FolderItemForSorting, OS_alphabetical, OS_byCreatedTime, ProcessingContext, sortFolderItems
} from "../../custom-sort/custom-sort";
import {
    CustomSortGroupType,
    CustomSortOrder,
    CustomSortSpec
} from "../../custom-sort/custom-sort-types";
import {
    TIMESTAMP_OLDEST,
    TIMESTAMP_NEWEST,
    mockTFolderWithChildren,
    mockTFolderWithDateNamedChildren,
    TIMESTAMP_DEEP_NEWEST,
    TIMESTAMP_DEEP_OLDEST,
} from "../mocks";
import {
    SortingSpecProcessor
} from "../../custom-sort/sorting-spec-processor";

describe('sortFolderItems', () => {
    it('should correctly handle Mmm-dd-yyyy pattern in file names', () => {
        // given
        const processor: SortingSpecProcessor = new SortingSpecProcessor()
        const sortSpecTxt =
`  ... \\[Mmm-dd-yyyy]
     > a-z
`
        const PARENT_PATH = 'parent/folder/path'
        const sortSpecsCollection = processor.parseSortSpecFromText(
            sortSpecTxt.split('\n'),
            PARENT_PATH,
            'file name with the sorting, irrelevant here'
        )

        const folder: TFolder = mockTFolderWithDateNamedChildren(PARENT_PATH)
        const sortSpec: CustomSortSpec = sortSpecsCollection?.sortSpecByPath![PARENT_PATH]!

        const ctx: ProcessingContext = {}

        // when
        const result: Array<TAbstractFile> = sortFolderItems(folder, folder.children, sortSpec, ctx, OS_alphabetical)

        // then
        const orderedNames = result.map(f => f.name)
        expect(orderedNames).toEqual([
            'CCC Feb-28-2025',
            'BBB Dec-23-2024.md',
            'DDD Jul-15-2024.md',
            'AAA Jan-01-2012'
        ])
    })
})



