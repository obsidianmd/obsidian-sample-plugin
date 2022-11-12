import {
	CompoundDashNumberNormalizerFn,
	CompoundDashRomanNumberNormalizerFn,
	CompoundDotNumberNormalizerFn,
	convertPlainStringWithNumericSortingSymbolToRegex,
	detectNumericSortingSymbols,
	escapeRegexUnsafeCharacters,
	extractNumericSortingSymbol,
	hasMoreThanOneNumericSortingSymbol,
	NumberNormalizerFn,
	RegexpUsedAs,
	RomanNumberNormalizerFn,
	SortingSpecProcessor
} from "./sorting-spec-processor"
import {CustomSortGroupType, CustomSortOrder, CustomSortSpec} from "./custom-sort-types";
import {FolderMatchingTreeNode} from "./folder-matching-rules";

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
/: files only matching
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
/:files files only matching
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
			order: CustomSortOrder.alphabetical,
			type: CustomSortGroupType.MatchAll
		}, {
			filesOnly: true,
			order: CustomSortOrder.alphabetical,
			type: CustomSortGroupType.MatchAll
		}, {
			type: CustomSortGroupType.Outsiders,
			order: CustomSortOrder.alphabetical,
		}],
		targetFoldersPaths: ['mock-folder'],
		outsidersGroupIdx: 2
	},
	"tricky folder": {
		groups: [{
			foldersOnly: true,
			order: CustomSortOrder.alphabetical,
			type: CustomSortGroupType.Outsiders
		}, {
			filesOnly: true,
			order: CustomSortOrder.alphabetical,
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
			order: CustomSortOrder.alphabetical,
			type: CustomSortGroupType.Outsiders
		}],
		outsidersGroupIdx: 2,
		targetFoldersPaths: [
			'tricky folder 2'
		]
	},
	"Conceptual model": {
		groups: [{
			exactText: "Entities",
			filesOnly: true,
			order: CustomSortOrder.alphabetical,
			type: CustomSortGroupType.ExactName
		}, {
			type: CustomSortGroupType.Outsiders,
			order: CustomSortOrder.alphabetical,
		}],
		outsidersGroupIdx: 1,
		targetFoldersPaths: ['Conceptual model']
	},
	"/": {
		groups: [{
			exactPrefix: "Con",
			filesOnly: true,
			order: CustomSortOrder.alphabetical,
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
			order: CustomSortOrder.alphabetical,
			type: CustomSortGroupType.ExactPrefix
		}, {
			exactPrefix: "Att",
			exactSuffix: "ch",
			filesOnly: true,
			order: CustomSortOrder.alphabetical,
			type: CustomSortGroupType.ExactHeadAndTail
		}, {
			exactPrefix: "sort",
			exactSuffix: "spec",
			order: CustomSortOrder.alphabetical,
			type: CustomSortGroupType.ExactHeadAndTail
		}, {
			exactText: "sortspec.md",
			filesOnly: true,
			matchFilenameWithExt: true,
			order: CustomSortOrder.alphabetical,
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
			order: CustomSortOrder.byModifiedTimeReverse,
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
			order: CustomSortOrder.byModifiedTimeReverse,
			type: CustomSortGroupType.Outsiders
		}],
		outsidersGroupIdx: 3,
		targetFoldersPaths: ['Sandbox']
	},
	"Abcd efgh ijk": {
		defaultOrder: CustomSortOrder.alphabeticalReverse,
		groups: [{
			exactPrefix: "Plain text spec bla bla bla (matches files and folders)",
			order: CustomSortOrder.alphabeticalReverse,
			type: CustomSortGroupType.ExactPrefix
		}, {
			exactText: "files only matching",
			filesOnly: true,
			order: CustomSortOrder.alphabeticalReverse,
			type: CustomSortGroupType.ExactName
		}, {
			exactText: "folders only matching",
			foldersOnly: true,
			order: CustomSortOrder.alphabetical,
			type: CustomSortGroupType.ExactName
		}, {
			exactText: "some-file (or folder)",
			order: CustomSortOrder.alphabeticalReverse,
			type: CustomSortGroupType.ExactName
		}, {
			exactPrefix: "sort",
			exactSuffix: ".md",
			filesOnly: true,
			matchFilenameWithExt: true,
			order: CustomSortOrder.alphabeticalReverse,
			type: CustomSortGroupType.ExactHeadAndTail
		}, {
			exactText: "Trailer item",
			order: CustomSortOrder.alphabeticalReverse,
			type: CustomSortGroupType.ExactName
		}, {
			order: CustomSortOrder.alphabeticalReverse,
			type: CustomSortGroupType.Outsiders
		}],
		outsidersGroupIdx: 6,
		targetFoldersPaths: ['Abcd efgh ijk']
	},
	"References": {
		groups: [{
			exactPrefix: "Recently",
			order: CustomSortOrder.alphabetical,
			type: CustomSortGroupType.ExactPrefix
		}, {
			order: CustomSortOrder.alphabetical,
			type: CustomSortGroupType.Outsiders
		}],
		outsidersGroupIdx: 1,
		targetFoldersPaths: ['References', 'Same rules as for References']
	},
	"Same rules as for References": {
		groups: [{
			exactPrefix: "Recently",
			order: CustomSortOrder.alphabetical,
			type: CustomSortGroupType.ExactPrefix
		}, {
			order: CustomSortOrder.alphabetical,
			type: CustomSortGroupType.Outsiders
		}],
		outsidersGroupIdx: 1,
		targetFoldersPaths: ['References', 'Same rules as for References']
	}
}

