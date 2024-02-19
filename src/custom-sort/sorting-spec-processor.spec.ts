import {
	CompoundDashNumberNormalizerFn,
	CompoundDashRomanNumberNormalizerFn,
	CompoundDotNumberNormalizerFn,
	ConsumedFolderMatchingRegexp,
	consumeFolderByRegexpExpression,
	convertPlainStringToRegex,
	detectSortingSymbols,
	escapeRegexUnsafeCharacters,
	extractSortingSymbol,
	hasMoreThanOneSortingSymbol,
	NumberNormalizerFn,
	RegexpUsedAs,
	RomanNumberNormalizerFn,
	SortingSpecProcessor
} from "./sorting-spec-processor"
import {CustomSortGroupType, CustomSortOrder, CustomSortSpec, IdentityNormalizerFn} from "./custom-sort-types";
import {FolderMatchingRegexp, FolderMatchingTreeNode} from "./folder-matching-rules";

const txtInputExampleA: string = `
order-asc: a-z
/ ...  
/: ...  

target-folder: tricky folder 
/  
/:  

:::: tricky folder 2
/: with-metadata:
 < a-z by-metadata: Some-dedicated-field
with-metadata: Pages 
 > a-z by-metadata: 
/: with-icon:
with-icon: RiClock24
starred:
/:files starred:
/folders starred:

:::: folder of bookmarks
< by-bookmarks-order
/: bookmarked:
 < by-bookmarks-order 
/ Abc
 > by-bookmarks-order

:::: Conceptual model
/: Entities
%

target-folder: /
/: Con...
/
  > advanced modified
/:
  < modified
/: Ref...
/: Att...ch
sort...spec
/:. sortspec.md

target-folder: Sandbox
> modified
/: adfsasda
/ sdsadasdsa
  > a-z
/folders fdsfdsfdsfs
  > created

target-folder: Abcd efgh ijk
> a-z
Plain text spec bla bla bla (matches files and folders)...
/:. files only matching
  > a-z
/ folders only matching
  < a-z
some-file (or folder) 
/:. sort....md
Trailer item

:::: References
:::: Same rules as for References
Recently...
`;
const txtInputExampleAVerbose: string = `
order-asc: a-z
/folders ...  
/:files ...  

target-folder: tricky folder 
/folders  
/:files  

target-folder: tricky folder 2
/:files with-metadata:
 < a-z by-metadata: Some-dedicated-field
% with-metadata: Pages 
 > a-z by-metadata:
/:files with-icon:
/folders:files with-icon: RiClock24 
/folders:files starred:
/:files starred:
/folders starred:

target-folder: folder of bookmarks
order-asc: by-bookmarks-order
/:files bookmarked:
 order-asc: by-bookmarks-order 
/folders Abc
 order-desc: by-bookmarks-order

:::: Conceptual model
/:files Entities
%

target-folder: /
/:files Con...
/folders
  > advanced modified
/:files
  < modified
/:files Ref...
/:files Att...ch
% sort...spec
/:files. sortspec.md

target-folder: Sandbox
> modified
/:files adfsasda
/folders sdsadasdsa
  > a-z
/ fdsfdsfdsfs
  > created

target-folder: Abcd efgh ijk
\> a-z
Plain text spec bla bla bla (matches files and folders)...
/:files. files only matching
  > a-z
/folders folders only matching
  \< a-z
% some-file (or folder) 
/:files. sort....md
% Trailer item

target-folder: References
target-folder: Same rules as for References
% Recently...
`;

const expectedSortSpecsExampleA: { [key: string]: CustomSortSpec } = {
	"mock-folder": {
		defaultOrder: CustomSortOrder.alphabetical,
		groups: [{
			foldersOnly: true,
			type: CustomSortGroupType.MatchAll
		}, {
			filesOnly: true,
			type: CustomSortGroupType.MatchAll
		}, {
			type: CustomSortGroupType.Outsiders
		}],
		targetFoldersPaths: ['mock-folder'],
		outsidersGroupIdx: 2
	},
	"tricky folder": {
		groups: [{
			foldersOnly: true,
			type: CustomSortGroupType.Outsiders
		}, {
			filesOnly: true,
			type: CustomSortGroupType.Outsiders
		}],
		outsidersFilesGroupIdx: 1,
		outsidersFoldersGroupIdx: 0,
		targetFoldersPaths: ['tricky folder']
	},
	"tricky folder 2": {
		groups: [{
			filesOnly: true,
			type: CustomSortGroupType.HasMetadataField,
			withMetadataFieldName: 'sort-index-value',
			order: CustomSortOrder.byMetadataFieldAlphabetical,
			byMetadataField: 'Some-dedicated-field',
		}, {
			type: CustomSortGroupType.HasMetadataField,
			withMetadataFieldName: 'Pages',
			order: CustomSortOrder.byMetadataFieldAlphabeticalReverse
		}, {
			type: CustomSortGroupType.HasIcon,
			filesOnly: true
		}, {
			type: CustomSortGroupType.HasIcon,
			iconName: 'RiClock24'
		}, {
			type: CustomSortGroupType.StarredOnly
		}, {
			type: CustomSortGroupType.StarredOnly,
			filesOnly: true
		}, {
			type: CustomSortGroupType.StarredOnly,
			foldersOnly: true
		}, {
			type: CustomSortGroupType.Outsiders
		}],
		outsidersGroupIdx: 7,
		targetFoldersPaths: [
			'tricky folder 2'
		]
	},
	"folder of bookmarks": {
		defaultOrder: CustomSortOrder.byBookmarkOrder,
		groups: [
			{
				filesOnly: true,
				order: CustomSortOrder.byBookmarkOrder,
				type: CustomSortGroupType.BookmarkedOnly
			},
			{
				exactText: "Abc",
				foldersOnly: true,
				order: CustomSortOrder.byBookmarkOrderReverse,
				type: CustomSortGroupType.ExactName
			},
			{
				type: CustomSortGroupType.Outsiders
			}
		],
		outsidersGroupIdx: 2,
		targetFoldersPaths: [
			"folder of bookmarks"
		]
	},
	"Conceptual model": {
		groups: [{
			exactText: "Entities",
			filesOnly: true,
			type: CustomSortGroupType.ExactName
		}, {
			type: CustomSortGroupType.Outsiders
		}],
		outsidersGroupIdx: 1,
		targetFoldersPaths: ['Conceptual model']
	},
	"/": {
		groups: [{
			exactPrefix: "Con",
			filesOnly: true,
			type: CustomSortGroupType.ExactPrefix
		}, {
			foldersOnly: true,
			order: CustomSortOrder.byModifiedTimeReverseAdvanced,
			type: CustomSortGroupType.Outsiders
		}, {
			filesOnly: true,
			order: CustomSortOrder.byModifiedTime,
			type: CustomSortGroupType.Outsiders
		}, {
			exactPrefix: "Ref",
			filesOnly: true,
			type: CustomSortGroupType.ExactPrefix
		}, {
			exactPrefix: "Att",
			exactSuffix: "ch",
			filesOnly: true,
			type: CustomSortGroupType.ExactHeadAndTail
		}, {
			exactPrefix: "sort",
			exactSuffix: "spec",
			type: CustomSortGroupType.ExactHeadAndTail
		}, {
			exactText: "sortspec.md",
			filesOnly: true,
			matchFilenameWithExt: true,
			type: CustomSortGroupType.ExactName
		}],
		outsidersFilesGroupIdx: 2,
		outsidersFoldersGroupIdx: 1,
		targetFoldersPaths: ['/']
	},
	"Sandbox": {
		defaultOrder: CustomSortOrder.byModifiedTimeReverse,
		groups: [{
			exactText: "adfsasda",
			filesOnly: true,
			type: CustomSortGroupType.ExactName
		}, {
			exactText: "sdsadasdsa",
			foldersOnly: true,
			order: CustomSortOrder.alphabeticalReverse,
			type: CustomSortGroupType.ExactName
		}, {
			exactText: "fdsfdsfdsfs",
			foldersOnly: true,
			order: CustomSortOrder.byCreatedTimeReverse,
			type: CustomSortGroupType.ExactName
		}, {
			type: CustomSortGroupType.Outsiders
		}],
		outsidersGroupIdx: 3,
		targetFoldersPaths: ['Sandbox']
	},
	"Abcd efgh ijk": {
		defaultOrder: CustomSortOrder.alphabeticalReverse,
		groups: [{
			exactPrefix: "Plain text spec bla bla bla (matches files and folders)",
			type: CustomSortGroupType.ExactPrefix
		}, {
			exactText: "files only matching",
			filesOnly: true,
			order: CustomSortOrder.alphabeticalReverse,
			matchFilenameWithExt: true,
			type: CustomSortGroupType.ExactName
		}, {
			exactText: "folders only matching",
			foldersOnly: true,
			order: CustomSortOrder.alphabetical,
			type: CustomSortGroupType.ExactName
		}, {
			exactText: "some-file (or folder)",
			type: CustomSortGroupType.ExactName
		}, {
			exactPrefix: "sort",
			exactSuffix: ".md",
			filesOnly: true,
			matchFilenameWithExt: true,
			type: CustomSortGroupType.ExactHeadAndTail
		}, {
			exactText: "Trailer item",
			type: CustomSortGroupType.ExactName
		}, {
			type: CustomSortGroupType.Outsiders
		}],
		outsidersGroupIdx: 6,
		targetFoldersPaths: ['Abcd efgh ijk']
	},
	"References": {
		groups: [{
			exactPrefix: "Recently",
			type: CustomSortGroupType.ExactPrefix
		}, {
			type: CustomSortGroupType.Outsiders
		}],
		outsidersGroupIdx: 1,
		targetFoldersPaths: ['References', 'Same rules as for References']
	},
	"Same rules as for References": {
		groups: [{
			exactPrefix: "Recently",
			type: CustomSortGroupType.ExactPrefix
		}, {
			type: CustomSortGroupType.Outsiders
		}],
		outsidersGroupIdx: 1,
		targetFoldersPaths: ['References', 'Same rules as for References']
	}
}

const expectedSortSpecsExampleSortingSymbols: { [key: string]: CustomSortSpec } = {
	"mock-folder": {
		groups: [{
			foldersOnly: true,
			type: CustomSortGroupType.ExactPrefix,
			regexPrefix: {
				regex: /^Chapter  *(\d+(?:\.\d+)*) /i,
				normalizerFn: CompoundDotNumberNormalizerFn
			}
		}, {
			filesOnly: true,
			type: CustomSortGroupType.ExactSuffix,
			regexSuffix: {
				regex: /section  *([MDCLXVI]+(?:-[MDCLXVI]+)*)\.$/i,
				normalizerFn: CompoundDashRomanNumberNormalizerFn
			}
		}, {
			type: CustomSortGroupType.ExactName,
			regexPrefix: {
				regex: /^Appendix  *(\d+(?:-\d+)*) \(attachments\)$/i,
				normalizerFn: CompoundDashNumberNormalizerFn
			}
		}, {
			type: CustomSortGroupType.ExactHeadAndTail,
			exactSuffix: ' works?',
			regexPrefix: {
				regex: /^Plain syntax *([MDCLXVI]+) /i,
				normalizerFn: RomanNumberNormalizerFn
			}
		}, {
			type: CustomSortGroupType.ExactHeadAndTail,
			exactPrefix: 'And this kind of',
			regexSuffix: {
				regex: /  *(\d+)plain syntax\?\?\?$/i,
				normalizerFn: NumberNormalizerFn
			}
		}, {
			type: CustomSortGroupType.ExactName,
			regexPrefix: {
				regex: /^Here goes ASCII word ([a-zA-Z]+)$/i,
				normalizerFn: IdentityNormalizerFn
			}
		}, {
			type: CustomSortGroupType.ExactName,
			regexPrefix: {
				regex: /^(\p{Letter}+)\. is for any modern language word$/iu,
				normalizerFn: IdentityNormalizerFn
			}
		}, {
			type: CustomSortGroupType.Outsiders
		}],
		targetFoldersPaths: ['mock-folder'],
		outsidersGroupIdx: 7
	}
}

const txtInputExampleSortingSymbols: string = `
/folders Chapter \\.d+ ...  
/:files ...section \\-r+.
% Appendix \\-d+ (attachments)
Plain syntax\\R+ ... works?
And this kind of... \\D+plain syntax???
Here goes ASCII word \\a+
\\A+. is for any modern language word
`

describe('SortingSpecProcessor', () => {
	let processor: SortingSpecProcessor;
	beforeEach(() => {
		processor = new SortingSpecProcessor();
	});
	it('should generate correct SortSpecs (complex example A)', () => {
		const inputTxtArr: Array<string> = txtInputExampleA.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result?.sortSpecByPath).toEqual(expectedSortSpecsExampleA)
	})
	it('should generate correct SortSpecs (complex example A verbose)', () => {
		const inputTxtArr: Array<string> = txtInputExampleAVerbose.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result?.sortSpecByPath).toEqual(expectedSortSpecsExampleA)
	})
	it('should generate correct SortSpecs (example with sorting symbols)', () => {
		const inputTxtArr: Array<string> = txtInputExampleSortingSymbols.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result?.sortSpecByPath).toEqual(expectedSortSpecsExampleSortingSymbols)
	})
})

const txtInputNotDuplicatedSortSpec: string = `
target-folder: AAA
> A-Z
target-folder: BBB
% Whatever ...
`

const expectedSortSpecsNotDuplicatedSortSpec: { [key: string]: CustomSortSpec } = {
	"AAA": {
		defaultOrder: CustomSortOrder.alphabeticalReverse,
		groups: [{
			type: CustomSortGroupType.Outsiders
		}],
		outsidersGroupIdx: 0,
		targetFoldersPaths: ['AAA']
	},
	"BBB": {
		groups: [{
			exactPrefix: "Whatever ",
			type: CustomSortGroupType.ExactPrefix
		}, {
			type: CustomSortGroupType.Outsiders
		}],
		outsidersGroupIdx: 1,
		targetFoldersPaths: ['BBB']
	}
}

describe('SortingSpecProcessor', () => {
	let processor: SortingSpecProcessor;
	beforeEach(() => {
		processor = new SortingSpecProcessor();
	});
	it('should not duplicate spec if former target-folder had some attribute specified', () => {
		const inputTxtArr: Array<string> = txtInputNotDuplicatedSortSpec.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result?.sortSpecByPath).toEqual(expectedSortSpecsNotDuplicatedSortSpec)
	})
})

const txtInputStandardObsidianSortAttr: string = `
target-folder: AAA
sorting: standard
/ Some folder
 < standard
`

const expectedSortSpecForObsidianStandardSorting: { [key: string]: CustomSortSpec } = {
	"AAA": {
		defaultOrder: CustomSortOrder.standardObsidian,
		groups: [{
			exactText: 'Some folder',
			foldersOnly: true,
			order: CustomSortOrder.standardObsidian,
			type: CustomSortGroupType.ExactName
		}, {
			type: CustomSortGroupType.Outsiders
		}],
		outsidersGroupIdx: 1,
		targetFoldersPaths: ['AAA']
	}
}

describe('SortingSpecProcessor', () => {
	let processor: SortingSpecProcessor;
	beforeEach(() => {
		processor = new SortingSpecProcessor();
	});
	it('should recognize the standard Obsidian sorting attribute for a folder', () => {
		const inputTxtArr: Array<string> = txtInputStandardObsidianSortAttr.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result?.sortSpecByPath).toEqual(expectedSortSpecForObsidianStandardSorting)
	})
})

const txtInputFilesOrFoldersPreferred: string = `
target-folder: AAA
< a-z, files-first
subitems1...
  > folders-first, true a-z.
subitems2...
  < created, folders-first
`

