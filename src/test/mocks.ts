import {
    TFile,
    TFolder,
    Vault
} from "obsidian";
import {
    lastPathComponent
} from "../utils/utils";

export const mockTFile = (basename: string, ext: string, size?: number, ctime?: number, mtime?: number): TFile => {
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

export const mockTFolder = (name: string, children?: Array<TFolder|TFile>, parent?: TFolder): TFolder => {
    return {
        isRoot(): boolean { return name === '/' },
        vault: {} as Vault, // To satisfy TS typechecking
        path: `${name}`,
        name: lastPathComponent(name),
        parent: parent ?? ({} as TFolder), // To satisfy TS typechecking
        children: children ?? []
    }
}

export const MOCK_TIMESTAMP: number = 1656417542418
export const TIMESTAMP_OLDEST: number = MOCK_TIMESTAMP
export const TIMESTAMP_DEEP_OLDEST: number = TIMESTAMP_OLDEST - 1000
export const TIMESTAMP_NEWEST: number = MOCK_TIMESTAMP + 1000
export const TIMESTAMP_DEEP_NEWEST: number = TIMESTAMP_NEWEST + 1000
export const TIMESTAMP_INBETWEEN: number = MOCK_TIMESTAMP + 500

export const mockTFolderWithChildren = (name: string): TFolder => {
    const subchild1: TFile = mockTFile('Sub-child file 1 created as deep oldest, modified recently', 'md', 100, TIMESTAMP_DEEP_OLDEST, TIMESTAMP_NEWEST)
    const subfolder1: TFolder = mockTFolder('Subfolder with deep-oldest child file', [subchild1])

    const subchild2: TFile = mockTFile('Sub-child file 1 created as deep newest, modified recently', 'md', 100, TIMESTAMP_OLDEST, TIMESTAMP_DEEP_NEWEST)
    const subfolder2: TFolder = mockTFolder('Subfolder with deep-newest child file', [subchild2])

    const child1: TFolder = mockTFolder('Section A')
    const child2: TFolder = mockTFolder('Section B')
    const child3: TFile = mockTFile('Child file 1 created as oldest, modified recently', 'md', 100, TIMESTAMP_OLDEST, TIMESTAMP_NEWEST)
    const child4: TFile = mockTFile('Child file 2 created as newest, not modified at all', 'md', 100, TIMESTAMP_NEWEST, TIMESTAMP_NEWEST)
    const child5: TFile = mockTFile('Child file 3 created inbetween, modified inbetween', 'md', 100, TIMESTAMP_INBETWEEN, TIMESTAMP_INBETWEEN)

    return mockTFolder(name, [child1, child2, child3, child4, child5, subfolder1, subfolder2])
}

export const mockTFolderWithDateNamedChildren = (name: string): TFolder => {
    const child1: TFolder = mockTFolder('AAA Jan-01-2012')
    const child2: TFile = mockTFile('BBB Dec-23-2024', 'md')
    const child3: TFolder = mockTFolder('CCC Feb-28-2025')
    const child4: TFile = mockTFile('DDD Jul-15-2024', 'md')

    return mockTFolder(name, [child1, child2, child3, child4])
}

export const mockTFolderWithDateWeekNamedChildren = (name: string): TFolder => {
    // Assume ISO week numbers
    const child0: TFile = mockTFile('------', 'md')
    const child1: TFolder = mockTFolder('ABC 2021-W13 (03-29)')
    const child2: TFile = mockTFile('DEF 2021-W9 (03-01)', 'md')
    const child3: TFolder = mockTFolder('GHI 2021-W1 (01-04)')
    const child4: TFile = mockTFile('JKL 2021-W52 (12-27)', 'md')
    const child5: TFile = mockTFile('MNO 2021-W45 (11-08)', 'md')

    return mockTFolder(name, [child0, child1, child2, child3, child4, child5])
}

export const mockTFolderWithDateWeekNamedChildrenForISOvsUSweekNumberingTest = (name: string): TFolder => {
    // Tricky to test handling of both ISO and U.S. weeks numbering.
    // Sample year with different week numbers in ISO vs. U.S. is 2021 with 1st Jan on Fri, ISO != U.S.
    // Plain files and folder names to match both week-only and week+date syntax
    // Their relative ordering depends on week numbering
    const child0: TFile = mockTFile('------', 'md')
    const child1: TFile = mockTFile('A 2021-W10 (03-05)', 'md') // Tue date, (ISO) week number invalid, ignored
    const child2: TFolder = mockTFolder('B ISO:2021-03-08 US:2021-03-01 2021-W10')
    const child3: TFile = mockTFile('C 2021-W51 (12-17)', 'md') // Tue date, (ISO) week number invalid, ignored
    const child4: TFile = mockTFile('D ISO:2021-12-20 US:2021-12-13 2021-W51', 'md')
    const child5: TFolder = mockTFolder('E 2021-W1 (01-01)') // Tue date, to (ISO) week number invalid, ignored
    const child6: TFolder = mockTFolder('F ISO:2021-01-04 US:2020-12-28 2021-W1')
    const child7: TFile = mockTFile('FFF2 ISO:2021-12-27 US:2021-12-20 2021-W52', 'md')
    const child8: TFile = mockTFile('FFF1 ISO:2022-01-03 US:2021-12-27 2021-W53', 'md') // Invalid week, should fall to next year

    return mockTFolder(name, [child0, child1, child2, child3, child4, child5, child6, child7, child8])
}