const expectedSortSpecsExampleNumericSortingSymbols: { [key: string]: CustomSortSpec } = {
	"mock-folder": {
		groups: [{
			foldersOnly: true,
			order: CustomSortOrder.alphabetical,
			type: CustomSortGroupType.ExactPrefix,
			regexSpec: {
				regex: /^Chapter  *(\d+(?:\.\d+)*) /i,
				normalizerFn: CompoundDotNumberNormalizerFn
			}
		}, {
			filesOnly: true,
			order: CustomSortOrder.alphabetical,
			type: CustomSortGroupType.ExactSuffix,
			regexSpec: {
				regex: /section  *([MDCLXVI]+(?:-[MDCLXVI]+)*)\.$/i,
				normalizerFn: CompoundDashRomanNumberNormalizerFn
			}
		}, {
			order: CustomSortOrder.alphabetical,
			type: CustomSortGroupType.ExactName,
			regexSpec: {
				regex: /^Appendix  *(\d+(?:-\d+)*) \(attachments\)$/i,
				normalizerFn: CompoundDashNumberNormalizerFn
			}
		}, {
			order: CustomSortOrder.alphabetical,
			type: CustomSortGroupType.ExactHeadAndTail,
			exactSuffix: ' works?',
			regexSpec: {
				regex: /^Plain syntax *([MDCLXVI]+) /i,
				normalizerFn: RomanNumberNormalizerFn
			}
		}, {
			order: CustomSortOrder.alphabetical,
			type: CustomSortGroupType.ExactHeadAndTail,
			exactPrefix: 'And this kind of',
			regexSpec: {
				regex: /  *(\d+)plain syntax\?\?\?$/i,
				normalizerFn: NumberNormalizerFn
			}
		}, {
			type: CustomSortGroupType.Outsiders,
			order: CustomSortOrder.alphabetical,
		}],
		targetFoldersPaths: ['mock-folder'],
		outsidersGroupIdx: 5
	}
}

const txtInputExampleNumericSortingSymbols: string = `
/folders Chapter \\.d+ ...  
/:files ...section \\-r+.
% Appendix \\-d+ (attachments)
Plain syntax\\R+ ... works?
And this kind of... \\D+plain syntax???
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
	it('should generate correct SortSpecs (example with numerical sorting symbols)', () => {
		const inputTxtArr: Array<string> = txtInputExampleNumericSortingSymbols.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result?.sortSpecByPath).toEqual(expectedSortSpecsExampleNumericSortingSymbols)
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
			order: CustomSortOrder.alphabeticalReverse,
			type: CustomSortGroupType.Outsiders
		}],
		outsidersGroupIdx: 0,
		targetFoldersPaths: ['AAA']
	},
	"BBB": {
		groups: [{
			exactPrefix: "Whatever ",
			order: CustomSortOrder.alphabetical,
			type: CustomSortGroupType.ExactPrefix
		}, {
			order: CustomSortOrder.alphabetical,
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
`