const expectedSortSpecForFilesOrFoldersPreferred: { [key: string]: CustomSortSpec } = {
	"AAA": {
		defaultOrder: CustomSortOrder.alphabetical,
		defaultSecondaryOrder: CustomSortOrder.fileFirst,
		groups: [{
			exactPrefix: 'subitems1',
			order: CustomSortOrder.folderFirst,
			secondaryOrder: CustomSortOrder.trueAlphabeticalWithFileExt,
			type: CustomSortGroupType.ExactPrefix
		},{
			exactPrefix: 'subitems2',
			order: CustomSortOrder.byCreatedTime,
			secondaryOrder: CustomSortOrder.folderFirst,
			type: CustomSortGroupType.ExactPrefix
		}, {
			type: CustomSortGroupType.Outsiders
		}],
		outsidersGroupIdx: 2,
		targetFoldersPaths: ['AAA']
	}
}

describe('SortingSpecProcessor', () => {
	let processor: SortingSpecProcessor;
	beforeEach(() => {
		processor = new SortingSpecProcessor();
	});
	it('should recognize the files / folders preferred as a primary and secondary orders', () => {
		const inputTxtArr: Array<string> = txtInputFilesOrFoldersPreferred.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result?.sortSpecByPath).toEqual(expectedSortSpecForFilesOrFoldersPreferred)
	})
})

const txtInputThreeDotsCases: string = `
target-folder: AAA
...
....
         // Only in the below scenario the / is treated as empty-separator and swallowed
./...    
         // Below tricky and not obvious cases
../...
.../..
../...S
S.../..
S../...S
`

const expectedSortSpecForThreeDotsCases: { [key: string]: CustomSortSpec } = {
	"AAA": {
		groups: [{
			type: CustomSortGroupType.MatchAll
		},{
			exactSuffix: '.',
			type: CustomSortGroupType.ExactSuffix
		},{
			exactPrefix: '.',
			type: CustomSortGroupType.ExactPrefix
		},{
			exactPrefix: '..',
			type: CustomSortGroupType.ExactPrefix
		},{
			exactSuffix: '/..',
			type: CustomSortGroupType.ExactSuffix
		},{
			exactPrefix: '..',
			exactSuffix: 'S',
			type: CustomSortGroupType.ExactHeadAndTail
		},{
			exactPrefix: 'S',
			exactSuffix: '/..',
			type: CustomSortGroupType.ExactHeadAndTail
		},{
			exactPrefix: 'S..',
			exactSuffix: 'S',
			type: CustomSortGroupType.ExactHeadAndTail
		},{
			type: CustomSortGroupType.Outsiders
		}],
		outsidersGroupIdx: 8,
		targetFoldersPaths: ['AAA']
	}
}

describe('SortingSpecProcessor', () => {
	let processor: SortingSpecProcessor;
	beforeEach(() => {
		processor = new SortingSpecProcessor();
	});
	it('should correctly handle some of three-dots scenarios', () => {
		const inputTxtArr: Array<string> = txtInputThreeDotsCases.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result?.sortSpecByPath).toEqual(expectedSortSpecForThreeDotsCases)
	})
})

const txtInputTrueAlphabeticalSortAttr: string = `
target-folder: True Alpha
< true a-z
target-folder: True Alpha Rev
> true a-z
target-folder: True Alpha withExt
< true a-z.
target-folder: True Alpha Rev withExt
> true a-z.
target-folder: by-meta True Alpha
< true a-z by-metadata:
target-folder: by-meta True Alpha Rev
> true a-z by-metadata: Some-attr
`

const expectedSortSpecForTrueAlphabeticalSorting: { [key: string]: CustomSortSpec } = {
	"True Alpha": {
		defaultOrder: CustomSortOrder.trueAlphabetical,
		groups: [{
			type: CustomSortGroupType.Outsiders
		}],
		outsidersGroupIdx: 0,
		targetFoldersPaths: ['True Alpha']
	},
	"True Alpha Rev": {
		defaultOrder: CustomSortOrder.trueAlphabeticalReverse,
		groups: [{
			type: CustomSortGroupType.Outsiders
		}],
		outsidersGroupIdx: 0,
		targetFoldersPaths: ['True Alpha Rev']
	},
	"True Alpha withExt": {
		defaultOrder: CustomSortOrder.trueAlphabeticalWithFileExt,
		groups: [{
			type: CustomSortGroupType.Outsiders
		}],
		outsidersGroupIdx: 0,
		targetFoldersPaths: ['True Alpha withExt']
	},
	"True Alpha Rev withExt": {
		defaultOrder: CustomSortOrder.trueAlphabeticalReverseWithFileExt,
		groups: [{
			type: CustomSortGroupType.Outsiders
		}],
		outsidersGroupIdx: 0,
		targetFoldersPaths: ['True Alpha Rev withExt']
	},
	"by-meta True Alpha": {
		defaultOrder: CustomSortOrder.byMetadataFieldTrueAlphabetical,
		groups: [{
			type: CustomSortGroupType.Outsiders
		}],
		outsidersGroupIdx: 0,
		targetFoldersPaths: ['by-meta True Alpha']
	},
	"by-meta True Alpha Rev": {
		defaultOrder: CustomSortOrder.byMetadataFieldTrueAlphabeticalReverse,
		byMetadataField: 'Some-attr',
		groups: [{
			type: CustomSortGroupType.Outsiders
		}],
		outsidersGroupIdx: 0,
		targetFoldersPaths: ['by-meta True Alpha Rev']
	}
}

describe('SortingSpecProcessor', () => {
	let processor: SortingSpecProcessor;
	beforeEach(() => {
		processor = new SortingSpecProcessor();
	});
	it('should recognize the true alphabetical (and reverse) sorting attribute for a folder', () => {
		const inputTxtArr: Array<string> = txtInputTrueAlphabeticalSortAttr.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result?.sortSpecByPath).toEqual(expectedSortSpecForTrueAlphabeticalSorting)
	})
})


const txtInputExoticExperimentalSortAttr: string = `
target-folder: VS Code unicode lexicographic
%
  > unicode-charcode
< vsc-unicode
target-folder: VS Code unicode lexicographic reverse
%
  < unicode-charcode
> vsc-unicode
`

const expectedSortSpecForExoticExperimentalSorting: { [key: string]: CustomSortSpec } = {
	"VS Code unicode lexicographic": {
		defaultOrder: CustomSortOrder.vscUnicode,
		groups: [{
			type: CustomSortGroupType.Outsiders,
			order: CustomSortOrder.vscUnicodeReverse
		}],
		outsidersGroupIdx: 0,
		targetFoldersPaths: ['VS Code unicode lexicographic']
	},
	"VS Code unicode lexicographic reverse": {
		defaultOrder: CustomSortOrder.vscUnicodeReverse,
		groups: [{
			type: CustomSortGroupType.Outsiders,
			order: CustomSortOrder.vscUnicode
		}],
		outsidersGroupIdx: 0,
		targetFoldersPaths: ['VS Code unicode lexicographic reverse']
	}
}

describe('SortingSpecProcessor', () => {
	let processor: SortingSpecProcessor;
	beforeEach(() => {
		processor = new SortingSpecProcessor();
	});
	it('should recognize the exotic experimental sorting attribute for a folder', () => {
		const inputTxtArr: Array<string> = txtInputExoticExperimentalSortAttr.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result?.sortSpecByPath).toEqual(expectedSortSpecForExoticExperimentalSorting)
	})
})

const txtInputSimplistic1: string = `
target-folder: /*
/:files
/folders
`

const expectedSortSpecForSimplistic1: { [key: string]: CustomSortSpec } = {
	"/": {
		groups: [{
			filesOnly: true,
			type: CustomSortGroupType.Outsiders
		}, {
			foldersOnly: true,
			type: CustomSortGroupType.Outsiders
		}],
		outsidersFilesGroupIdx: 0,
		outsidersFoldersGroupIdx: 1,
		targetFoldersPaths: ['/*']
	}
}

const expectedWildcardMatchingTreeForSimplistic1 = {
	"matchAll": {
		groups: [{
			filesOnly: true,
			type: CustomSortGroupType.Outsiders
		}, {
			foldersOnly: true,
			type: CustomSortGroupType.Outsiders
		}],
		outsidersFilesGroupIdx: 0,
		outsidersFoldersGroupIdx: 1,
		targetFoldersPaths: ['/*']
	},
	"subtree": {}
}

const txtInputSimplistic2: string = `
target-folder: /
/:files
/folders
`

const expectedSortSpecForSimplistic2: { [key: string]: CustomSortSpec } = {
	"/": {
		groups: [{
			filesOnly: true,
			type: CustomSortGroupType.Outsiders
		}, {
			foldersOnly: true,
			type: CustomSortGroupType.Outsiders
		}],
		outsidersFilesGroupIdx: 0,
		outsidersFoldersGroupIdx: 1,
		targetFoldersPaths: ['/']
	}
}

describe('SortingSpecProcessor', () => {
	let processor: SortingSpecProcessor;
	beforeEach(() => {
		processor = new SortingSpecProcessor();
	});
	it('should recognize the simplistic sorting spec to put files first (wildcard /* rule)', () => {
		const inputTxtArr: Array<string> = txtInputSimplistic1.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result?.sortSpecByPath).toEqual(expectedSortSpecForSimplistic1)
		expect(result?.sortSpecByWildcard?.tree).toEqual(expectedWildcardMatchingTreeForSimplistic1)
	})
	it('should recognize the simplistic sorting spec to put files first (direct / rule)', () => {
		const inputTxtArr: Array<string> = txtInputSimplistic2.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result?.sortSpecByPath).toEqual(expectedSortSpecForSimplistic2)
		expect(result?.sortSpecByWildcard).toBeUndefined()
	})
})

const txtInputItemsToHideWithDupsSortSpec: string = `
target-folder: AAA
/--hide: SomeFileToHide.md
--% SomeFileToHide.md
--% SomeFolderToHide
/--hide: SomeFolderToHide
--% HideItRegardlessFileOrFolder
`

const expectedHiddenItemsSortSpec: { [key: string]: CustomSortSpec } = {
	"AAA": {
		groups: [{
			type: CustomSortGroupType.Outsiders
		}],
		itemsToHide: new Set(['SomeFileToHide.md', 'SomeFolderToHide', 'HideItRegardlessFileOrFolder']),
		outsidersGroupIdx: 0,
		targetFoldersPaths: ['AAA']
	}
}

describe('SortingSpecProcessor bonus experimental feature', () => {
	let processor: SortingSpecProcessor;
	beforeEach(() => {
		processor = new SortingSpecProcessor();
	});
	it('should correctly parse list of items to hide', () => {
		const inputTxtArr: Array<string> = txtInputItemsToHideWithDupsSortSpec.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		// REMARK: be careful with examining Set object
		expect(result?.sortSpecByPath).toEqual(expectedHiddenItemsSortSpec)
	})
})

const txtInputItemsReadmeExample1Spec: string = `
// Less verbose versions of the spec,
// I know that at root level there will only folders matching
// the below names, so I can skip the /folders prefix
// I know there are no other root level folders and files
// so no need to specify order for them
target-folder: /
Projects
Areas
Responsibilities
Archive
/--hide: sortspec.md
`

const expectedReadmeExample1SortSpec: { [key: string]: CustomSortSpec } = {
	"/": {
		groups: [{
			exactText: 'Projects',
			type: CustomSortGroupType.ExactName
		}, {
			exactText: 'Areas',
			type: CustomSortGroupType.ExactName
		}, {
			exactText: 'Responsibilities',
			type: CustomSortGroupType.ExactName
		}, {
			exactText: 'Archive',
			type: CustomSortGroupType.ExactName
		}, {
			type: CustomSortGroupType.Outsiders
		}],
		itemsToHide: new Set(['sortspec.md']),
		outsidersGroupIdx: 4,
		targetFoldersPaths: ['/']
	}
}

describe('SortingSpecProcessor - README.md examples', () => {
	let processor: SortingSpecProcessor;
	beforeEach(() => {
		processor = new SortingSpecProcessor();
	});
	it('should correctly parse example 1', () => {
		const inputTxtArr: Array<string> = txtInputItemsReadmeExample1Spec.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		// REMARK: be careful with examining Set object
		expect(result?.sortSpecByPath).toEqual(expectedReadmeExample1SortSpec)
	})
})

const txtInputEmptySpecOnlyTargetFolder: string = `
target-folder: BBB
`

const expectedSortSpecsOnlyTargetFolder: { [key: string]: CustomSortSpec } = {
	"BBB": {
		groups: [{
			type: CustomSortGroupType.Outsiders
		}],
		outsidersGroupIdx: 0,
		targetFoldersPaths: ['BBB']
	}
}

const txtInputTargetFolderAsDot: string = `
  // Let me introduce a comment here ;-) to ensure it is ignored
target-folder: .
target-folder: CCC
target-folder: ./sub
target-folder: ./*
target-folder: ./...
//target-folder: ./.../
  // This comment should be ignored as well
`

const expectedSortSpecToBeMultiplied = {
	groups: [{
		type: CustomSortGroupType.Outsiders
	}],
	outsidersGroupIdx: 0,
	targetFoldersPaths: ['mock-folder', 'CCC', 'mock-folder/sub', "mock-folder/*", "mock-folder/..."]
}

const expectedSortSpecsTargetFolderAsDot: { [key: string]: CustomSortSpec } = {
	'mock-folder': expectedSortSpecToBeMultiplied,
	'CCC': expectedSortSpecToBeMultiplied,
	'mock-folder/sub': expectedSortSpecToBeMultiplied
}

describe('SortingSpecProcessor edge case', () => {
	let processor: SortingSpecProcessor;
	beforeEach(() => {
		processor = new SortingSpecProcessor();
	});
	it('should recognize empty spec containing only target folder', () => {
		const inputTxtArr: Array<string> = txtInputEmptySpecOnlyTargetFolder.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result?.sortSpecByPath).toEqual(expectedSortSpecsOnlyTargetFolder)
	})
	it('should recognize and correctly replace dot as the target folder', () => {
		const inputTxtArr: Array<string> = txtInputTargetFolderAsDot.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result?.sortSpecByPath).toEqual(expectedSortSpecsTargetFolderAsDot)
		expect(result?.sortSpecByWildcard).not.toBeNull()
	})
})

const txtInputTargetFolderByName: string = `
target-folder: name: TheName
< a-z
`

const txtInputTargetFolderWithRegex: string = `
> advanced modified
target-folder: name: TheName
< a-z
target-folder: regexp: r1
target-folder: regexp: /!!: r2*
target-folder: regexp: for-name: r3.{2-3}$
target-folder: regexp: for-name: /!: r4\\d
target-folder: regexp: for-name: /!!: ^r5[^[]+
target-folder: regexp: for-name: /!!!: ^r6/+$
target-folder: regexp: debug: r7 +
target-folder: regexp: for-name: debug: r8 (aa|bb|cc)
target-folder: regexp: for-name: /!!!: debug: r9 [abc]+
target-folder: regexp: /!: debug: ^r10 /[^/]/.+$
`

const expectedSortSpecTargetFolderRegexAndName1 = {
	defaultOrder: CustomSortOrder.byModifiedTimeReverseAdvanced,
	groups: [{
		type: CustomSortGroupType.Outsiders
	}],
	outsidersGroupIdx: 0,
	targetFoldersPaths: ['mock-folder']
}

const expectedSortSpecTargetFolderByName = {
	defaultOrder: CustomSortOrder.alphabetical,
	groups: [{
		type: CustomSortGroupType.Outsiders
	}],
	outsidersGroupIdx: 0,
	targetFoldersPaths: ['name: TheName']
}

