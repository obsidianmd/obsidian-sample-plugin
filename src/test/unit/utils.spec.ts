import {
    lastPathComponent,
    extractParentFolderPath,
    extractBasename
} from "../../utils/utils";

describe('lastPathComponent and extractParentFolderPath', () => {
    it.each([
        ['a folder', '', 'a folder'],
        ['a/subfolder', 'a', 'subfolder'],
        ['parent/child', 'parent', 'child'],
        ['','',''],
        ['   ','','   '],
        ['/strange', '', 'strange'],
        ['a/b/c/', 'a/b/c', ''],
        ['d d d/e e e/f f f/ggg ggg', 'd d d/e e e/f f f', 'ggg ggg'],
        ['/','',''],
        ['   /   ','   ','   '],
        ['   /','   ',''],
        ['/   ','','   ']
        ])('should from %s extract %s and %s', (path: string, parentPath: string, lastComponent: string) => {
            const extractedParentPath: string = extractParentFolderPath(path)
            const extractedLastComponent: string = lastPathComponent(path)
            expect(extractedParentPath).toBe(parentPath)
            expect(extractedLastComponent).toBe(lastComponent)
        }
    )
})

describe('extractBasenane', () => {
    const params: Array<(string|undefined)[]> = [
        // Obvious
        ['index', 'index'],
        ['index.md', 'index'],
        // Edge cases
        ['',''],
        [undefined,undefined],
        ['.','.'],
        ['.md',''],
        ['.md.md','.md']
    ];
    it.each(params)('>%s< should become %s', (s: string|undefined, out: string|undefined) => {
        expect(extractBasename(s)).toBe(out)
    })
})