const expectedSortSpecForObsidianStandardSorting: { [key: string]: CustomSortSpec } = {
	"AAA": {
		defaultOrder: CustomSortOrder.standardObsidian,
		groups: [{
			order: CustomSortOrder.standardObsidian,
			type: CustomSortGroupType.Outsiders
		}],
		outsidersGroupIdx: 0,
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

const txtInputTrueAlphabeticalSortAttr: string = `
target-folder: True Alpha
< true a-z
target-folder: True Alpha Rev
> true a-z
target-folder: by-meta True Alpha
< true a-z by-metadata:
target-folder: by-meta True Alpha Rev
> true a-z by-metadata: Some-attr
`

const expectedSortSpecForTrueAlphabeticalSorting: { [key: string]: CustomSortSpec } = {
	"True Alpha": {
		defaultOrder: CustomSortOrder.trueAlphabetical,
		groups: [{
			order: CustomSortOrder.trueAlphabetical,
			type: CustomSortGroupType.Outsiders
		}],
		outsidersGroupIdx: 0,
		targetFoldersPaths: ['True Alpha']
	},
	"True Alpha Rev": {
		defaultOrder: CustomSortOrder.trueAlphabeticalReverse,
		groups: [{
			order: CustomSortOrder.trueAlphabeticalReverse,
			type: CustomSortGroupType.Outsiders
		}],
		outsidersGroupIdx: 0,
		targetFoldersPaths: ['True Alpha Rev']
	},
	"by-meta True Alpha": {
		defaultOrder: CustomSortOrder.byMetadataFieldTrueAlphabetical,
		groups: [{
			order: CustomSortOrder.byMetadataFieldTrueAlphabetical,
			type: CustomSortGroupType.Outsiders
		}],
		outsidersGroupIdx: 0,
		targetFoldersPaths: ['by-meta True Alpha']
	},
	"by-meta True Alpha Rev": {
		defaultOrder: CustomSortOrder.byMetadataFieldTrueAlphabeticalReverse,
		byMetadataField: 'Some-attr',
		groups: [{
			order: CustomSortOrder.byMetadataFieldTrueAlphabeticalReverse,
			byMetadataField: 'Some-attr',
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

const txtInputSimplistic1: string = `
target-folder: /*
/:files
//folders
`

const expectedSortSpecForSimplistic1: { [key: string]: CustomSortSpec } = {
	"/": {
		groups: [{
			filesOnly: true,
			order: CustomSortOrder.alphabetical,
			type: CustomSortGroupType.Outsiders
		}, {
			order: CustomSortOrder.alphabetical,
			type: CustomSortGroupType.Outsiders
		}],
		outsidersFilesGroupIdx: 0,
		outsidersGroupIdx: 1,
		targetFoldersPaths: ['/*']
	}
}

const expectedWildcardMatchingTreeForSimplistic1 = {
	"matchAll": {
		groups: [{
			filesOnly: true,
			order: CustomSortOrder.alphabetical,
			type: CustomSortGroupType.Outsiders
		}, {
			order: CustomSortOrder.alphabetical,
			type: CustomSortGroupType.Outsiders
		}],
		outsidersFilesGroupIdx: 0,
		outsidersGroupIdx: 1,
		targetFoldersPaths: ['/*']
	},
	"subtree": {}
}

const txtInputSimplistic2: string = `
target-folder: /
/:files
//folders
`

const expectedSortSpecForSimplistic2: { [key: string]: CustomSortSpec } = {
	"/": {
		groups: [{
			filesOnly: true,
			order: CustomSortOrder.alphabetical,
			type: CustomSortGroupType.Outsiders
		}, {
			order: CustomSortOrder.alphabetical,
			type: CustomSortGroupType.Outsiders
		}],
		outsidersFilesGroupIdx: 0,
		outsidersGroupIdx: 1,
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
			order: CustomSortOrder.alphabetical,
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
			order: CustomSortOrder.alphabetical,
			type: CustomSortGroupType.ExactName
		}, {
			exactText: 'Areas',
			order: CustomSortOrder.alphabetical,
			type: CustomSortGroupType.ExactName
		}, {
			exactText: 'Responsibilities',
			order: CustomSortOrder.alphabetical,
			type: CustomSortGroupType.ExactName
		}, {
			exactText: 'Archive',
			order: CustomSortOrder.alphabetical,
			type: CustomSortGroupType.ExactName
		}, {
			order: CustomSortOrder.alphabetical,
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
			order: CustomSortOrder.alphabetical,
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
		order: CustomSortOrder.alphabetical,
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
			order: CustomSortOrder.alphabetical,
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
					"order": CustomSortOrder.alphabeticalReverse,
					"type": CustomSortGroupType.Outsiders
					}],
				"outsidersGroupIdx": 0,
				"targetFoldersPaths": ["mock-folder/*"]
			},
			matchChildren: {
				"defaultOrder": CustomSortOrder.byModifiedTime,
				"groups": [{
					"order": CustomSortOrder.byModifiedTime,
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
			order: CustomSortOrder.alphabetical,
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
					"order": CustomSortOrder.alphabeticalReverse,
					"type": CustomSortGroupType.Outsiders
				}],
				"outsidersGroupIdx": 0,
				"targetFoldersPaths": ["mock-folder/*"]
			},
			matchChildren: {
				"groups": [{
					"order": CustomSortOrder.alphabetical,
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

const expectedSortSpecForMultiSpecD: { [key: string]: CustomSortSpec } = {
	'mock-folder': {
		groups: [{
			order: CustomSortOrder.alphabetical,
			type: CustomSortGroupType.Outsiders
		}],
		outsidersGroupIdx: 0,
		targetFoldersPaths: ['mock-folder/*']
	}
}

const expectedWildcardMatchingTreeForMultiSpecD: FolderMatchingTreeNode<CustomSortSpec> = {
	subtree: {
		"mock-folder": {
			matchAll: {
				"groups": [{
					"order": CustomSortOrder.alphabetical,
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

const txtInputTargetFolderMultiSpecE: string = `
target-folder: mock-folder/...
`

const expectedSortSpecForMultiSpecE: { [key: string]: CustomSortSpec } = {
	'mock-folder': {
		groups: [{
			order: CustomSortOrder.alphabetical,
			type: CustomSortGroupType.Outsiders
		}],
		outsidersGroupIdx: 0,
		targetFoldersPaths: ['mock-folder/...']
	}
}

const expectedWildcardMatchingTreeForMultiSpecE: FolderMatchingTreeNode<CustomSortSpec> = {
	subtree: {
		"mock-folder": {
			matchChildren: {
				"groups": [{
					"order": CustomSortOrder.alphabetical,
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
	it('should not raise error for multiple spec for the same path and choose correct spec, case E', () => {
		const inputTxtArr: Array<string> = txtInputTargetFolderMultiSpecE.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result?.sortSpecByPath).toEqual(expectedSortSpecForMultiSpecE)
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
`

const expectedSortSpecForAdvancedFolderDateSortingMethods: { [key: string]: CustomSortSpec } = {
	'A': {
		defaultOrder: CustomSortOrder.byModifiedTimeAdvanced,
		groups: [{
			order: CustomSortOrder.byModifiedTimeAdvanced,
			type: CustomSortGroupType.Outsiders
		}],
		outsidersGroupIdx: 0,
		targetFoldersPaths: ['A']
	},
	'B': {
		defaultOrder: CustomSortOrder.byModifiedTimeReverseAdvanced,
		groups: [{
				order: CustomSortOrder.byModifiedTimeReverseAdvanced,
				type: CustomSortGroupType.Outsiders
		}],
		outsidersGroupIdx: 0,
		targetFoldersPaths: ['B']
	},
	'C': {
		defaultOrder: CustomSortOrder.byCreatedTimeAdvanced,
		groups: [{
				order: CustomSortOrder.byCreatedTimeAdvanced,
				type: CustomSortGroupType.Outsiders
		}],
		outsidersGroupIdx: 0,
		targetFoldersPaths: ['C']
	},
	'D': {
		defaultOrder: CustomSortOrder.byCreatedTimeReverseAdvanced,
		groups: [{
				order: CustomSortOrder.byCreatedTimeReverseAdvanced,
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
				type: 3
		}, {
				exactPrefix: 'Archive',
				filesOnly: true,
				order: CustomSortOrder.byCreatedTimeReverseAdvanced,
				type: 3
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
/Folders:
 > definitely not correct
`
const txtInputErrorNoSpaceDescendingAttr: string = `
/files: Chapter ...
Order-DESC:MODIFIED
`
const txtInputErrorItemToHideWithNoValue: string = `
target-folder: AAA
--%
`
const txtInputErrorTooManyNumericSortSymbols: string = `
% Chapter\\R+ ... page\\d+ 
`

const txtInputErrorNestedStandardObsidianSortAttr: string = `
target-folder: AAA
/ Some folder
 sorting: standard
`

const txtInputEmptySpec: string = ``

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
			`${ERR_PREFIX} 5:MissingAttributeValue Attribute "TARGET-FOLDER:" requires a value to follow ${ERR_SUFFIX_IN_LINE(2)}`)
		expect(errorsLogger).toHaveBeenNthCalledWith(2, ERR_LINE_TXT('TARGET-FOLDER: '))
	})
	it('should recognize error: no value for ascending sorting attr (space only)', () => {
		const inputTxtArr: Array<string> = txtInputErrorSpaceAsValueOfAscendingAttr.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result).toBeNull()
		expect(errorsLogger).toHaveBeenCalledTimes(2)
		expect(errorsLogger).toHaveBeenNthCalledWith(1,
			`${ERR_PREFIX} 5:MissingAttributeValue Attribute "ORDER-ASC:" requires a value to follow ${ERR_SUFFIX_IN_LINE(2)}`)
		expect(errorsLogger).toHaveBeenNthCalledWith(2, ERR_LINE_TXT('ORDER-ASC: '))
	})
	it('should recognize error: invalid value for descending sorting attr (space only)', () => {
		const inputTxtArr: Array<string> = txtInputErrorInvalidValueOfDescendingAttr.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result).toBeNull()
		expect(errorsLogger).toHaveBeenCalledTimes(2)
		expect(errorsLogger).toHaveBeenNthCalledWith(1,
			`${ERR_PREFIX} 7:InvalidAttributeValue Invalid value of the attribute ">" ${ERR_SUFFIX_IN_LINE(3)}`)
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
			`${ERR_PREFIX} 9:TooManyNumericSortingSymbols Maximum one numeric sorting indicator allowed per line ${ERR_SUFFIX_IN_LINE(2)}`)
		expect(errorsLogger).toHaveBeenNthCalledWith(2, ERR_LINE_TXT('% Chapter\\R+ ... page\\d+ '))
	})
	it('should recognize error: nested standard obsidian sorting attribute', () => {
		const inputTxtArr: Array<string> = txtInputErrorNestedStandardObsidianSortAttr.split('\n')
		const result = processor.parseSortSpecFromText(inputTxtArr, 'mock-folder', 'custom-name-note.md')
		expect(result).toBeNull()
		expect(errorsLogger).toHaveBeenCalledTimes(2)
		expect(errorsLogger).toHaveBeenNthCalledWith(1,
			`${ERR_PREFIX} 14:StandardObsidianSortAllowedOnlyAtFolderLevel The standard Obsidian sort order is only allowed at a folder level (not nested syntax) ${ERR_SUFFIX_IN_LINE(4)}`)
		expect(errorsLogger).toHaveBeenNthCalledWith(2, ERR_LINE_TXT(' sorting: standard'))
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
			`${ERR_PREFIX} 10:NumericalSymbolAdjacentToWildcard Numerical sorting symbol must not be directly adjacent to a wildcard because of potential performance problem. An additional explicit separator helps in such case. ${ERR_SUFFIX_IN_LINE(1)}`)
		expect(errorsLogger).toHaveBeenNthCalledWith(2, ERR_LINE_TXT(s))
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

describe('detectNumericSortingSymbols', () => {
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
		const result = detectNumericSortingSymbols(s)
		expect(result).toBe(b)
	})
})

describe('hasMoreThanOneNumericSortingSymbol', () => {
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
		const result = hasMoreThanOneNumericSortingSymbol(s)
		expect(result).toBe(b)
	})
})

describe('extractNumericSortingSymbol', () => {
	it.each([
		['', null],
		['d+', null],
		[' \\d +', null],
		['\\ d +', null],
		[' \\d+', '\\d+'],
		['--\\.D+\\d+', '\\.D+'],
		['wdwqwqe\\d+\\.D+\\-d+\\R+\\.r+\\-R+ \\d+', '\\d+']
	])('should correctly extract from >%s< the numeric sorting symbol (%s)', (s: string, ss: string) => {
		const result = extractNumericSortingSymbol(s)
		expect(result).toBe(ss)
	})
})

describe('convertPlainStringWithNumericSortingSymbolToRegex', () => {
	it.each([
		[' \\d+ ', /  *(\d+) /i],
		['--\\.D+\\d+', /\-\- *(\d+(?:\.\d+)*)\\d\+/i],
		['Chapter \\D+:', /Chapter  *(\d+):/i],
		['Section \\.D+ of', /Section  *(\d+(?:\.\d+)*) of/i],
		['Part\\-D+:', /Part *(\d+(?:-\d+)*):/i],
		['Lorem ipsum\\r+:', /Lorem ipsum *([MDCLXVI]+):/i],
		['\\.r+', / *([MDCLXVI]+(?:\.[MDCLXVI]+)*)/i],
		['\\-r+:Lorem', / *([MDCLXVI]+(?:-[MDCLXVI]+)*):Lorem/i],
		['abc\\d+efg\\d+hij', /abc *(\d+)efg/i], // Double numerical sorting symbol, error case, covered for clarity of implementation detail
	])('should correctly extract from >%s< the numeric sorting symbol (%s)', (s: string, regex: RegExp) => {
		const result = convertPlainStringWithNumericSortingSymbolToRegex(s, RegexpUsedAs.InUnitTest)
		expect(result?.regexpSpec.regex).toEqual(regex)
		// No need to examine prefix and suffix fields of result, they are secondary and derived from the returned regexp
	})
	it('should not process string not containing numeric sorting symbol', () => {
		const input = 'abc'
		const result = convertPlainStringWithNumericSortingSymbolToRegex(input, RegexpUsedAs.InUnitTest)
		expect(result).toBeNull()
	})
	it('should correctly include regex token for string begin', () => {
		const input = 'Part\\-D+:'
		const result = convertPlainStringWithNumericSortingSymbolToRegex(input, RegexpUsedAs.Prefix)
		expect(result?.regexpSpec.regex).toEqual(/^Part *(\d+(?:-\d+)*):/i)
	})
	it('should correctly include regex token for string end', () => {
		const input = 'Part\\-D+:'
		const result = convertPlainStringWithNumericSortingSymbolToRegex(input, RegexpUsedAs.Suffix)
		expect(result?.regexpSpec.regex).toEqual(/Part *(\d+(?:-\d+)*):$/i)
	})
	it('should correctly include regex token for string begin and end', () => {
		const input = 'Part\\.D+:'
		const result = convertPlainStringWithNumericSortingSymbolToRegex(input, RegexpUsedAs.FullMatch)
		expect(result?.regexpSpec.regex).toEqual(/^Part *(\d+(?:\.\d+)*):$/i)
	})
})