const expectedSortSpecsTargetFolderByPathInRegexTestCase: { [key: string]: CustomSortSpec } = {
	'mock-folder': expectedSortSpecTargetFolderRegexAndName1
}

const expectedSortSpecsTargetFolderByName: { [key: string]: CustomSortSpec } = {
	'TheName': expectedSortSpecTargetFolderByName
}

const expectedSortSpecForRegexpTextCase = {
	groups: [{
		type: CustomSortGroupType.Outsiders
	}],
	outsidersGroupIdx: 0,
	targetFoldersPaths: [
		"regexp: r1",
		"regexp: /!!: r2*",
		"regexp: for-name: r3.{2-3}$",
		"regexp: for-name: /!: r4\\d",
		"regexp: for-name: /!!: ^r5[^[]+",
		"regexp: for-name: /!!!: ^r6/+$",
		"regexp: debug: r7 +",
		"regexp: for-name: debug: r8 (aa|bb|cc)",
		"regexp: for-name: /!!!: debug: r9 [abc]+",
		"regexp: /!: debug: ^r10 /[^/]/.+$"
	]
}

const expectedTargetFolderRegexpArr: Array<FolderMatchingRegexp<CustomSortSpec>> = [
	{
		regexp: /r9 [abc]+/,
		againstName: true,
		priority: 3,
		logMatches: true,
		sortingSpec: expectedSortSpecForRegexpTextCase
	},
	{
		regexp: /^r6\/+$/,
		againstName: true,
		priority: 3,
		logMatches: false,
		sortingSpec: expectedSortSpecForRegexpTextCase
	},
	{
		regexp: /^r5[^[]+/,
		againstName: true,
		priority: 2,
		logMatches: false,
		sortingSpec: expectedSortSpecForRegexpTextCase
	},
	{
		regexp: /r2*/,
		againstName: false,
		priority: 2,
		logMatches: false,
		sortingSpec: expectedSortSpecForRegexpTextCase
	},
	{
		regexp: /^r10 \/[^/]\/.+$/,
		againstName: false,
		priority: 1,
		logMatches: true,
		sortingSpec: expectedSortSpecForRegexpTextCase
	},
	{
		regexp: /r4\d/,
		againstName: true,
		priority: 1,
		logMatches: false,
		sortingSpec: expectedSortSpecForRegexpTextCase
	},
	{
		regexp: /r8 (aa|bb|cc)/,
		againstName: true,
		priority: 0,
		logMatches: true,
		sortingSpec: expectedSortSpecForRegexpTextCase
	},
	{
		regexp: /r7 +/,
		againstName: false,
		priority: 0,
		logMatches: true,
		sortingSpec: expectedSortSpecForRegexpTextCase
	},
	{
		regexp: /r3.{2-3}$/,
		againstName: true,
		priority: 0,
		logMatches: false,
		sortingSpec: expectedSortSpecForRegexpTextCase
	},
	{
		regexp: /r1/,
		againstName: false,
		priority: 0,
		logMatches: false,
		sortingSpec: expectedSortSpecForRegexpTextCase
	}
]

describe('SortingSpecProcessor target-folder by name and regex', () => {
	let processor: SortingSpecProcessor;
	beforeEach(() => {
		processor = new SortingSpecProcessor();
	});
	it('should correctly handle the by-name only target-folder', () => {
		const inputTxtArr: Array<string> = txtInputTargetFolderByName.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result?.sortSpecByPath).toBeUndefined()
		expect(result?.sortSpecByName).toEqual(expectedSortSpecsTargetFolderByName)
		expect(result?.sortSpecByWildcard).not.toBeNull()
	})
	it('should recognize and correctly parse target folder by name with and w/o regexp variants', () => {
		const inputTxtArr: Array<string> = txtInputTargetFolderWithRegex.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result?.sortSpecByPath).toEqual(expectedSortSpecsTargetFolderByPathInRegexTestCase)
		expect(result?.sortSpecByName).toEqual(expectedSortSpecsTargetFolderByName)
		expect(result?.sortSpecByWildcard?.tree).toEqual({subtree: {}})
		expect(result?.sortSpecByWildcard?.regexps).toEqual(expectedTargetFolderRegexpArr)
	})
})

const NOPRIO = 0
const PRIO1 = 1
const PRIO2 = 2
const PRIO3 = 3

const consumedTargetFolderRegexp: Array<ConsumedFolderMatchingRegexp> = [
	{
		regexp: /r4\d/,
		againstName: true,
		priority: undefined,
		log: true
	},	{
		regexp: /r4\d/,
		againstName: true,
		priority: PRIO1,
		log: true
	},	{
		regexp: /r4\d/,
		againstName: true,
		priority: PRIO2,
		log: true
	},	{
		regexp: /r4\d/,
		againstName: true,
		priority: PRIO3,
		log: true
	},
]

describe( 'consumeFolderByRegexpExpression', () => {
	// and accept priority in any order
	//    the last one is in effect
	// and accept multiple
	it.each([
			// Plain cases
		['for-name: /!: debug: r4\\d', PRIO1],
		['for-name: /!: debug: r4\\d', PRIO1],
		['/!!: for-name: debug: r4\\d', PRIO2],
		['/!: debug: for-name: r4\\d', PRIO1],
		['debug: for-name: /!!!: r4\\d', PRIO3],
		['debug: /!: for-name: r4\\d', PRIO1],
			// Cases with duplication of same
		['for-name: for-name: /!: debug: r4\\d', PRIO1],
		['for-name: /!: /!: debug: debug: r4\\d', PRIO1],
		['/!!: for-name: /!!: debug: r4\\d', PRIO2],
		['/!: debug: debug: for-name: r4\\d', PRIO1],
		['debug: for-name: /!!!:/!!!: r4\\d', PRIO3],
		['debug: /!: for-name: /!: r4\\d', PRIO1],
			// Cases with duplication of different priority
		['debug: /!!!: for-name: /!: r4\\d', PRIO1],
		['debug: /!: for-name: /!!: r4\\d', PRIO2],
		['debug: /!: for-name: /!!: /!!!: /!: /!!!: r4\\d', PRIO3],
	])('should recognize all modifiers in >%s< of priority %s', (regexpExpr: string, prio: number) => {
		const result: ConsumedFolderMatchingRegexp = consumeFolderByRegexpExpression(regexpExpr)
		expect(result).toEqual(consumedTargetFolderRegexp[prio])
	})
})

const txtInputPriorityGroups1: string = `
target-folder: /
/:files
/folders
/! /:files Fi...
/!! /folders Fo...
/!!! ...def!
Plain text
/! % Anything
`

const txtInputPriorityGroups2: string = `
target-folder: /
/! /:files Fi...
/!! /folders Fo...
/!!! ...def!
/! Anything
`

const expectedSortSpecForPriorityGroups1: { [key: string]: CustomSortSpec } = {
	"/": {
		groups: [{
			filesOnly: true,
			type: CustomSortGroupType.Outsiders
		}, {
			foldersOnly: true,
			type: CustomSortGroupType.Outsiders
		}, {
			exactPrefix: "Fi",
			filesOnly: true,
			priority: 1,
			type: CustomSortGroupType.ExactPrefix
		}, {
			exactPrefix: "Fo",
			foldersOnly: true,
			priority: 2,
			type: CustomSortGroupType.ExactPrefix
		}, {
			exactSuffix: "def!",
			priority: 3,
			type: CustomSortGroupType.ExactSuffix
		}, {
			exactText: "Plain text",
			type: CustomSortGroupType.ExactName
		},{
			exactText: "Anything",
			priority: 1,
			type: CustomSortGroupType.ExactName
		}],
		outsidersFilesGroupIdx: 0,
		outsidersFoldersGroupIdx: 1,
		targetFoldersPaths: ['/'],
		priorityOrder: [4,3,2,6,5]
	}
}

const expectedSortSpecForPriorityGroups2: { [key: string]: CustomSortSpec } = {
	"/": {
		groups: [{
			exactPrefix: "Fi",
			filesOnly: true,
			priority: 1,
			type: CustomSortGroupType.ExactPrefix
		}, {
			exactPrefix: "Fo",
			foldersOnly: true,
			priority: 2,
			type: CustomSortGroupType.ExactPrefix
		}, {
			exactSuffix: "def!",
			priority: 3,
			type: CustomSortGroupType.ExactSuffix
		}, {
			exactText: "Anything",
			priority: 1,
			type: CustomSortGroupType.ExactName
		}, {
			type: CustomSortGroupType.Outsiders
		}],
		outsidersGroupIdx: 4,
		targetFoldersPaths: ['/'],
		priorityOrder: [2,1,0,3]
	}
}

const expectedSortSpecForPriorityAndCombineGroups: { [key: string]: CustomSortSpec } = {
	"/": {
		groups: [{
			combineWithIdx: 0,
			exactPrefix: "Fi",
			filesOnly: true,
			priority: 1,
			type: CustomSortGroupType.ExactPrefix
		}, {
			combineWithIdx: 0,
			exactPrefix: "Fo",
			foldersOnly: true,
			priority: 2,
			type: CustomSortGroupType.ExactPrefix
		}, {
			exactSuffix: "def!",
			priority: 3,
			type: CustomSortGroupType.ExactSuffix
		}, {
			exactText: "Anything",
			priority: 1,
			type: CustomSortGroupType.ExactName
		}, {
			type: CustomSortGroupType.Outsiders
		}],
		outsidersGroupIdx: 4,
		targetFoldersPaths: ['/'],
		priorityOrder: [2,1,0,3]
	}
}

describe('SortingSpecProcessor', () => {
	let processor: SortingSpecProcessor;
	beforeEach(() => {
		processor = new SortingSpecProcessor();
	});
	it('should recognize the sorting groups with priority example 1', () => {
		const inputTxtArr: Array<string> = txtInputPriorityGroups1.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result?.sortSpecByPath).toEqual(expectedSortSpecForPriorityGroups1)
		expect(result?.sortSpecByWildcard).toBeUndefined()
	})
	it('should recognize the sorting groups with priority example 2', () => {
		const inputTxtArr: Array<string> = txtInputPriorityGroups2.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result?.sortSpecByPath).toEqual(expectedSortSpecForPriorityGroups2)
		expect(result?.sortSpecByWildcard).toBeUndefined()
	})
	it('should recognize the combine and priority prefixes in any order example 1', () => {
		const inputTxtArr: Array<string> = `
			target-folder: /
			/! /+ /:files Fi...
			/!! /+ /folders Fo...
			/!!! ...def!
			/! Anything
			`.replace(/\t/gi, '').split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result?.sortSpecByPath).toEqual(expectedSortSpecForPriorityAndCombineGroups)
		expect(result?.sortSpecByWildcard).toBeUndefined()
	})
	it('should recognize the combine and priority prefixes in any order example 2', () => {
		const inputTxtArr: Array<string> = `
			target-folder: /
			/+ /! /:files Fi...
			/+ /!! /folders Fo...
			/!!! ...def!
			/! Anything
			`.replace(/\t/gi, '').split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result?.sortSpecByPath).toEqual(expectedSortSpecForPriorityAndCombineGroups)
		expect(result?.sortSpecByWildcard).toBeUndefined()
	})
	it('should accept the combine operator in single line only', () => {
		const inputTxtArr: Array<string> = `
			target-folder: /
			/+ /:files Fi...
			/folders Fo...
			`.replace(/\t/gi, '').split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result?.sortSpecByPath).toEqual({
			"/": {
				groups: [{
					combineWithIdx: 0,
					exactPrefix: "Fi",
					filesOnly: true,
					type: CustomSortGroupType.ExactPrefix
				}, {
					exactPrefix: "Fo",
					foldersOnly: true,
					type: CustomSortGroupType.ExactPrefix
				}, {
					type: CustomSortGroupType.Outsiders
				}],
				outsidersGroupIdx: 2,
				targetFoldersPaths: ['/']
			}
		})
		expect(result?.sortSpecByWildcard).toBeUndefined()
	})
	it('should correctly parse combine operator, apply explicit sorting to combined groups', () => {
		const inputTxtArr: Array<string> = `
			target-folder: /
			Nothing
			 > a-z
			/+ /:files Fi...
			/+ /folders Fo...
			... Separator
			/+ Abc...
			/+ ...Def
			/+ ...
			 > modified
			Unreachable line
			`.replace(/\t/gi, '').split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result?.sortSpecByPath).toEqual({
			"/": {
				groups: [{
					exactText: "Nothing",
					order: CustomSortOrder.alphabeticalReverse,
					type: CustomSortGroupType.ExactName
				}, {
					combineWithIdx: 1,
					exactPrefix: "Fi",
					filesOnly: true,
					type: CustomSortGroupType.ExactPrefix
				}, {
					combineWithIdx: 1,
					exactPrefix: "Fo",
					foldersOnly: true,
					type: CustomSortGroupType.ExactPrefix
				}, {
					exactSuffix: " Separator",
					type: CustomSortGroupType.ExactSuffix
				}, {
					combineWithIdx: 4,
					exactPrefix: "Abc",
					order: CustomSortOrder.byModifiedTimeReverse,
					type: CustomSortGroupType.ExactPrefix
				}, {
					combineWithIdx: 4,
					exactSuffix: "Def",
					order: CustomSortOrder.byModifiedTimeReverse,
					type: CustomSortGroupType.ExactSuffix
				}, {
					combineWithIdx: 4,
					order: CustomSortOrder.byModifiedTimeReverse,
					type: CustomSortGroupType.MatchAll
				}, {
					exactText: "Unreachable line",
					type: CustomSortGroupType.ExactName
				}, {
					type: CustomSortGroupType.Outsiders
				}],
				outsidersGroupIdx: 8,
				targetFoldersPaths: ['/']
			}
		})
		expect(result?.sortSpecByWildcard).toBeUndefined()
	})
	it('should correctly parse combine operator, apply explicit complex sorting to combined groups', () => {
		const inputTxtArr: Array<string> = `
			target-folder: /
			< created, a-z desc by-metadata: someMdataFld  // intentionally folder-level, to confirm no inheritance folder->groups
			Nothing
			 > a-z, a-z
			/+ /:files Fi...
			/+ /folders Fo...
			... Separator  
			/+ Abc...
			/+ ...Def
			/+ ...
			 < a-z by-metadata: abc-def, true a-z asc by-metadata: ghi-jkl1
			Unreachable line
			`.replace(/\t/gi, '').split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result?.sortSpecByPath).toEqual({
			"/": {
				defaultOrder: CustomSortOrder.byCreatedTime,
				defaultSecondaryOrder: CustomSortOrder.byMetadataFieldAlphabeticalReverse,
				byMetadataFieldSecondary: "someMdataFld",
				groups: [{
					exactText: "Nothing",
					order: CustomSortOrder.alphabeticalReverse,
					secondaryOrder: CustomSortOrder.alphabetical,
					type: CustomSortGroupType.ExactName
				}, {
					combineWithIdx: 1,
					exactPrefix: "Fi",
					filesOnly: true,
					type: CustomSortGroupType.ExactPrefix
				}, {
					combineWithIdx: 1,
					exactPrefix: "Fo",
					foldersOnly: true,
					type: CustomSortGroupType.ExactPrefix
				}, {
					exactSuffix: " Separator",
					type: CustomSortGroupType.ExactSuffix
				}, {
					combineWithIdx: 4,
					exactPrefix: "Abc",
					order: CustomSortOrder.byMetadataFieldAlphabetical,
					byMetadataField: "abc-def",
					secondaryOrder: CustomSortOrder.byMetadataFieldTrueAlphabetical,
					byMetadataFieldSecondary: "ghi-jkl1",
					type: CustomSortGroupType.ExactPrefix
				}, {
					combineWithIdx: 4,
					exactSuffix: "Def",
					order: CustomSortOrder.byMetadataFieldAlphabetical,
					byMetadataField: "abc-def",
					secondaryOrder: CustomSortOrder.byMetadataFieldTrueAlphabetical,
					byMetadataFieldSecondary: "ghi-jkl1",
					type: CustomSortGroupType.ExactSuffix
				}, {
					combineWithIdx: 4,
					order: CustomSortOrder.byMetadataFieldAlphabetical,
					byMetadataField: "abc-def",
					secondaryOrder: CustomSortOrder.byMetadataFieldTrueAlphabetical,
					byMetadataFieldSecondary: "ghi-jkl1",
					type: CustomSortGroupType.MatchAll
				}, {
					exactText: "Unreachable line",
					type: CustomSortGroupType.ExactName
				}, {
					type: CustomSortGroupType.Outsiders
				}],
				outsidersGroupIdx: 8,
				targetFoldersPaths: ['/']
			}
		})
		expect(result?.sortSpecByWildcard).toBeUndefined()
	})
})

