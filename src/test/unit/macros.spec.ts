import {
    expandMacros,
    expandMacrosInString
} from "../../custom-sort/macros";
import * as MacrosModule from '../../custom-sort/macros'
import {
    CustomSortGroup,
    CustomSortSpec
} from "../../custom-sort/custom-sort-types";

describe('expandMacrosInString', () => {
    it.each([
        ['', ''],
        ['123', '123'],
        ['  123  ', '  123  '],
        [' Abc{:%parent-folder-name%:}Def ', ' Abc{:%parent-folder-name%:}Def '],
        ['{:%parent-folder-name%:}Def ', '{:%parent-folder-name%:}Def '],
        [' Abc{:%parent-folder-name%:}', ' Abc{:%parent-folder-name%:}'],
        [' {:%parent-folder-name%:} xyz {:%parent-folder-name%:}', ' {:%parent-folder-name%:} xyz {:%parent-folder-name%:}'],
        [' {:%unknown%:} ',' {:%unknown%:} ']
    ])('%s should transform to %s when no parent folder', (source: string, expanded: string) => {
        const result1 = expandMacrosInString(source)
        const result2 = expandMacrosInString(source, '')
        expect(result1).toBe(expanded)
        expect(result2).toBe(expanded)
    })
    it.each([
        ['', ''],
        ['123', '123'],
        ['  123  ', '  123  '],
        [' Abc{:%parent-folder-name%:}Def ', ' AbcSubFolder 5Def '],
        ['{:%parent-folder-name%:}Def ', 'SubFolder 5Def '],
        [' Abc{:%parent-folder-name%:}', ' AbcSubFolder 5'],
        [' {:%parent-folder-name%:} xyz {:%parent-folder-name%:}', ' SubFolder 5 xyz {:%parent-folder-name%:}'],
        [' {:%unknown%:} ',' {:%unknown%:} ']
    ])('%s should transform to %s when parent folder specified', (source: string, expanded: string) => {
        const PARENT = 'SubFolder 5'
        const result = expandMacrosInString(source, PARENT)
        expect(result).toBe(expanded)
    })
})

function mockGroup(gprefix: string, group: string, prefix: string, full: string, suffix: string): CustomSortGroup {
    const g: Partial<CustomSortGroup> = {
        exactText: gprefix + group + full,
        exactPrefix: gprefix + group + prefix,
        exactSuffix: gprefix + group + suffix
    }
    return g as CustomSortGroup
}

describe('expandMacros', () => {
    it('should invoke expand in all relevant text fields on all groups', () => {
        const sortSpec: Partial<CustomSortSpec> = {
            groups: [
                mockGroup('g-', '1-', 'abc', 'def', 'ghi'),
                mockGroup('g-', '2-', 'abc', 'def', 'ghi'),
            ],
            groupsShadow: [
                mockGroup('gs-', '1-', 'abc', 'def', 'ghi'),
                mockGroup('gs-', '2-', 'abc', 'def', 'ghi'),
            ]
        }
        const sp = jest.spyOn(MacrosModule, 'expandMacrosInString')
        const ParentFolder = 'Parent folder name'
        expandMacros(sortSpec as CustomSortSpec, ParentFolder)
        expect(sp).toBeCalledTimes(6)
        expect(sp).toHaveBeenNthCalledWith(1, 'gs-1-def', ParentFolder)
        expect(sp).toHaveBeenNthCalledWith(2, 'gs-1-abc', ParentFolder)
        expect(sp).toHaveBeenNthCalledWith(3, 'gs-1-ghi', ParentFolder)
        expect(sp).toHaveBeenNthCalledWith(4, 'gs-2-def', ParentFolder)
        expect(sp).toHaveBeenNthCalledWith(5, 'gs-2-abc', ParentFolder)
        expect(sp).toHaveBeenNthCalledWith(6, 'gs-2-ghi', ParentFolder)
    })
    it('should expand correctly in all relevant text fields on all groups, based on shadow groups', () => {
        const sortSpec: Partial<CustomSortSpec> = {
            groups: [
                mockGroup('g-', '1-', 'abc{:%parent-folder-name%:}', 'de{:%parent-folder-name%:}f', '{:%parent-folder-name%:}ghi'),
                mockGroup('g-', '2-', '{:%parent-folder-name%:}abc', 'd{:%parent-folder-name%:}ef', 'ghi{:%parent-folder-name%:}'),
            ],
            groupsShadow: [
                mockGroup('gs-', '1-', 'abc{:%parent-folder-name%:}', 'de{:%parent-folder-name%:}f', '{:%parent-folder-name%:}ghi'),
                mockGroup('gs-', '2-', '{:%parent-folder-name%:}abc', 'd{:%parent-folder-name%:}ef', 'ghi{:%parent-folder-name%:}'),
            ]
        }
        const originalSortSpec: Partial<CustomSortSpec> = {
            groups: [...sortSpec.groups!],
            groupsShadow: [...sortSpec.groupsShadow!]
        }
        const ParentFolder = 'Parent folder name'
        expandMacros(sortSpec as CustomSortSpec, ParentFolder)
        expect(sortSpec.groups![0].exactText).toBe(originalSortSpec.groups![0].exactText)
        expect(sortSpec.groups![0].exactPrefix).toBe(originalSortSpec.groups![0].exactPrefix)
        expect(sortSpec.groups![0].exactSuffix).toBe(originalSortSpec.groups![0].exactSuffix)
        expect(sortSpec.groups![1].exactText).toBe(originalSortSpec.groups![1].exactText)
        expect(sortSpec.groups![1].exactPrefix).toBe(originalSortSpec.groups![1].exactPrefix)
        expect(sortSpec.groups![1].exactSuffix).toBe(originalSortSpec.groups![1].exactSuffix)
        expect(sortSpec.groupsShadow![0].exactText).toBe('gs-1-deParent folder namef')
        expect(sortSpec.groupsShadow![0].exactPrefix).toBe('gs-1-abcParent folder name')
        expect(sortSpec.groupsShadow![0].exactSuffix).toBe('gs-1-Parent folder nameghi')
        expect(sortSpec.groupsShadow![1].exactText).toBe('gs-2-dParent folder nameef')
        expect(sortSpec.groupsShadow![1].exactPrefix).toBe('gs-2-Parent folder nameabc')
        expect(sortSpec.groupsShadow![1].exactSuffix).toBe('gs-2-ghiParent folder name')
    })
})
