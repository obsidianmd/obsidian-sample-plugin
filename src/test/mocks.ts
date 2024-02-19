import {
    TFile,
    TFolder,
    Vault
} from "obsidian";

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
        name: name,
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