const txtInputStandardSortingVariants1: string = `
sorting: standard, sorting: ui selected
/folders:files
  > ui selected desc, standard asc
`

const txtInputStandardSortingVariants2: string = `
order-desc: standard desc, < ui selected asc
/folders:files
  sorting: ui selected asc, order-desc: standard desc
`

const expectedSortSpecsStandardSortingVariants: { [key: string]: CustomSortSpec } = {
	"mock-folder": {
		defaultOrder: CustomSortOrder.standardObsidian,
		defaultSecondaryOrder: CustomSortOrder.standardObsidian,
		groups: [{
			order: CustomSortOrder.standardObsidian,
			secondaryOrder: CustomSortOrder.standardObsidian,
			type: CustomSortGroupType.Outsiders
		}],
		outsidersGroupIdx: 0,
		targetFoldersPaths: ['mock-folder']
	}
}

describe('standard sorting (aka Obsidian UI selected)', () => {
	let processor: SortingSpecProcessor;
	beforeEach(() => {
		processor = new SortingSpecProcessor();
	});
	it('should recognize variants of the syntax', () => {
		const inputTxtArr: Array<string> = txtInputStandardSortingVariants1.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result?.sortSpecByPath).toEqual(expectedSortSpecsStandardSortingVariants)
	})
	it('ignores any direction specified in any way', () => {
		const inputTxtArr: Array<string> = txtInputStandardSortingVariants2.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result?.sortSpecByPath).toEqual(expectedSortSpecsStandardSortingVariants)
	})
})

describe('comments and higher level specs in sorting order spec', () => {
	let processor: SortingSpecProcessor;
	beforeEach(() => {
		processor = new SortingSpecProcessor();
	});
	it('can occur at the end of line', () => {
		const inputTxtArr: Array<string> = `
		> created // An inline comment in sorting order specification
		`.replace(/\t/gi, '').split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result?.sortSpecByPath).toEqual({
			"mock-folder": {
				defaultOrder: CustomSortOrder.byCreatedTimeReverse,
				groups: [{
					type: CustomSortGroupType.Outsiders
				}],
				outsidersGroupIdx: 0,
				targetFoldersPaths: ['mock-folder']
			}
		})
		expect(result?.sortSpecByWildcard).toBeUndefined()
	})
	it('inline always span to the end of line', () => {
		const inputTxtArr: Array<string> = `
		> created //, > modified   <-- he he, the // take it all
		`.replace(/\t/gi, '').split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result?.sortSpecByPath).toEqual({
			"mock-folder": {
				defaultOrder: CustomSortOrder.byCreatedTimeReverse,
				groups: [{
					type: CustomSortGroupType.Outsiders
				}],
				outsidersGroupIdx: 0,
				targetFoldersPaths: ['mock-folder']
			}
		})
		expect(result?.sortSpecByWildcard).toBeUndefined()
	})
	it('ignore 3rd+ sorting level specs', () => {
		const inputTxtArr: Array<string> = `
		> created, < modified, a-z, < true a-z 
		`.replace(/\t/gi, '').split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result?.sortSpecByPath).toEqual({
			"mock-folder": {
				defaultOrder: CustomSortOrder.byCreatedTimeReverse,
				defaultSecondaryOrder: CustomSortOrder.byModifiedTime,
				groups: [{
					type: CustomSortGroupType.Outsiders
				}],
				outsidersGroupIdx: 0,
				targetFoldersPaths: ['mock-folder']
			}
		})
		expect(result?.sortSpecByWildcard).toBeUndefined()
	})
})

describe('multi-level sorting', () => {
	let processor: SortingSpecProcessor;
	beforeEach(() => {
		processor = new SortingSpecProcessor();
	});
	it('should accept direction lexemes in prefix and postfix notations, various variants', () => {
		const inputTxtArr: Array<string> = `
		a pre
		  order-asc: true a-z, order-asc: modified
		a pre 2
		  order-asc: true a-z., < modified
		a post 1
		  order-asc: true a-z, modified order-asc
		a post 2
		  order-asc: true a-z, modified asc
		a post
		  order-asc: true a-z, modified <
		a none
		  order-asc: true a-z, modified
		a unspecified
		  order-asc: true a-z, sorting: modified
		a dbl specified
		  order-asc: true a-z asc, < modified <
		d pre
		  order-desc: true a-z, order-desc: modified
		d pre 2
		  order-desc: true a-z, > modified
		d post 1
		  order-desc: true a-z, modified order-desc
		d post 2
		  order-desc: true a-z, modified desc
		d post
		  order-desc: true a-z, modified >
		d none
		  order-desc: true a-z., modified
		d unspecified
		  order-desc: true a-z, sorting: modified
		d dbl specified
		  order-desc: true a-z desc, > modified >
		`.replace(/\t/gi, '').split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result?.sortSpecByPath).toEqual({
			"mock-folder": {
				groups: [{
					exactText: "a pre",
					order: CustomSortOrder.trueAlphabetical,
					secondaryOrder: CustomSortOrder.byModifiedTime,
					type: CustomSortGroupType.ExactName
				},{
					exactText: "a pre 2",
					order: CustomSortOrder.trueAlphabeticalWithFileExt,
					secondaryOrder: CustomSortOrder.byModifiedTime,
					type: CustomSortGroupType.ExactName
				},{
					exactText: "a post 1",
					order: CustomSortOrder.trueAlphabetical,
					secondaryOrder: CustomSortOrder.byModifiedTime,
					type: CustomSortGroupType.ExactName
				},{
					exactText: "a post 2",
					order: CustomSortOrder.trueAlphabetical,
					secondaryOrder: CustomSortOrder.byModifiedTime,
					type: CustomSortGroupType.ExactName
				},{
					exactText: "a post",
					order: CustomSortOrder.trueAlphabetical,
					secondaryOrder: CustomSortOrder.byModifiedTime,
					type: CustomSortGroupType.ExactName
				},{
					exactText: "a none",
					order: CustomSortOrder.trueAlphabetical,
					secondaryOrder: CustomSortOrder.byModifiedTime,
					type: CustomSortGroupType.ExactName
				},{
					exactText: "a unspecified",
					order: CustomSortOrder.trueAlphabetical,
					secondaryOrder: CustomSortOrder.byModifiedTime,
					type: CustomSortGroupType.ExactName
				}, {
					exactText: "a dbl specified",
					order: CustomSortOrder.trueAlphabetical,
					secondaryOrder: CustomSortOrder.byModifiedTime,
					type: CustomSortGroupType.ExactName
				},{
					exactText: "d pre",
					order: CustomSortOrder.trueAlphabeticalReverse,
					secondaryOrder: CustomSortOrder.byModifiedTimeReverse,
					type: CustomSortGroupType.ExactName
				},{
					exactText: "d pre 2",
					order: CustomSortOrder.trueAlphabeticalReverse,
					secondaryOrder: CustomSortOrder.byModifiedTimeReverse,
					type: CustomSortGroupType.ExactName
				},{
					exactText: "d post 1",
					order: CustomSortOrder.trueAlphabeticalReverse,
					secondaryOrder: CustomSortOrder.byModifiedTimeReverse,
					type: CustomSortGroupType.ExactName
				},{
					exactText: "d post 2",
					order: CustomSortOrder.trueAlphabeticalReverse,
					secondaryOrder: CustomSortOrder.byModifiedTimeReverse,
					type: CustomSortGroupType.ExactName
				},{
					exactText: "d post",
					order: CustomSortOrder.trueAlphabeticalReverse,
					secondaryOrder: CustomSortOrder.byModifiedTimeReverse,
					type: CustomSortGroupType.ExactName
				},{
					exactText: "d none",
					order: CustomSortOrder.trueAlphabeticalReverseWithFileExt,
					secondaryOrder: CustomSortOrder.byModifiedTime,
					type: CustomSortGroupType.ExactName
				},{
					exactText: "d unspecified",
					order: CustomSortOrder.trueAlphabeticalReverse,
					secondaryOrder: CustomSortOrder.byModifiedTime,
					type: CustomSortGroupType.ExactName
				}, {
					exactText: "d dbl specified",
					order: CustomSortOrder.trueAlphabeticalReverse,
					secondaryOrder: CustomSortOrder.byModifiedTimeReverse,
					type: CustomSortGroupType.ExactName
				},{
					type: CustomSortGroupType.Outsiders
				}],
				outsidersGroupIdx: 16,
				targetFoldersPaths: ['mock-folder']
			}
		})
		expect(result?.sortSpecByWildcard).toBeUndefined()
	})
	it('should correctly parse legacy examples', () => {
		const inputTxtArr: Array<string> = `
		a c a
		  < a-z, created asc
		a c d
		  < a-z, created desc
		a ac a
		  < a-z., advanced created asc
		a ac d
		  < a-z, advanced created desc
		a m a
		  < a-z, modified asc
		a m d
		  < a-z, modified desc
		a am a
		  < a-z, advanced modified asc
		a am d
		  < a-z, advanced modified desc
		d c a
		  > a-z., created asc
		d c d
		  > a-z, created desc
		d ac a
		  > a-z, advanced created asc
		d ac d
		  > a-z, advanced created desc
		d m a
		  > a-z, modified asc
		d m d
		  > a-z, modified desc
		d am a
		  > a-z, advanced modified asc
		d am d
		  > a-z, advanced modified desc	
		`.replace(/\t/gi, '').split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result?.sortSpecByPath).toEqual({
			"mock-folder": {
				groups: [{
					exactText: "a c a",
					order: CustomSortOrder.alphabetical,
					secondaryOrder: CustomSortOrder.byCreatedTime,
					type: CustomSortGroupType.ExactName
				}, {
					exactText: "a c d",
					order: CustomSortOrder.alphabetical,
					secondaryOrder: CustomSortOrder.byCreatedTimeReverse,
					type: CustomSortGroupType.ExactName
				},{
					exactText: "a ac a",
					order: CustomSortOrder.alphabeticalWithFileExt,
					secondaryOrder: CustomSortOrder.byCreatedTimeAdvanced,
					type: CustomSortGroupType.ExactName
				},{
					exactText: "a ac d",
					order: CustomSortOrder.alphabetical,
					secondaryOrder: CustomSortOrder.byCreatedTimeReverseAdvanced,
					type: CustomSortGroupType.ExactName
				},{
					exactText: "a m a",
					order: CustomSortOrder.alphabetical,
					secondaryOrder: CustomSortOrder.byModifiedTime,
					type: CustomSortGroupType.ExactName
				},{
					exactText: "a m d",
					order: CustomSortOrder.alphabetical,
					secondaryOrder: CustomSortOrder.byModifiedTimeReverse,
					type: CustomSortGroupType.ExactName
				},{
					exactText: "a am a",
					order: CustomSortOrder.alphabetical,
					secondaryOrder: CustomSortOrder.byModifiedTimeAdvanced,
					type: CustomSortGroupType.ExactName
				},{
					exactText: "a am d",
					order: CustomSortOrder.alphabetical,
					secondaryOrder: CustomSortOrder.byModifiedTimeReverseAdvanced,
					type: CustomSortGroupType.ExactName
				},{
					exactText: "d c a",
					order: CustomSortOrder.alphabeticalReverseWithFileExt,
					secondaryOrder: CustomSortOrder.byCreatedTime,
					type: CustomSortGroupType.ExactName
				}, {
					exactText: "d c d",
					order: CustomSortOrder.alphabeticalReverse,
					secondaryOrder: CustomSortOrder.byCreatedTimeReverse,
					type: CustomSortGroupType.ExactName
				},{
					exactText: "d ac a",
					order: CustomSortOrder.alphabeticalReverse,
					secondaryOrder: CustomSortOrder.byCreatedTimeAdvanced,
					type: CustomSortGroupType.ExactName
				},{
					exactText: "d ac d",
					order: CustomSortOrder.alphabeticalReverse,
					secondaryOrder: CustomSortOrder.byCreatedTimeReverseAdvanced,
					type: CustomSortGroupType.ExactName
				},{
					exactText: "d m a",
					order: CustomSortOrder.alphabeticalReverse,
					secondaryOrder: CustomSortOrder.byModifiedTime,
					type: CustomSortGroupType.ExactName
				},{
					exactText: "d m d",
					order: CustomSortOrder.alphabeticalReverse,
					secondaryOrder: CustomSortOrder.byModifiedTimeReverse,
					type: CustomSortGroupType.ExactName
				},{
					exactText: "d am a",
					order: CustomSortOrder.alphabeticalReverse,
					secondaryOrder: CustomSortOrder.byModifiedTimeAdvanced,
					type: CustomSortGroupType.ExactName
				},{
					exactText: "d am d",
					order: CustomSortOrder.alphabeticalReverse,
					secondaryOrder: CustomSortOrder.byModifiedTimeReverseAdvanced,
					type: CustomSortGroupType.ExactName
				},{
					type: CustomSortGroupType.Outsiders
				}],
				outsidersGroupIdx: 16,
				targetFoldersPaths: ['mock-folder']
			}
		})
		expect(result?.sortSpecByWildcard).toBeUndefined()
	})
})

describe('the sorting: prefix', () => {
	let processor: SortingSpecProcessor;
	beforeEach(() => {
		processor = new SortingSpecProcessor();
	});
	it('should default to ascending, if not specified (primary only)', () => {
		const inputTxtArr: Array<string> = `
		sorting: a-z
		`.replace(/\t/gi, '').split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result?.sortSpecByPath).toEqual({
			'mock-folder': {
				defaultOrder: CustomSortOrder.alphabetical,
				groups: [{
					type: CustomSortGroupType.Outsiders
				}],
				outsidersGroupIdx: 0,
				targetFoldersPaths: ['mock-folder']
			}
		})
	})
	it('should default to ascending, if not specified (primary and secondary levels)', () => {
		const inputTxtArr: Array<string> = `
		sorting: true a-z, sorting: advanced modified
		`.replace(/\t/gi, '').split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result?.sortSpecByPath).toEqual({
			'mock-folder': {
				defaultOrder: CustomSortOrder.trueAlphabetical,
				defaultSecondaryOrder: CustomSortOrder.byModifiedTimeAdvanced,
				groups: [{
					type: CustomSortGroupType.Outsiders
				}],
				outsidersGroupIdx: 0,
				targetFoldersPaths: ['mock-folder']
			}
		})
	})
	it('should use postfix-specified direction (primary only)', () => {
		const inputTxtArr: Array<string> = `
		sorting: a-z desc
		`.replace(/\t/gi, '').split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result?.sortSpecByPath).toEqual({
			'mock-folder': {
				defaultOrder: CustomSortOrder.alphabeticalReverse,
				groups: [{
					type: CustomSortGroupType.Outsiders
				}],
				outsidersGroupIdx: 0,
				targetFoldersPaths: ['mock-folder']
			}
		})
	})
	it('should use postfix-specified direction (primary and secondary levels)', () => {
		const inputTxtArr: Array<string> = `
		sorting: true a-z order-desc, sorting: advanced modified desc
		`.replace(/\t/gi, '').split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result?.sortSpecByPath).toEqual({
			'mock-folder': {
				defaultOrder: CustomSortOrder.trueAlphabeticalReverse,
				defaultSecondaryOrder: CustomSortOrder.byModifiedTimeReverseAdvanced,
				groups: [{
					type: CustomSortGroupType.Outsiders
				}],
				outsidersGroupIdx: 0,
				targetFoldersPaths: ['mock-folder']
			}
		})
	})
	it('secondary should not inherit direction from primary', () => {
		const inputTxtArr: Array<string> = `
		/folders:files.
		  sorting: a-z. desc, sorting: advanced modified
		`.replace(/\t/gi, '').split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result?.sortSpecByPath).toEqual({
			'mock-folder': {
				groups: [{
					order: CustomSortOrder.alphabeticalReverseWithFileExt,
					secondaryOrder: CustomSortOrder.byModifiedTimeAdvanced,
					type: CustomSortGroupType.Outsiders
				}],
				outsidersGroupIdx: 0,
				targetFoldersPaths: ['mock-folder']
			}
		})
	})
})

