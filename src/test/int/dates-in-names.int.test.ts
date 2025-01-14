import {
    TAbstractFile, TFile,
    TFolder,
    Vault
} from "obsidian";
import {
    DEFAULT_FOLDER_CTIME,
    determineFolderDatesIfNeeded,
    determineSortingGroup,
    FolderItemForSorting,
    OS_alphabetical,
    OS_byCreatedTime,
    ProcessingContext,
    sortFolderItems
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
    mockTFolderWithDateWeekNamedChildrenForISOvsUSweekNumberingTest,
    mockTFolderWithDateWeekNamedChildren, mockTFile, mockTFolder,
} from "../mocks";
import {
    SortingSpecProcessor
} from "../../custom-sort/sorting-spec-processor";

describe('sortFolderItems', () => {
    it('should correctly handle Mmm-dd-yyyy pattern in file and folder names', () => {
        // given
        const processor: SortingSpecProcessor = new SortingSpecProcessor()
        const sortSpecTxt =
`
   ... \\[Mmm-dd-yyyy]
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
    it('should correctly handle yyyy-Www (mm-dd) pattern in file and folder names', () => {
        // given
        const processor: SortingSpecProcessor = new SortingSpecProcessor()
        const sortSpecTxt =
`
   ... \\[yyyy-Www (mm-dd)]
     < a-z
   ------  
`
        const PARENT_PATH = 'parent/folder/path'
        const sortSpecsCollection = processor.parseSortSpecFromText(
            sortSpecTxt.split('\n'),
            PARENT_PATH,
            'file name with the sorting, irrelevant here'
        )

        const folder: TFolder = mockTFolderWithDateWeekNamedChildren(PARENT_PATH)
        const sortSpec: CustomSortSpec = sortSpecsCollection?.sortSpecByPath![PARENT_PATH]!

        const ctx: ProcessingContext = {}

        // when
        const result: Array<TAbstractFile> = sortFolderItems(folder, folder.children, sortSpec, ctx, OS_alphabetical)

        // then
        const orderedNames = result.map(f => f.name)
        expect(orderedNames).toEqual([
            "GHI 2021-W1 (01-04)",
            "DEF 2021-W9 (03-01).md",
            "ABC 2021-W13 (03-29)",
            "MNO 2021-W45 (11-08).md",
            "JKL 2021-W52 (12-27).md",
            "------.md"
        ])
    })
    it('should correctly handle yyyy-WwwISO pattern in file and folder names', () => {
        // given
        const processor: SortingSpecProcessor = new SortingSpecProcessor()
        const sortSpecTxt =
`
   /+ ... \\[yyyy-Www (mm-dd)] 
   /+ ... \\[yyyy-WwwISO]
     < a-z
`
        const PARENT_PATH = 'parent/folder/path'
        const sortSpecsCollection = processor.parseSortSpecFromText(
            sortSpecTxt.split('\n'),
            PARENT_PATH,
            'file name with the sorting, irrelevant here'
        )

        const folder: TFolder = mockTFolderWithDateWeekNamedChildrenForISOvsUSweekNumberingTest(PARENT_PATH)
        const sortSpec: CustomSortSpec = sortSpecsCollection?.sortSpecByPath![PARENT_PATH]!

        const ctx: ProcessingContext = {}

        // when
        const result: Array<TAbstractFile> = sortFolderItems(folder, folder.children, sortSpec, ctx, OS_alphabetical)

        // then
        // ISO standard of weeks numbering
        const orderedNames = result.map(f => f.name)
        expect(orderedNames).toEqual([
            'E 2021-W1 (01-01)',
            'F ISO:2021-01-04 US:2020-12-28 2021-W1',
            'A 2021-W10 (03-05).md',
            'B ISO:2021-03-08 US:2021-03-01 2021-W10',
            'C 2021-W51 (12-17).md',
            'D ISO:2021-12-20 US:2021-12-13 2021-W51.md',
            'FFF2 ISO:2021-12-27 US:2021-12-20 2021-W52.md',
            'FFF1 ISO:2022-01-03 US:2021-12-27 2021-W53.md',
            "------.md"
        ])
    })
    it('should correctly handle yyyy-Www pattern in file and folder names', () => {
        // given
        const processor: SortingSpecProcessor = new SortingSpecProcessor()
        const sortSpecTxt =
`  
   /+ ... \\[yyyy-Www (mm-dd)]
   /+ ... \\[yyyy-Www]
     > a-z
   ... \\-d+
`
        const PARENT_PATH = 'parent/folder/path'
        const sortSpecsCollection = processor.parseSortSpecFromText(
            sortSpecTxt.split('\n'),
            PARENT_PATH,
            'file name with the sorting, irrelevant here'
        )

        const folder: TFolder = mockTFolderWithDateWeekNamedChildrenForISOvsUSweekNumberingTest(PARENT_PATH)
        const sortSpec: CustomSortSpec = sortSpecsCollection?.sortSpecByPath![PARENT_PATH]!

        const ctx: ProcessingContext = {}

        // when
        const result: Array<TAbstractFile> = sortFolderItems(folder, folder.children, sortSpec, ctx, OS_alphabetical)

        // then
        // U.S. standard of weeks  numbering
        const orderedNames = result.map(f => f.name)
        expect(orderedNames).toEqual([
            'FFF1 ISO:2022-01-03 US:2021-12-27 2021-W53.md',
            'FFF2 ISO:2021-12-27 US:2021-12-20 2021-W52.md',
            'C 2021-W51 (12-17).md',
            'D ISO:2021-12-20 US:2021-12-13 2021-W51.md',
            'A 2021-W10 (03-05).md',
            'B ISO:2021-03-08 US:2021-03-01 2021-W10',
            'E 2021-W1 (01-01)',
            'F ISO:2021-01-04 US:2020-12-28 2021-W1',
            "------.md"
        ])
    })
    it('should correctly mix for sorting different date formats in file and folder names', () => {
        // given
        const processor: SortingSpecProcessor = new SortingSpecProcessor()
        const sortSpecTxt =
`
   /+ ... \\[yyyy-Www (mm-dd)]
   /+ ... \\[yyyy-Www]
   /+ ... mm-dd \\[yyyy-mm-dd]
   /+ ... dd-mm \\[yyyy-dd-mm]
   /+ ... \\[yyyy-mm-dd]
   /+ ... \\[Mmm-dd-yyyy]
   /+ \\[dd-Mmm-yyyy] ...
     > a-z
`
        const PARENT_PATH = 'parent/folder/path'
        const sortSpecsCollection = processor.parseSortSpecFromText(
            sortSpecTxt.split('\n'),
            PARENT_PATH,
            'file name with the sorting, irrelevant here'
        )

        const folder: TFolder = mockTFolderWithDateWeekNamedChildrenForISOvsUSweekNumberingTest(PARENT_PATH)
        folder.children.push(...[
            mockTFile('File 2021-12-14', 'md'),
            mockTFile('File mm-dd 2020-12-30', 'md'),  // mm-dd
            mockTFile('File dd-mm 2020-31-12', 'md'),  // dd-mm
            mockTFile('File Mar-08-2021', 'md'),
            mockTFile('18-Dec-2021 file', 'md'),
        ])

        const sortSpec: CustomSortSpec = sortSpecsCollection?.sortSpecByPath![PARENT_PATH]!

        const ctx: ProcessingContext = {}

        // when
        const result: Array<TAbstractFile> = sortFolderItems(folder, folder.children, sortSpec, ctx, OS_alphabetical)

        // then
        // U.S. standard of weeks  numbering
        const orderedNames = result.map(f => f.name)
        expect(orderedNames).toEqual([
            'FFF1 ISO:2022-01-03 US:2021-12-27 2021-W53.md',
            'FFF2 ISO:2021-12-27 US:2021-12-20 2021-W52.md',
            "18-Dec-2021 file.md",
            'C 2021-W51 (12-17).md',
            "File 2021-12-14.md",
            'D ISO:2021-12-20 US:2021-12-13 2021-W51.md',
            "File Mar-08-2021.md",
            'A 2021-W10 (03-05).md',
            'B ISO:2021-03-08 US:2021-03-01 2021-W10',
            'E 2021-W1 (01-01)',
            "File dd-mm 2020-31-12.md",
            "File mm-dd 2020-12-30.md",
            'F ISO:2021-01-04 US:2020-12-28 2021-W1',
            "------.md"
        ])
    })
    it('should correctly order the week number with specifiers', () => {
        // given
        const processor: SortingSpecProcessor = new SortingSpecProcessor()
        const sortSpecTxt =
            `
   /+ \\[yyyy-Www]
   /+ \\[yyyy-mm-dd]
     > a-z
`
        const PARENT_PATH = 'parent/folder/path'
        const sortSpecsCollection = processor.parseSortSpecFromText(
            sortSpecTxt.split('\n'),
            PARENT_PATH,
            'file name with the sorting, irrelevant here'
        )

        const folder: TFolder = mockTFolder(PARENT_PATH,[
            // ISO and U.S. standard for 2025 give the same week numbers (remark for clarity)
            mockTFile('2025-03-09', 'md'),   // sunday of W10
            mockTFile('2025-W11-', 'md'),  // earlier than monday of W11
            mockTFile('2025-03-10', 'md'),  // monday W11
            mockTFile('2025-W11', 'md'),  // monday of W11
            mockTFile('2025-03-16', 'md'), // sunday W11
            mockTFile('2025-W11+', 'md'), // later than sunday W11  // expected
            mockTFile('2025-03-17', 'md'), // monday of W12
        ])

        const sortSpec: CustomSortSpec = sortSpecsCollection?.sortSpecByPath![PARENT_PATH]!

        const ctx: ProcessingContext = {}

        // when
        const result: Array<TAbstractFile> = sortFolderItems(folder, folder.children, sortSpec, ctx, OS_alphabetical)

        // then
        // U.S. standard of weeks  numbering
        const orderedNames = result.map(f => f.name)
        expect(orderedNames).toEqual([
            "2025-03-17.md",
            '2025-W11+.md',
            "2025-03-16.md",
            '2025-W11.md',
            "2025-03-10.md",
            "2025-W11-.md",
            "2025-03-09.md",
        ])
    })
})