const txtInputTargetFolderMultiSpecA: string = `
target-folder: .
< a-z
target-folder: ./*
> a-z
target-folder: ./.../
< modified
`

const txtInputTargetFolderMultiSpecB: string = `
target-folder: ./*
> a-z
target-folder: ./.../
< modified
target-folder: .
< a-z
`

const expectedSortSpecForMultiSpecAandB: { [key: string]: CustomSortSpec } = {
	'mock-folder': {
		defaultOrder: CustomSortOrder.alphabetical,
		groups: [{
			type: CustomSortGroupType.Outsiders
		}],
		outsidersGroupIdx: 0,
		targetFoldersPaths: ['mock-folder']
	}
}

const expectedWildcardMatchingTreeForMultiSpecAandB: FolderMatchingTreeNode<CustomSortSpec> = {
	subtree: {
		"mock-folder": {
			matchAll: {
				"defaultOrder": CustomSortOrder.alphabeticalReverse,
				"groups": [{
					"type": CustomSortGroupType.Outsiders
					}],
				"outsidersGroupIdx": 0,
				"targetFoldersPaths": ["mock-folder/*"]
			},
			matchChildren: {
				"defaultOrder": CustomSortOrder.byModifiedTime,
				"groups": [{
					"type": CustomSortGroupType.Outsiders
					}],
				"outsidersGroupIdx": 0,
				"targetFoldersPaths": ["mock-folder/.../"]
			},
			name: "mock-folder",
			subtree: {}
		}
	}
}

const txtInputTargetFolderMultiSpecC: string = `
target-folder: ./*
> a-z
target-folder: ./.../
`

const expectedSortSpecForMultiSpecC: { [key: string]: CustomSortSpec } = {
	'mock-folder': {
		groups: [{
			type: CustomSortGroupType.Outsiders
		}],
		outsidersGroupIdx: 0,
		targetFoldersPaths: ['mock-folder/.../']
	}
}

const expectedWildcardMatchingTreeForMultiSpecC: FolderMatchingTreeNode<CustomSortSpec> = {
	subtree: {
		"mock-folder": {
			matchAll: {
				"defaultOrder": CustomSortOrder.alphabeticalReverse,
				"groups": [{
					"type": CustomSortGroupType.Outsiders
				}],
				"outsidersGroupIdx": 0,
				"targetFoldersPaths": ["mock-folder/*"]
			},
			matchChildren: {
				"groups": [{
					"type": CustomSortGroupType.Outsiders
				}],
				"outsidersGroupIdx": 0,
				"targetFoldersPaths": ["mock-folder/.../"]
			},
			name: "mock-folder",
			subtree: {}
		}
	}
}

const txtInputTargetFolderMultiSpecD: string = `
target-folder: ./*
`

const txtInputTargetFolderMultiSpecD_implicitCase: string = `
  // typically implicit specs come context-free, no notion of current folder, that's why using explicit target-folder path
target-folder: mock-folder/*
  // Reverse order to distinguish between implicit and explicit spec
> a-z
`

const expectedSortSpecForMultiSpecD: { [key: string]: CustomSortSpec } = {
	'mock-folder': {
		groups: [{
			type: CustomSortGroupType.Outsiders
		}],
		outsidersGroupIdx: 0,
		targetFoldersPaths: ['mock-folder/*']
	}
}

const expectedSortSpecForMultiSpecD_implicitCase: { [key: string]: CustomSortSpec } = {
	'mock-folder': {
		defaultOrder: CustomSortOrder.alphabeticalReverse,
		groups: [{
			type: CustomSortGroupType.Outsiders
		}],
		outsidersGroupIdx: 0,
		targetFoldersPaths: ['mock-folder/*'],
		implicit: true
	}
}

const expectedWildcardMatchingTreeForMultiSpecD: FolderMatchingTreeNode<CustomSortSpec> = {
	subtree: {
		"mock-folder": {
			matchAll: {
				"groups": [{
					"type": CustomSortGroupType.Outsiders
				}],
				"outsidersGroupIdx": 0,
				"targetFoldersPaths": ["mock-folder/*"]
			},
			name: "mock-folder",
			subtree: {}
		}
	}
}

const expectedWildcardMatchingTreeForMultiSpecD_implicitCase: FolderMatchingTreeNode<CustomSortSpec> = {
	subtree: {
		"mock-folder": {
			matchAll: {
				defaultOrder: CustomSortOrder.alphabeticalReverse,
				"groups": [{
					"type": CustomSortGroupType.Outsiders
				}],
				"outsidersGroupIdx": 0,
				"targetFoldersPaths": ["mock-folder/*"],
				implicit: true
			},
			name: "mock-folder",
			subtree: {}
		}
	}
}

const txtInputTargetFolderMultiSpecE: string = `
target-folder: mock-folder/...
`

const txtInputTargetFolderMultiSpecE_implicitCase: string = `
  // typically implicit specs come context-free, no notion of current folder, that's why using explicit target-folder path
target-folder: mock-folder/...
  // Reverse order to distinguish between implicit and explicit spec
> a-z
`

const expectedSortSpecForMultiSpecE: { [key: string]: CustomSortSpec } = {
	'mock-folder': {
		groups: [{
			type: CustomSortGroupType.Outsiders
		}],
		outsidersGroupIdx: 0,
		targetFoldersPaths: ['mock-folder/...']
	}
}

const expectedSortSpecForMultiSpecE_implicitCase: { [key: string]: CustomSortSpec } = {
	'mock-folder': {
		defaultOrder: CustomSortOrder.alphabeticalReverse,
		groups: [{
			type: CustomSortGroupType.Outsiders
		}],
		outsidersGroupIdx: 0,
		targetFoldersPaths: ['mock-folder/...'],
		implicit: true
	}
}

const expectedWildcardMatchingTreeForMultiSpecE: FolderMatchingTreeNode<CustomSortSpec> = {
	subtree: {
		"mock-folder": {
			matchChildren: {
				"groups": [{
					"type": CustomSortGroupType.Outsiders
				}],
				"outsidersGroupIdx": 0,
				"targetFoldersPaths": ["mock-folder/..."]
			},
			name: "mock-folder",
			subtree: {}
		}
	}
}

const expectedWildcardMatchingTreeForMultiSpecE_implicitCase: FolderMatchingTreeNode<CustomSortSpec> = {
	subtree: {
		"mock-folder": {
			matchChildren: {
				defaultOrder: CustomSortOrder.alphabeticalReverse,
				"groups": [{
					"type": CustomSortGroupType.Outsiders
				}],
				"outsidersGroupIdx": 0,
				"targetFoldersPaths": ["mock-folder/..."],
				implicit: true
			},
			name: "mock-folder",
			subtree: {}
		}
	}
}

const expectedWildcardMatchingTreeForMultiSpecDplusE_implicitCase: FolderMatchingTreeNode<CustomSortSpec> = {
	subtree: {
		"mock-folder": {
			matchAll: {
				"groups": [{
					"type": CustomSortGroupType.Outsiders
				}],
				"outsidersGroupIdx": 0,
				"targetFoldersPaths": ["mock-folder/*"]
			},
			matchChildren: {
				defaultOrder: CustomSortOrder.alphabeticalReverse,
				"groups": [{
					"type": CustomSortGroupType.Outsiders
				}],
				"outsidersGroupIdx": 0,
				"targetFoldersPaths": ["mock-folder/..."],
				implicit: true
			},
			name: "mock-folder",
			subtree: {}
		}
	}
}

const txtInputTargetFolderMultiSpecF_implicitCase: string = `
  // typically implicit specs come context-free, no notion of current folder, that's why using explicit target-folder path
target-folder: mock-folder
  // Reverse order to distinguish between implicit and explicit spec
> a-z
`

const expectedSortSpecForMultiSpecF_implicitCase: { [key: string]: CustomSortSpec } = {
	'mock-folder': {
		defaultOrder: CustomSortOrder.alphabeticalReverse,
		groups: [{
			type: CustomSortGroupType.Outsiders
		}],
		outsidersGroupIdx: 0,
		targetFoldersPaths: ['mock-folder'],
		implicit: true
	}
}

describe('SortingSpecProcessor path wildcard priorities', () => {
	let processor: SortingSpecProcessor;
	beforeEach(() => {
		processor = new SortingSpecProcessor();
	});
	it('should not raise error for multiple spec for the same path and choose correct spec, case A', () => {
		const inputTxtArr: Array<string> = txtInputTargetFolderMultiSpecA.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result?.sortSpecByPath).toEqual(expectedSortSpecForMultiSpecAandB)
		expect(result?.sortSpecByWildcard?.tree).toEqual(expectedWildcardMatchingTreeForMultiSpecAandB)
	})
	it('should not raise error for multiple spec for the same path and choose correct spec, case B', () => {
		const inputTxtArr: Array<string> = txtInputTargetFolderMultiSpecB.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result?.sortSpecByPath).toEqual(expectedSortSpecForMultiSpecAandB)
		expect(result?.sortSpecByWildcard?.tree).toEqual(expectedWildcardMatchingTreeForMultiSpecAandB)
	})
	it('should not raise error for multiple spec for the same path and choose correct spec, case C', () => {
		const inputTxtArr: Array<string> = txtInputTargetFolderMultiSpecC.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result?.sortSpecByPath).toEqual(expectedSortSpecForMultiSpecC)
		expect(result?.sortSpecByWildcard?.tree).toEqual(expectedWildcardMatchingTreeForMultiSpecC)
	})
	it('should not raise error for multiple spec for the same path and choose correct spec, case D', () => {
		const inputTxtArr: Array<string> = txtInputTargetFolderMultiSpecD.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result?.sortSpecByPath).toEqual(expectedSortSpecForMultiSpecD)
		expect(result?.sortSpecByWildcard?.tree).toEqual(expectedWildcardMatchingTreeForMultiSpecD)
	})
	it('should not raise error for multiple spec for the same path and choose correct spec, case D - with implicit spec', () => {
		const inputTxtArrImplicit: Array<string> = txtInputTargetFolderMultiSpecD_implicitCase.split('\n')
		const resultImplicit = processor.parseSortSpecFromText(inputTxtArrImplicit, 'implicit ignored param', 'implicit ignored param', null, true)
		expect(resultImplicit?.sortSpecByPath).toEqual(expectedSortSpecForMultiSpecD_implicitCase)
		expect(resultImplicit?.sortSpecByWildcard?.tree).toEqual(expectedWildcardMatchingTreeForMultiSpecD_implicitCase)
		const inputTxtArrExplicit: Array<string> = txtInputTargetFolderMultiSpecD.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArrExplicit, 'mock-folder', 'custom-name-note.md', resultImplicit)
		expect(result?.sortSpecByPath).toEqual(expectedSortSpecForMultiSpecD)
		expect(result?.sortSpecByWildcard?.tree).toEqual(expectedWildcardMatchingTreeForMultiSpecD)
	})
	it('should not raise error for multiple spec for the same path and choose correct spec, case E', () => {
		const inputTxtArr: Array<string> = txtInputTargetFolderMultiSpecE.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result?.sortSpecByPath).toEqual(expectedSortSpecForMultiSpecE)
		expect(result?.sortSpecByWildcard?.tree).toEqual(expectedWildcardMatchingTreeForMultiSpecE)
	})
	it('should not raise error for multiple spec for the same path and choose correct spec, case E - with implicit spec', () => {
		const inputTxtArrImplicit: Array<string> = txtInputTargetFolderMultiSpecE_implicitCase.split('\n')
		const resultImplicit = processor.parseSortSpecFromText(inputTxtArrImplicit, 'implicit ignored param', 'implicit ignored param', null, true)
		expect(resultImplicit?.sortSpecByPath).toEqual(expectedSortSpecForMultiSpecE_implicitCase)
		expect(resultImplicit?.sortSpecByWildcard?.tree).toEqual(expectedWildcardMatchingTreeForMultiSpecE_implicitCase)
		const inputTxtArrExplicit: Array<string> = txtInputTargetFolderMultiSpecE.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArrExplicit, 'mock-folder', 'custom-name-note.md', resultImplicit)
		expect(result?.sortSpecByPath).toEqual(expectedSortSpecForMultiSpecE)
		expect(result?.sortSpecByWildcard?.tree).toEqual(expectedWildcardMatchingTreeForMultiSpecE)
	})
	it('should not raise error for multiple spec for the same path and choose correct spec, mixed case D+E - with implicit spec, which looses all', () => {
		const inputTxtArrImplicit: Array<string> = txtInputTargetFolderMultiSpecE_implicitCase.split('\n')
		const resultImplicit = processor.parseSortSpecFromText(inputTxtArrImplicit, 'implicit ignored param', 'implicit ignored param', null, true)
		expect(resultImplicit?.sortSpecByPath).toEqual(expectedSortSpecForMultiSpecE_implicitCase)
		expect(resultImplicit?.sortSpecByWildcard?.tree).toEqual(expectedWildcardMatchingTreeForMultiSpecE_implicitCase)
		const inputTxtArrExplicit: Array<string> = txtInputTargetFolderMultiSpecD.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArrExplicit, 'mock-folder', 'custom-name-note.md', resultImplicit)
		expect(result?.sortSpecByPath).toEqual(expectedSortSpecForMultiSpecD)
		expect(result?.sortSpecByWildcard?.tree).toEqual(expectedWildcardMatchingTreeForMultiSpecDplusE_implicitCase)
	})
	it('should not raise error for multiple spec for the same path and choose correct spec, mixed case E+F => implicit by name', () => {
		const inputTxtArrImplicit: Array<string> = txtInputTargetFolderMultiSpecF_implicitCase.split('\n')
		const resultImplicit = processor.parseSortSpecFromText(inputTxtArrImplicit, 'implicit ignored param', 'implicit ignored param', null, true)
		expect(resultImplicit?.sortSpecByPath).toEqual(expectedSortSpecForMultiSpecF_implicitCase)
		expect(resultImplicit?.sortSpecByWildcard?.tree).toBeUndefined()
		const inputTxtArrExplicit: Array<string> = txtInputTargetFolderMultiSpecE.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArrExplicit, 'mock-folder', 'custom-name-note.md', resultImplicit)
		expect(result?.sortSpecByPath).toEqual(expectedSortSpecForMultiSpecF_implicitCase)
		expect(result?.sortSpecByWildcard?.tree).toEqual(expectedWildcardMatchingTreeForMultiSpecE)
	})
})

const txtInputAdvancedFolderDateSortingMethods: string = `
target-folder: A
< advanced modified
target-folder: B
> advanced modified
target-folder: C
< advanced created
target-folder: D
> advanced created
target-folder: AA
/folders
 < advanced modified
/:files
 > advanced modified
/folders Archive...
 < advanced created
/:files Archive...
 > advanced created
/folders Deep1...
 < advanced recursive created
/:files Deep2...
 > advanced recursive created
/folders Deep3...
 < advanced recursive modified
/:files Deep4...
 > advanced recursive modified
`

const expectedSortSpecForAdvancedFolderDateSortingMethods: { [key: string]: CustomSortSpec } = {
	'A': {
		defaultOrder: CustomSortOrder.byModifiedTimeAdvanced,
		groups: [{
			type: CustomSortGroupType.Outsiders
		}],
		outsidersGroupIdx: 0,
		targetFoldersPaths: ['A']
	},
	'B': {
		defaultOrder: CustomSortOrder.byModifiedTimeReverseAdvanced,
		groups: [{
				type: CustomSortGroupType.Outsiders
		}],
		outsidersGroupIdx: 0,
		targetFoldersPaths: ['B']
	},
	'C': {
		defaultOrder: CustomSortOrder.byCreatedTimeAdvanced,
		groups: [{
				type: CustomSortGroupType.Outsiders
		}],
		outsidersGroupIdx: 0,
		targetFoldersPaths: ['C']
	},
	'D': {
		defaultOrder: CustomSortOrder.byCreatedTimeReverseAdvanced,
		groups: [{
				type: CustomSortGroupType.Outsiders
		}],
		outsidersGroupIdx: 0,
		targetFoldersPaths: ['D']
	},
	'AA': {
		groups: [{
				foldersOnly: true,
				order: CustomSortOrder.byModifiedTimeAdvanced,
				type: CustomSortGroupType.Outsiders
		}, {
				filesOnly: true,
				order: CustomSortOrder.byModifiedTimeReverseAdvanced,
				type: CustomSortGroupType.Outsiders
		}, {
				exactPrefix: 'Archive',
				foldersOnly: true,
				order: CustomSortOrder.byCreatedTimeAdvanced,
				type: CustomSortGroupType.ExactPrefix
		}, {
				exactPrefix: 'Archive',
				filesOnly: true,
				order: CustomSortOrder.byCreatedTimeReverseAdvanced,
				type: CustomSortGroupType.ExactPrefix
		}, {
				exactPrefix: 'Deep1',
				foldersOnly: true,
				order: CustomSortOrder.byCreatedTimeAdvancedRecursive,
				type: CustomSortGroupType.ExactPrefix
		}, {
				exactPrefix: 'Deep2',
				filesOnly: true,
				order: CustomSortOrder.byCreatedTimeReverseAdvancedRecursive,
				type: CustomSortGroupType.ExactPrefix
		}, {
				exactPrefix: 'Deep3',
				foldersOnly: true,
				order: CustomSortOrder.byModifiedTimeAdvancedRecursive,
				type: CustomSortGroupType.ExactPrefix
		}, {
				exactPrefix: 'Deep4',
				filesOnly: true,
				order: CustomSortOrder.byModifiedTimeReverseAdvancedRecursive,
				type: CustomSortGroupType.ExactPrefix
		}],
		outsidersFilesGroupIdx: 1,
		outsidersFoldersGroupIdx: 0,
		targetFoldersPaths: ['AA']
	}
}

describe('SortingSpecProcessor advanced folder-date based sorting methods', () => {
	let processor: SortingSpecProcessor;
	beforeEach(() => {
		processor = new SortingSpecProcessor();
	});
	it('should not raise error for multiple spec for the same path and choose correct spec, case A', () => {
		const inputTxtArr: Array<string> = txtInputAdvancedFolderDateSortingMethods.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result?.sortSpecByPath).toEqual(expectedSortSpecForAdvancedFolderDateSortingMethods)
		expect(result?.sortSpecByWildcard).toBeUndefined()
	})
})

const errorsLogger = jest.fn();

const ERR_PREFIX = 'Sorting specification problem:'
const ERR_SUFFIX = '---encountered in sorting spec in file mock-folder/custom-name-note.md'
const ERR_SUFFIX_IN_LINE = (n: number) => `---encountered in line ${n} of sorting spec in file mock-folder/custom-name-note.md`
const ERR_LINE_TXT = (txt: string) => `Content of problematic line: "${txt}"`

const txtInputErrorDupTargetFolder: string = `
target-folder: AAA
:::: AAA
> Modified
`

const txtInputErrorMissingSpaceTargetFolderAttr: string = `
target-folder:AAA
:::: AAA
> Modified
`
const txtInputErrorEmptyValueOfTargetFolderAttr: string = `
target-folder:
:::: AAA
> Modified
`
// There is a trailing space character in the first line
const txtInputErrorSpaceAsValueOfTargetFolderAttr: string = `
TARGET-FOLDER: 
:::: AAA
> Modified
`
const txtInputErrorSpaceAsValueOfAscendingAttr: string = `
ORDER-ASC: 
`
const txtInputErrorInvalidValueOfDescendingAttr: string = `
/folders
 > definitely not correct
`
const txtInputErrorNoSpaceDescendingAttr: string = `
/:files Chapter ...
Order-DESC:MODIFIED
`
const txtInputErrorItemToHideWithNoValue: string = `
target-folder: AAA
--%
`
const txtInputErrorTooManyNumericSortSymbols: string = `
% Chapter\\R+ ... page\\d+ 
`

/* No longer applicable
const txtInputErrorNestedStandardObsidianSortAttr: string = `
target-folder: AAA
/ Some folder
 sorting: standard
`
*/

const txtInputErrorPriorityEmptyFilePattern: string = `
/!! /:
`

const txtInputErrorPriorityEmptyFolderPattern: string = `
/!!! /
`

const txtInputErrorPriorityEmptyPattern: string = `
/! %
`

const txtInputErrorUnsupportedOrderForByMetadata: string = `
< modified by-metadata:
`

const txtInputEmptySpec: string = ``
const txtInputOnlyCommentsSpec: string = `
// Some comment

// Another comment below empty line
`

describe('SortingSpecProcessor error detection and reporting', () => {
	let processor: SortingSpecProcessor;
	beforeEach(() => {
		processor = new SortingSpecProcessor(errorsLogger);
		errorsLogger.mockReset()
	});
	it('should recognize error: target folder name duplicated (edge case)', () => {
		const inputTxtArr: Array<string> = txtInputErrorDupTargetFolder.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result).toBeNull()
		expect(errorsLogger).toHaveBeenCalledTimes(1)
		expect(errorsLogger).toHaveBeenCalledWith(`${ERR_PREFIX} 2:DuplicateSortSpecForSameFolder Duplicate sorting spec for folder AAA ${ERR_SUFFIX}`)
	})
	it('should recognize error: no space before target folder name ', () => {
		const inputTxtArr: Array<string> = txtInputErrorMissingSpaceTargetFolderAttr.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result).toBeNull()
		expect(errorsLogger).toHaveBeenCalledTimes(2)
		expect(errorsLogger).toHaveBeenNthCalledWith(1, `${ERR_PREFIX} 6:NoSpaceBetweenAttributeAndValue Space required after attribute name "target-folder:" ${ERR_SUFFIX_IN_LINE(2)}`)
		expect(errorsLogger
		).toHaveBeenNthCalledWith(2, ERR_LINE_TXT('target-folder:AAA'))
	})
	it('should recognize error: no value for target folder attr (immediate endline)', () => {
		const inputTxtArr: Array<string> = txtInputErrorEmptyValueOfTargetFolderAttr.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result).toBeNull()
		expect(errorsLogger).toHaveBeenCalledTimes(2)
		expect(errorsLogger).toHaveBeenNthCalledWith(1,
			`${ERR_PREFIX} 5:MissingAttributeValue Attribute "target-folder:" requires a value to follow ${ERR_SUFFIX_IN_LINE(2)}`)
		expect(errorsLogger).toHaveBeenNthCalledWith(2, ERR_LINE_TXT('target-folder:'))
	})
	it('should recognize error: no value for target folder attr (space only)', () => {
		const inputTxtArr: Array<string> = txtInputErrorSpaceAsValueOfTargetFolderAttr.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result).toBeNull()
		expect(errorsLogger).toHaveBeenCalledTimes(2)
		expect(errorsLogger).toHaveBeenNthCalledWith(1,
			`${ERR_PREFIX} 5:MissingAttributeValue Invalid target folder specification: "TARGET-FOLDER:" requires a value to follow ${ERR_SUFFIX_IN_LINE(2)}`)
		expect(errorsLogger).toHaveBeenNthCalledWith(2, ERR_LINE_TXT('TARGET-FOLDER: '))
	})
	it('should recognize error: no value for ascending sorting attr (space only)', () => {
		const inputTxtArr: Array<string> = txtInputErrorSpaceAsValueOfAscendingAttr.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result).toBeNull()
		expect(errorsLogger).toHaveBeenCalledTimes(2)
		expect(errorsLogger).toHaveBeenNthCalledWith(1,
			`${ERR_PREFIX} 5:MissingAttributeValue Invalid sorting order: "ORDER-ASC:" requires a value to follow ${ERR_SUFFIX_IN_LINE(2)}`)
		expect(errorsLogger).toHaveBeenNthCalledWith(2, ERR_LINE_TXT('ORDER-ASC: '))
	})
	it('should recognize error: invalid value for descending sorting attr (space only)', () => {
		const inputTxtArr: Array<string> = txtInputErrorInvalidValueOfDescendingAttr.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result).toBeNull()
		expect(errorsLogger).toHaveBeenCalledTimes(2)
		expect(errorsLogger).toHaveBeenNthCalledWith(1,
			`${ERR_PREFIX} 7:InvalidAttributeValue Primary sorting order contains unrecognized text: >>> definitely not correct <<< ${ERR_SUFFIX_IN_LINE(3)}`)
		expect(errorsLogger).toHaveBeenNthCalledWith(2, ERR_LINE_TXT(' > definitely not correct'))
	})
	it('should recognize error: no space before value for descending sorting attr (space only)', () => {
		const inputTxtArr: Array<string> = txtInputErrorNoSpaceDescendingAttr.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result).toBeNull()
		expect(errorsLogger).toHaveBeenCalledTimes(2)
		expect(errorsLogger).toHaveBeenNthCalledWith(1,
			`${ERR_PREFIX} 6:NoSpaceBetweenAttributeAndValue Space required after attribute name "Order-DESC:" ${ERR_SUFFIX_IN_LINE(3)}`)
		expect(errorsLogger).toHaveBeenNthCalledWith(2, ERR_LINE_TXT('Order-DESC:MODIFIED'))
	})
	it('should recognize error: item to hide requires exact name with ext', () => {
		const inputTxtArr: Array<string> = txtInputErrorItemToHideWithNoValue.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result).toBeNull()
		expect(errorsLogger).toHaveBeenCalledTimes(2)
		expect(errorsLogger).toHaveBeenNthCalledWith(1,
			`${ERR_PREFIX} 11:ItemToHideExactNameWithExtRequired Exact name with ext of file or folders to hide is required ${ERR_SUFFIX_IN_LINE(3)}`)
		expect(errorsLogger).toHaveBeenNthCalledWith(2, ERR_LINE_TXT('--%'))
	})
	it('should recognize error: too many numeric sorting indicators in a line', () => {
		const inputTxtArr: Array<string> = txtInputErrorTooManyNumericSortSymbols.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result).toBeNull()
		expect(errorsLogger).toHaveBeenCalledTimes(2)
		expect(errorsLogger).toHaveBeenNthCalledWith(1,
			`${ERR_PREFIX} 9:TooManySortingSymbols Maximum one sorting symbol allowed per line ${ERR_SUFFIX_IN_LINE(2)}`)
		expect(errorsLogger).toHaveBeenNthCalledWith(2, ERR_LINE_TXT('% Chapter\\R+ ... page\\d+ '))
	})
	/* Problem no longer applicable
	it('should recognize error: nested standard obsidian sorting attribute', () => {
		const inputTxtArr: Array<string> = txtInputErrorNestedStandardObsidianSortAttr.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result).toBeNull()
		expect(errorsLogger).toHaveBeenCalledTimes(2)
		expect(errorsLogger).toHaveBeenNthCalledWith(1,
			`${ERR_PREFIX} 14:StandardObsidianSortAllowedOnlyAtFolderLevel The standard Obsidian sort order is only allowed at a folder level (not nested syntax) ${ERR_SUFFIX_IN_LINE(4)}`)
		expect(errorsLogger).toHaveBeenNthCalledWith(2, ERR_LINE_TXT(' sorting: standard'))
	})
	 */
	it('should recognize error: priority indicator alone', () => {
		const inputTxtArr: Array<string> = `
		/!
		`.replace(/\t/gi, '').split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result).toBeNull()
		expect(errorsLogger).toHaveBeenCalledTimes(2)
		expect(errorsLogger).toHaveBeenNthCalledWith(1,
			`${ERR_PREFIX} 15:PriorityNotAllowedOnOutsidersGroup Priority is not allowed for sorting group with empty match-pattern ${ERR_SUFFIX_IN_LINE(2)}`)
		expect(errorsLogger).toHaveBeenNthCalledWith(2, ERR_LINE_TXT('/!'))
	})
	it('should recognize error: multiple priority indicators alone', () => {
		const inputTxtArr: Array<string> = `
		/! /!! /!!!
		`.replace(/\t/gi, '').split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result).toBeNull()
		expect(errorsLogger).toHaveBeenCalledTimes(2)
		expect(errorsLogger).toHaveBeenNthCalledWith(1,
			`${ERR_PREFIX} 16:TooManyPriorityPrefixes Only one priority prefix allowed on sorting group ${ERR_SUFFIX_IN_LINE(2)}`)
		expect(errorsLogger).toHaveBeenNthCalledWith(2, ERR_LINE_TXT('/! /!! /!!!'))
	})
	it('should recognize error: multiple priority indicators', () => {
		const inputTxtArr: Array<string> = `
		/!!! /!!! Abc\.d+ ...
		`.replace(/\t/gi, '').split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result).toBeNull()
		expect(errorsLogger).toHaveBeenCalledTimes(2)
		expect(errorsLogger).toHaveBeenNthCalledWith(1,
			`${ERR_PREFIX} 16:TooManyPriorityPrefixes Only one priority prefix allowed on sorting group ${ERR_SUFFIX_IN_LINE(2)}`)
		expect(errorsLogger).toHaveBeenNthCalledWith(2, ERR_LINE_TXT('/!!! /!!! Abc\.d+ ...'))
	})
	it('should recognize error: priority indicator with empty file pattern', () => {
		const inputTxtArr: Array<string> = txtInputErrorPriorityEmptyFilePattern.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result).toBeNull()
		expect(errorsLogger).toHaveBeenCalledTimes(2)
		expect(errorsLogger).toHaveBeenNthCalledWith(1,
			`${ERR_PREFIX} 15:PriorityNotAllowedOnOutsidersGroup Priority is not allowed for sorting group with empty match-pattern ${ERR_SUFFIX_IN_LINE(2)}`)
		expect(errorsLogger).toHaveBeenNthCalledWith(2, ERR_LINE_TXT('/!! /:'))
	})
	it('should recognize error: priority indicator with empty folder pattern', () => {
		const inputTxtArr: Array<string> = txtInputErrorPriorityEmptyFolderPattern.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result).toBeNull()
		expect(errorsLogger).toHaveBeenCalledTimes(2)
		expect(errorsLogger).toHaveBeenNthCalledWith(1,
			`${ERR_PREFIX} 15:PriorityNotAllowedOnOutsidersGroup Priority is not allowed for sorting group with empty match-pattern ${ERR_SUFFIX_IN_LINE(2)}`)
		expect(errorsLogger).toHaveBeenNthCalledWith(2, ERR_LINE_TXT('/!!! /'))
	})
	it('should recognize error: priority indicator with empty pattern', () => {
		const inputTxtArr: Array<string> = txtInputErrorPriorityEmptyPattern.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result).toBeNull()
		expect(errorsLogger).toHaveBeenCalledTimes(2)
		expect(errorsLogger).toHaveBeenNthCalledWith(1,
			`${ERR_PREFIX} 15:PriorityNotAllowedOnOutsidersGroup Priority is not allowed for sorting group with empty match-pattern ${ERR_SUFFIX_IN_LINE(2)}`)
		expect(errorsLogger).toHaveBeenNthCalledWith(2, ERR_LINE_TXT('/! %'))
	})
	it('should recognize error of combining: sorting order on first group', () => {
		const inputTxtArr: Array<string> = `
		/+ Abc
		 > modified
		/+ /:files def
		`.replace(/\t/gi, '').split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result).toBeNull()
		expect(errorsLogger).toHaveBeenCalledTimes(1)
		expect(errorsLogger).toHaveBeenNthCalledWith(1,
			`${ERR_PREFIX} 20:OnlyLastCombinedGroupCanSpecifyOrder Predecessor group of combined group cannot contain order specification. Put it at the last of group in combined groups ${ERR_SUFFIX}`)
	})
	it('should recognize error of combining: sorting order not on last group', () => {
		const inputTxtArr: Array<string> = `
		/+ Abc
		/+ ...Def
		/+ Ghi...
		 > modified
		/+ /:files def
		`.replace(/\t/gi, '').split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result).toBeNull()
		expect(errorsLogger).toHaveBeenCalledTimes(1)
		expect(errorsLogger).toHaveBeenNthCalledWith(1,
			`${ERR_PREFIX} 20:OnlyLastCombinedGroupCanSpecifyOrder Predecessor group of combined group cannot contain order specification. Put it at the last of group in combined groups ${ERR_SUFFIX}`)
	})
	it('should recognize error of combining: combining not allowed for outsiders group', () => {
		const inputTxtArr: Array<string> = `
		/+ %
		`.replace(/\t/gi, '').split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result).toBeNull()
		expect(errorsLogger).toHaveBeenCalledTimes(2)
		expect(errorsLogger).toHaveBeenNthCalledWith(1,
			`${ERR_PREFIX} 17:CombiningNotAllowedOnOutsidersGroup Combining is not allowed for sorting group with empty match-pattern ${ERR_SUFFIX_IN_LINE(2)}`)
		expect(errorsLogger).toHaveBeenNthCalledWith(2, ERR_LINE_TXT('/+ %'))
	})
	it('should recognize error of combining: combining not allowed for outsiders priority group', () => {
		const inputTxtArr: Array<string> = `
		/+ /! /
		`.replace(/\t/gi, '').split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result).toBeNull()
		expect(errorsLogger).toHaveBeenCalledTimes(2)
		expect(errorsLogger).toHaveBeenNthCalledWith(1,
			`${ERR_PREFIX} 15:PriorityNotAllowedOnOutsidersGroup Priority is not allowed for sorting group with empty match-pattern ${ERR_SUFFIX_IN_LINE(2)}`)
		expect(errorsLogger).toHaveBeenNthCalledWith(2, ERR_LINE_TXT('/+ /! /'))
	})
	it('should recognize error of combining: multiple combine operators', () => {
		const inputTxtArr: Array<string> = `
		/+ /! /+ /: Something
		`.replace(/\t/gi, '').split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result).toBeNull()
		expect(errorsLogger).toHaveBeenCalledTimes(2)
		expect(errorsLogger).toHaveBeenNthCalledWith(1,
			`${ERR_PREFIX} 18:TooManyCombinePrefixes Only one combining prefix allowed on sorting group ${ERR_SUFFIX_IN_LINE(2)}`)
		expect(errorsLogger).toHaveBeenNthCalledWith(2, ERR_LINE_TXT('/+ /! /+ /: Something'))
	})
	it('should recognize error: too many sorting group type prefixes', () => {
		const inputTxtArr: Array<string> = `
		/folders /:files Hello
		`.replace(/\t/gi, '').split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result).toBeNull()
		expect(errorsLogger).toHaveBeenCalledTimes(2)
		expect(errorsLogger).toHaveBeenNthCalledWith(1,
			`${ERR_PREFIX} 21:TooManyGroupTypePrefixes Only one sorting group type prefix allowed on sorting group ${ERR_SUFFIX_IN_LINE(2)}`)
		expect(errorsLogger).toHaveBeenNthCalledWith(2, ERR_LINE_TXT('/folders /:files Hello'))
	})
	it('should recognize error: priority prefix after sorting group type prefixe', () => {
		const inputTxtArr: Array<string> = `
		/folders /+ /! Hello
		`.replace(/\t/gi, '').split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result).toBeNull()
		expect(errorsLogger).toHaveBeenCalledTimes(2)
		expect(errorsLogger).toHaveBeenNthCalledWith(1,
			`${ERR_PREFIX} 22:PriorityPrefixAfterGroupTypePrefix Priority prefix must be used before sorting group type indicator ${ERR_SUFFIX_IN_LINE(2)}`)
		expect(errorsLogger).toHaveBeenNthCalledWith(2, ERR_LINE_TXT('/folders /+ /! Hello'))
	})
	it('should recognize error: combine prefix after sorting group type prefix', () => {
		const inputTxtArr: Array<string> = `
		/folders /+ Hello
		`.replace(/\t/gi, '').split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result).toBeNull()
		expect(errorsLogger).toHaveBeenCalledTimes(2)
		expect(errorsLogger).toHaveBeenNthCalledWith(1,
			`${ERR_PREFIX} 23:CombinePrefixAfterGroupTypePrefix Combining prefix must be used before sorting group type indicator ${ERR_SUFFIX_IN_LINE(2)}`)
		expect(errorsLogger).toHaveBeenNthCalledWith(2, ERR_LINE_TXT('/folders /+ Hello'))
	})
	it('should recognize empty spec', () => {
		const inputTxtArr: Array<string> = txtInputEmptySpec.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result).toBeNull()
		expect(errorsLogger).toHaveBeenCalledTimes(0)
	})
	it.each([
		'% \\.d+...',
		'% ...\\d+',
		'% Chapter\\R+... page',
		'% Section ...\\-r+page'
	])('should recognize error: numeric sorting symbol adjacent to wildcard in >%s<', (s: string) => {
		const inputTxtArr: Array<string> = s.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result).toBeNull()
		expect(errorsLogger).toHaveBeenCalledTimes(2)
		expect(errorsLogger).toHaveBeenNthCalledWith(1,
			`${ERR_PREFIX} 10:SortingSymbolAdjacentToWildcard Sorting symbol must not be directly adjacent to a wildcard because of potential performance problem. An additional explicit separator helps in such case. ${ERR_SUFFIX_IN_LINE(1)}`)
		expect(errorsLogger).toHaveBeenNthCalledWith(2, ERR_LINE_TXT(s))
	})
	it.each([
		'% \\.d+\\d...',
		'% ...[0-9]\\d+',
		'% Chapter\\R+\\d... page',
		'% Section ...[0-9]\\-r+page'
	])('should not recognize adjacency error in >%s<', (s: string) => {
		const inputTxtArr: Array<string> = s.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result).not.toBeNull()
		expect(errorsLogger).not.toHaveBeenCalled()
	})
	it('should recognize empty regexp of target-folder:', () => {
		const inputTxtArr: Array<string> = `
		target-folder: regexp:  
		`.replace(/\t/gi, '').split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result).toBeNull()
		expect(errorsLogger).toHaveBeenCalledTimes(1)
		expect(errorsLogger).toHaveBeenNthCalledWith(1,
			`${ERR_PREFIX} 27:InvalidOrEmptyFolderMatchingRegexp Invalid or empty folder regexp expression <> ${ERR_SUFFIX}`)
	})
	it('should recognize error in regexp of target-folder:', () => {
		const inputTxtArr: Array<string> = `
		target-folder: regexp: bla (
		`.replace(/\t/gi, '').split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result).toBeNull()
		expect(errorsLogger).toHaveBeenCalledTimes(1)
		expect(errorsLogger).toHaveBeenNthCalledWith(1,
			`${ERR_PREFIX} 27:InvalidOrEmptyFolderMatchingRegexp Invalid or empty folder regexp expression <bla (> ${ERR_SUFFIX}`)
	})
	it('should recognize empty name in target-folder: name:', () => {
		const inputTxtArr: Array<string> = `
		target-folder: name:      
		`.replace(/\t/gi, '').split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result).toBeNull()
		expect(errorsLogger).toHaveBeenCalledTimes(1)
		expect(errorsLogger).toHaveBeenNthCalledWith(1,
			`${ERR_PREFIX} 26:EmptyFolderNameToMatch Empty 'target-folder: name:' value ${ERR_SUFFIX}`)
	})
	it('should recognize duplicate name in target-folder: name:', () => {
		const inputTxtArr: Array<string> = `
		target-folder: name: 123
		target-folder: name: xyz
		target-folder: name: 123
		`.replace(/\t/gi, '').split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result).toBeNull()
		expect(errorsLogger).toHaveBeenCalledTimes(1)
		expect(errorsLogger).toHaveBeenNthCalledWith(1,
			`${ERR_PREFIX} 25:DuplicateByNameSortSpecForFolder Duplicate 'target-folder: name:' definition for the same name <123> ${ERR_SUFFIX}`)
	})
	it('should recognize unsupported order for by-metadata: (regular orders)', () => {
		const inputTxtArr: Array<string> = `
		< modified by-metadata:
		`.replace(/\t/gi, '').split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result).toBeNull()
		expect(errorsLogger).toHaveBeenCalledTimes(2)
		expect(errorsLogger).toHaveBeenNthCalledWith(1,
			`${ERR_PREFIX} 7:InvalidAttributeValue Sorting by metadata requires one of alphabetical orders ${ERR_SUFFIX_IN_LINE(2)}`)
		expect(errorsLogger).toHaveBeenNthCalledWith(2, ERR_LINE_TXT('< modified by-metadata:'))
	})
	it('should recognize unsupported order for by-metadata: (ui selected order)', () => {
		const inputTxtArr: Array<string> = `
		< ui selected by-metadata:
		`.replace(/\t/gi, '').split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result).toBeNull()
		expect(errorsLogger).toHaveBeenCalledTimes(2)
		expect(errorsLogger).toHaveBeenNthCalledWith(1,
			`${ERR_PREFIX} 7:InvalidAttributeValue Sorting by metadata requires one of alphabetical orders ${ERR_SUFFIX_IN_LINE(2)}`)
		expect(errorsLogger).toHaveBeenNthCalledWith(2, ERR_LINE_TXT('< ui selected by-metadata:'))
	})
	it('should reject superfluous unrecognized text case A', () => {
		const inputTxtArr: Array<string> = `
		sorting: standard, sorting: ui-selected
		`.replace(/\t/gi, '').split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result).toBeNull()
		expect(errorsLogger).toHaveBeenCalledTimes(2)
		expect(errorsLogger).toHaveBeenNthCalledWith(1,
			`${ERR_PREFIX} 7:InvalidAttributeValue Secondary sorting order contains unrecognized text: >>> ui-selected <<< ${ERR_SUFFIX_IN_LINE(2)}`)
		expect(errorsLogger).toHaveBeenNthCalledWith(2, ERR_LINE_TXT('sorting: standard, sorting: ui-selected'))
	})
	it('should reject "sorting" as postfix (comment ignored)', () => {
		const inputTxtArr: Array<string> = `
		sorting: a-z, a-z sorting  // <- reject postfix notation
		`.replace(/\t/gi, '').split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result).toBeNull()
		expect(errorsLogger).toHaveBeenCalledTimes(2)
		expect(errorsLogger).toHaveBeenNthCalledWith(1,
			`${ERR_PREFIX} 7:InvalidAttributeValue Secondary sorting order contains unrecognized text: >>> sorting <<< ${ERR_SUFFIX_IN_LINE(2)}`)
		expect(errorsLogger).toHaveBeenNthCalledWith(2, ERR_LINE_TXT('sorting: a-z, a-z sorting  // <- reject postfix notation'))
	})
	it('should reject "order-desc:" as postfix (colon is not needed)', () => {
		const inputTxtArr: Array<string> = `
		order-desc: true a-z order-desc: by-metadata:
		`.replace(/\t/gi, '').split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result).toBeNull()
		expect(errorsLogger).toHaveBeenCalledTimes(2)
		expect(errorsLogger).toHaveBeenNthCalledWith(1,
			`${ERR_PREFIX} 7:InvalidAttributeValue Primary sorting order contains unrecognized text: >>> : by-metadata: <<< ${ERR_SUFFIX_IN_LINE(2)}`)
		expect(errorsLogger).toHaveBeenNthCalledWith(2, ERR_LINE_TXT('order-desc: true a-z order-desc: by-metadata:'))
	})
	it('should reject "order-asc:" as postfix (colon is not needed)', () => {
		const inputTxtArr: Array<string> = `
		order-desc: modified, a-z order-asc:
		`.replace(/\t/gi, '').split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result).toBeNull()
		expect(errorsLogger).toHaveBeenCalledTimes(2)
		expect(errorsLogger).toHaveBeenNthCalledWith(1,
			`${ERR_PREFIX} 7:InvalidAttributeValue Secondary sorting order contains unrecognized text: >>> : <<< ${ERR_SUFFIX_IN_LINE(2)}`)
		expect(errorsLogger).toHaveBeenNthCalledWith(2, ERR_LINE_TXT('order-desc: modified, a-z order-asc:'))
	})
	it('should reject "order-asc:" as postfix (colon is not needed) - comment is involved', () => {
		const inputTxtArr: Array<string> = `
		order-desc: modified, a-z order-asc:   // Comment intentionally here, some spaces, some comma
		`.replace(/\t/gi, '').split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result).toBeNull()
		expect(errorsLogger).toHaveBeenCalledTimes(2)
		expect(errorsLogger).toHaveBeenNthCalledWith(1,
			`${ERR_PREFIX} 7:InvalidAttributeValue Secondary sorting order contains unrecognized text: >>> : <<< ${ERR_SUFFIX_IN_LINE(2)}`)
		expect(errorsLogger).toHaveBeenNthCalledWith(2, ERR_LINE_TXT('order-desc: modified, a-z order-asc:   // Comment intentionally here, some spaces, some comma'))
	})
	it('should reject inconsistent prefix and postfix orders', () => {
		const inputTxtArr: Array<string> = `
		sorting: standard, order-asc: modified desc by-metadata: xyz // <-- and it is checked earlier than the by-metadata incompatible order
		`.replace(/\t/gi, '').split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result).toBeNull()
		expect(errorsLogger).toHaveBeenCalledTimes(2)
		expect(errorsLogger).toHaveBeenNthCalledWith(1,
			`${ERR_PREFIX} 7:InvalidAttributeValue Secondary sorting direction order-asc: and desc are contradicting ${ERR_SUFFIX_IN_LINE(2)}`)
		expect(errorsLogger).toHaveBeenNthCalledWith(2, ERR_LINE_TXT('sorting: standard, order-asc: modified desc by-metadata: xyz // <-- and it is checked earlier than the by-metadata incompatible order'))
	})
})

const txtInputTargetFolderCCC: string = `
target-folder: CCC
`

describe('SortingSpecProcessor advanced error detection', () => {
	it('should retain state of duplicates detection in the instance', () => {
		let processor: SortingSpecProcessor = new SortingSpecProcessor(errorsLogger);
		errorsLogger.mockReset()
		const inputTxtArr: Array<string> = txtInputTargetFolderCCC.split('\n')
		const result1 = processor.parseSortSpecFromText(inputTxtArr, 'another-mock-folder', 'sortspec.md')
		const result2 = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result1).not.toBeNull()
		expect(result2).toBeNull()
		expect(errorsLogger).toHaveBeenCalledTimes(1)
		expect(errorsLogger).toHaveBeenCalledWith(`${ERR_PREFIX} 2:DuplicateSortSpecForSameFolder Duplicate sorting spec for folder CCC ${ERR_SUFFIX}`)
	})
})

describe('convertPlainStringSortingGroupSpecToArraySpec', () => {
	let processor: SortingSpecProcessor;
	beforeEach(() => {
		processor = new SortingSpecProcessor();
	});
	it('should recognize infix', () => {
		const s = 'Advanced adv...ed, etc. and so on'
		expect(processor.convertPlainStringSortingGroupSpecToArraySpec(s)).toEqual([
			'Advanced adv', '...', 'ed, etc. and so on'
		])
	})
	it('should recognize suffix', () => {
		const s = 'Advanced... '
		expect(processor.convertPlainStringSortingGroupSpecToArraySpec(s)).toEqual([
			'Advanced', '...'
		])
	})
	it('should recognize prefix', () => {
		const s = ' ...tion. !!!'
		expect(processor.convertPlainStringSortingGroupSpecToArraySpec(s)).toEqual([
			'...', 'tion. !!!'
		])
	})
	it('should recognize four dots escaper - variant 0', () => {
		const s = './...'
		expect(processor.convertPlainStringSortingGroupSpecToArraySpec(s)).toEqual([
			'.', '...'
		])
	})
	it('should recognize four dots escaper - variant 1', () => {
		const s = '../...'
		expect(processor.convertPlainStringSortingGroupSpecToArraySpec(s)).toEqual([
			'..', '...'
		])
	})
	it('should recognize four dots escaper - variant 2', () => {
		const s = './...Some'
		expect(processor.convertPlainStringSortingGroupSpecToArraySpec(s)).toEqual([
			'.', '...', 'Some'
		])
	})
	it('should recognize four dots escaper - variant 3', () => {
		const s = 'Some./...'
		expect(processor.convertPlainStringSortingGroupSpecToArraySpec(s)).toEqual([
			'Some.','...'
		])
	})
	it('should recognize four dots escaper - variant 3a', () => {
		const s = 'Some./.....'
		expect(processor.convertPlainStringSortingGroupSpecToArraySpec(s)).toEqual([
			'Some./..','...'
		])
	})
	it('should recognize four dots escaper - variant 3b', () => {
		const s = 'Some./.....X'
		expect(processor.convertPlainStringSortingGroupSpecToArraySpec(s)).toEqual([
			'Some.','...', '..X'
		])
	})
	it('should recognize four dots escaper - variant 4', () => {
		const s = 'Some./...Some'
		expect(processor.convertPlainStringSortingGroupSpecToArraySpec(s)).toEqual([
			'Some.','...', 'Some'
		])
	})
	it('should recognize four dots escaper - tricky variant 4', () => {
		const s = 'Some./... haha ...Some'
		expect(processor.convertPlainStringSortingGroupSpecToArraySpec(s)).toEqual([
			'Some.','...', ' haha ...Some'
		])
	})
	it('should recognize four dots escaper - tricky variant 5', () => {
		const s = 'S.../..'
		expect(processor.convertPlainStringSortingGroupSpecToArraySpec(s)).toEqual([
			'S','...', '/..'
		])
	})
	it('should NOT recognize four dots escaper - tricky variant 1', () => {
		const s = 'Some... haha ./...Some'
		expect(processor.convertPlainStringSortingGroupSpecToArraySpec(s)).toEqual([
			'Some','...', ' haha ./...Some'
		])
	})
	it('should NOT recognize four dots escaper - tricky variant 2', () => {
		const s = 'Some... haha .../...Some'
		expect(processor.convertPlainStringSortingGroupSpecToArraySpec(s)).toEqual([
			'Some', '...', ' haha .../...Some'
		])
	})
	it('should NOT recognize four dots escaper - tricky variant 3', () => {
		const s = '.../...'
		expect(processor.convertPlainStringSortingGroupSpecToArraySpec(s)).toEqual([
			'...', '/...'
		])
	})
	it('should recognize some edge case', () => {
		const s = 'Edge...... ... ..... ... eee?'
		expect(processor.convertPlainStringSortingGroupSpecToArraySpec(s)).toEqual([
			'Edge', '...', '... ... ..... ... eee?'
		])
	})
	it('should recognize some other edge case', () => {
		const s = 'Edge... ... ... ..... ... eee?'
		expect(processor.convertPlainStringSortingGroupSpecToArraySpec(s)).toEqual([
			'Edge', '...', ' ... ... ..... ... eee?'
		])
	})
	it('should recognize another edge case', () => {
		const s = '...Edge ... ... ... ..... ... eee? ...'
		expect(processor.convertPlainStringSortingGroupSpecToArraySpec(s)).toEqual([
			'...', 'Edge ... ... ... ..... ... eee? ...'
		])
	})
	it('should recognize yet another edge case', () => {
		const s = '. .. ... ...'
		const result = processor.convertPlainStringSortingGroupSpecToArraySpec(s)
		expect(result).toEqual([
			'. .. ... ', '...' // Edge case -> splitting here is neutral, syntax error should be raised later on
		])
	})
	it('should recognize tricky edge case', () => {
		const s = '... ...'
		const result = processor.convertPlainStringSortingGroupSpecToArraySpec(s)
		expect(result).toEqual([
			'...', ' ...' // Edge case -> splitting here is neutral, syntax error should be raised later on
		])
	})
	it('should recognize a variant of tricky edge case', () => {
		const s = '......'
		const result = processor.convertPlainStringSortingGroupSpecToArraySpec(s)
		expect(result).toEqual([
			'...', '...' // Edge case -> splitting here is neutral, syntax error should be raised later on
		])
	})
	it('edge case behavior', () => {
		const s = '    ...... ..........    '
		const result = processor.convertPlainStringSortingGroupSpecToArraySpec(s)
		expect(result).toEqual([
			'...', '... ..........' // Edge case -> splitting here is neutral, syntax error should be raised later on
		])
	})
	it('intentional edge case parsing', () => {
		const s = ' Abc......def..........ghi '
		const result = processor.convertPlainStringSortingGroupSpecToArraySpec(s)
		expect(result).toEqual([
			'Abc', '...', '...def..........ghi' // Edge case -> splitting here is neutral, syntax error should be raised later on
		])
	})
	it.each([
		' ... ',
		'... ',
		' ...'
	])('should not split >%s< and only trim', (s: string) => {
		const result = processor.convertPlainStringSortingGroupSpecToArraySpec(s)
		expect(result).toEqual([s.trim()])
	})
})

describe('escapeRegexUnsafeCharacters', () => {
	it.each([
		['^', '\\^'],
		['...', '\\.\\.\\.'],
		[' \\ ', ' \\\\ '],
		['^$.-+[]{}()|\\*?=!', '\\^\\$\\.\\-\\+\\[\\]\\{\\}\\(\\)\\|\\\\\\*\\?\\=\\!'],
		['^Chapter \\.d+ -', '\\^Chapter \\\\\\.d\\+ \\-']
	])('should correctly escape >%s< to >%s<', (s: string, ss: string) => {
		// const UnsafeRegexChars: string = '^$.-+[]{}()|\\*?=!';
		const result = escapeRegexUnsafeCharacters(s)
		expect(result).toBe(ss);
	})
})

describe('detectSortingSymbols', () => {
	it.each([
		['', false],
		['d+', false],
		['\\d +', false],
		['\\ d +', false],
		['\\D+', true], [' \\D+ ', true],
		['\\.D+', true], [' \\.D+ ', true],
		['\\-D+', true], [' \\-D+ ', true],
		['\\r+', true], [' \\r+ ', true],
		['\\.r+', true], [' \\.r+ ', true],
		['\\-r+', true], [' \\-r+ ', true],
		['\\d+abcd\\d+efgh', true],
		['\\d+\\.D+\\-d+\\R+\\.r+\\-R+ \\d+', true]
	])('should correctly detect in >%s< (%s) sorting regex symbols', (s: string, b: boolean) => {
		const result = detectSortingSymbols(s)
		expect(result).toBe(b)
	})
})

describe('hasMoreThanOneSortingSymbol', () => {
	it.each([
		['', false],
		[' d+', false],
		['\\d +', false],
		['\\ d +', false],
		[' \\D+', false], [' \\D+ \\R+ ', true],
		[' \\.D+', false], ['\\.D+ \\.R+', true],
		[' \\-D+ ', false], [' \\-D+\\-R+', true],
		['\\r+', false], [' \\r+ \\D+ ', true],
		['\\.r+', false], ['ab\\.r+de\\.D+fg', true],
		['\\-r+', false], ['--\\-r+--\\-D+++', true],
		['\\d+abcd\\d+efgh', true],
		['\\R+abcd\\.R+efgh', true],
		['\\d+\\.D+\\-d+\\R+\\.r+\\-R+ \\d+', true]
	])('should correctly detect in >%s< (%s) sorting regex symbols', (s: string, b: boolean) => {
		const result = hasMoreThanOneSortingSymbol(s)
		expect(result).toBe(b)
	})
})

describe('extractSortingSymbol', () => {
	it.each([
		['', null],
		['d+', null],
		[' \\d +', null],
		[' [0-9]', null],
		['\\ d +', null],
		[' \\d+', '\\d+'],
		['--\\.D+\\d+', '\\.D+'],
		['wdwqwqe\\d+\\.D+\\-d+\\R+\\.r+\\-R+ \\d+', '\\d+']
	])('should correctly extract from >%s< the numeric sorting symbol (%s)', (s: string, ss: string) => {
		const result = extractSortingSymbol(s)
		expect(result).toBe(ss)
	})
})

describe('convertPlainStringWithNumericSortingSymbolToRegex', () => {
	it.each([
		    // Advanced numeric symbols
		[' \\d+ ', /  *(\d+) /i],
		['Chapter \\D+:', /Chapter  *(\d+):/i],
		['Section \\.D+ of', /Section  *(\d+(?:\.\d+)*) of/i],
		['Part\\-D+:', /Part *(\d+(?:-\d+)*):/i],
		['Lorem ipsum\\r+:', /Lorem ipsum *([MDCLXVI]+):/i],
		['\\.r+', / *([MDCLXVI]+(?:\.[MDCLXVI]+)*)/i],
		['\\-r+:Lorem', / *([MDCLXVI]+(?:-[MDCLXVI]+)*):Lorem/i],
			// Simple regex
		['\\d-\\[0-9];-)', /\d\-[0-9];\-\)/i],
		['[0-9]\\d[0-9]', /\[0\-9\]\d\[0\-9\]/i],
		['\\[0-9]', /[0-9]/i],
		['[0-9] \\d', /\[0\-9\] \d/i],
		['  \\dd  ', /  \dd  /i],
		['  \\d\\d   \\[0-9]  ', /  \d\d   [0-9]  /i],
		['  \\d 123 \\[0-9]  ', /  \d 123 [0-9]  /i],
			// Advanced numeric symbols in connection with simple regex
		['\\dLorem ipsum\\r+:', /\dLorem ipsum *([MDCLXVI]+):/i],
		['W\\dLorem ipsum\\r+:', /W\dLorem ipsum *([MDCLXVI]+):/i],
		['Lorem \\d\\r+\\dipsum:', /Lorem \d *([MDCLXVI]+)\dipsum:/i],
		['Lorem \\d\\D+\\dipsum:', /Lorem \d *(\d+)\dipsum:/i],
			// Edge case to act as spec - actually the three dots ... should never reach conversion to regex
		['% \\.d+\\d...', /%  *(\d+(?:\.\d+)*)\d\.\.\./i],
		['% ...[0-9]\\d+', /% \.\.\.\[0\-9\] *(\d+)/i],
		['% Chapter\\R+\\d... page', /% Chapter *([MDCLXVI]+)\d\.\.\. page/i],
		['% Section ...[0-9]\\-r+page', /% Section \.\.\.\[0\-9\] *([MDCLXVI]+(?:-[MDCLXVI]+)*)page/i],
		    // Edge and error cases, behavior covered by tests to act as specification of the engine here
		    //   even if at run-time the error checking prevents some such expressions
		['abc\\d+efg\\d+hij', /abc *(\d+)efg/i], // Double advanced numerical sorting symbol, error case
		['--\\.D+\\d+', /\-\- *(\d+(?:\.\d+)*)\d\+/i],  // Two advanced numerical symbols
	])('should correctly extract from >%s< the numeric sorting symbol (%s)', (s: string, regex: RegExp) => {
		const result = convertPlainStringToRegex(s, RegexpUsedAs.InUnitTest)
		expect(result?.regexpSpec.regex).toEqual(regex)
		// No need to examine prefix and suffix fields of result, they are secondary and derived from the returned regexp
	})
	it('should not process string not containing numeric sorting symbol nor regex', () => {
		const input1 = 'abc'
		const input2 = '[0-9]'
		const result1 = convertPlainStringToRegex(input1, RegexpUsedAs.InUnitTest)
		const result2 = convertPlainStringToRegex(input2, RegexpUsedAs.InUnitTest)
		expect(result1).toBeNull()
		expect(result2).toBeNull()
	})
	it('should correctly include regex token for string begin', () => {
		const input1 = 'Part\\-D+:'
		const input2 = '\\dPart'
		const result1 = convertPlainStringToRegex(input1, RegexpUsedAs.Prefix)
		const result2 = convertPlainStringToRegex(input2, RegexpUsedAs.Prefix)
		expect(result1?.regexpSpec.regex).toEqual(/^Part *(\d+(?:-\d+)*):/i)
		expect(result2?.regexpSpec.regex).toEqual(/^\dPart/i)
	})
	it('should correctly include regex token for string end', () => {
		const input1 = 'Part\\-D+:'
		const input2 = ' \\[0-9]\\-D+'
		const input3 = ' \\l\\[0-9]\\-D+'
		const result1 = convertPlainStringToRegex(input1, RegexpUsedAs.Suffix)
		const result2 = convertPlainStringToRegex(input2, RegexpUsedAs.Suffix)
		const result3 = convertPlainStringToRegex(input3, RegexpUsedAs.Suffix)
		expect(result1?.regexpSpec.regex).toEqual(/Part *(\d+(?:-\d+)*):$/i)
		expect(result2?.regexpSpec.regex).toEqual(/ [0-9] *(\d+(?:-\d+)*)$/i)
		expect(result3?.regexpSpec.regex).toEqual(/ \p{Ll}[0-9] *(\d+(?:-\d+)*)$/u)
	})
	it('should correctly include regex token for string begin and end', () => {
		const input1 = 'Part\\.D+:'
		const input2 = ' \\d \\[0-9] '
		const input3 = ' \\d \\[0-9] \\C'
		const result1 = convertPlainStringToRegex(input1, RegexpUsedAs.FullMatch)
		const result2 = convertPlainStringToRegex(input2, RegexpUsedAs.FullMatch)
		const result3 = convertPlainStringToRegex(input3, RegexpUsedAs.FullMatch)
		expect(result1?.regexpSpec.regex).toEqual(/^Part *(\d+(?:\.\d+)*):$/i)
		expect(result2?.regexpSpec.regex).toEqual(/^ \d [0-9] $/i)
		expect(result3?.regexpSpec.regex).toEqual(/^ \d [0-9] [\p{Lu}\p{Lt}]$/u)
	})
})
