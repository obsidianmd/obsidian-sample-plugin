import {
	FrontMatterCache,
	MetadataCache,
	Plugin,
	requireApiVersion,
	TAbstractFile,
	TFile,
	TFolder
} from 'obsidian';
import {
	determineStarredStatusOf,
	Starred_PluginInstance
} from '../utils/StarredPluginSignature';
import {
	determineIconOf,
	ObsidianIconFolder_PluginInstance
} from '../utils/ObsidianIconFolderPluginSignature'
import {
	CustomSortGroup,
	CustomSortGroupType,
	CustomSortOrder,
	CustomSortSpec,
	DEFAULT_METADATA_FIELD_FOR_SORTING,
	NormalizerFn,
	RegExpSpec
} from "./custom-sort-types";
import {
	isDefined
} from "../utils/utils";
import {
	expandMacros
} from "./macros";
import {
	BookmarksPluginInterface
} from "../utils/BookmarksCorePluginSignature";

export interface ProcessingContext {
	// For internal transient use
	plugin?: Plugin                     // to hand over the access to App instance to the sorting engine
	_mCache?: MetadataCache
	starredPluginInstance?: Starred_PluginInstance
	bookmarksPluginInstance?: BookmarksPluginInterface,
	iconFolderPluginInstance?: ObsidianIconFolder_PluginInstance
}

export const CollatorCompare = new Intl.Collator(undefined, {
	usage: "sort",
	sensitivity: "base",
	numeric: true,
}).compare;

export const CollatorTrueAlphabeticalCompare = new Intl.Collator(undefined, {
	usage: "sort",
	sensitivity: "base",
	numeric: false,
}).compare;

export interface FolderItemForSorting {
	path: string
	groupIdx?: number  // the index itself represents order for groups
	sortString: string // file basename / folder name to be used for sorting (optionally prefixed with regexp-matched group)
	sortStringWithExt: string // same as above, yet full filename (with ext)
	metadataFieldValue?: string // relevant to metadata-based group sorting only
	metadataFieldValueSecondary?: string // relevant to secondary metadata-based sorting only
	metadataFieldValueForDerived?: string // relevant to metadata-based sorting-spec level sorting only
	metadataFieldValueForDerivedSecondary?: string // relevant to metadata-based sorting-spec level secondary sorting only
	ctime: number   // for a file ctime is obvious, for a folder = ctime of the oldest child file
	mtime: number   // for a file mtime is obvious, for a folder = date of most recently modified child file
	isFolder: boolean
	folder?: TFolder
	bookmarkedIdx?: number // derived from Bookmarks core plugin position
}

export enum SortingLevelId {
	forPrimary,
	forSecondary,
	forDerivedPrimary,
	forDerivedSecondary,
	forDefaultWhenUnspecified
}

export type SorterFn = (a: FolderItemForSorting, b: FolderItemForSorting) => number
export type PlainSorterFn = (a: TAbstractFile, b: TAbstractFile) => number
export type PlainFileOnlySorterFn = (a: TFile, b: TFile) => number
export type CollatorCompareFn = (a: string, b: string) => number

// Syntax sugar
const TrueAlphabetical: boolean = true
const ReverseOrder: boolean = true
const StraightOrder: boolean = false

export const EQUAL_OR_UNCOMPARABLE: number = 0

export const getMdata = (it: FolderItemForSorting, mdataId?: SortingLevelId) => {
	switch (mdataId) {
		case SortingLevelId.forSecondary: return it.metadataFieldValueSecondary
		case SortingLevelId.forDerivedPrimary: return it.metadataFieldValueForDerived
		case SortingLevelId.forDerivedSecondary: return it.metadataFieldValueForDerivedSecondary
		case SortingLevelId.forPrimary:
		default: return it.metadataFieldValue
	}
}

export const sorterByMetadataField = (reverseOrder?: boolean, trueAlphabetical?: boolean, sortLevelId?: SortingLevelId): SorterFn => {
	const collatorCompareFn: CollatorCompareFn = trueAlphabetical ? CollatorTrueAlphabeticalCompare : CollatorCompare
	return (a: FolderItemForSorting, b: FolderItemForSorting) => {
		let [amdata, bmdata] = [getMdata(a, sortLevelId), getMdata(b, sortLevelId)]
		if (reverseOrder) {
			[amdata, bmdata] = [bmdata, amdata]
		}
		if (amdata && bmdata) {
			const sortResult: number = collatorCompareFn(amdata, bmdata)
			return sortResult
		}
		// Item with metadata goes before the w/o metadata
		if (amdata) return reverseOrder ? 1 : -1
		if (bmdata) return reverseOrder ? -1 : 1

		return EQUAL_OR_UNCOMPARABLE
	}
}

export const sorterByBookmarkOrder:(reverseOrder?: boolean, trueAlphabetical?: boolean) => SorterFn = (reverseOrder: boolean) => {
	return (a: FolderItemForSorting, b: FolderItemForSorting) => {
		if (reverseOrder) {
			[a, b] = [b, a]
		}
		if (a.bookmarkedIdx && b.bookmarkedIdx) {
			// By design the bookmark idx is unique per each item, so no need for secondary sorting if they are equal
			return a.bookmarkedIdx - b.bookmarkedIdx
		}
		// Item with bookmark order goes before the w/o bookmark info
		if (a.bookmarkedIdx) return reverseOrder ? 1 : -1
		if (b.bookmarkedIdx) return reverseOrder ? -1 : 1

		return EQUAL_OR_UNCOMPARABLE
	}
}

export const sorterByFolderCDate:(reverseOrder?: boolean) => SorterFn = (reverseOrder?: boolean) => {
	return (a: FolderItemForSorting, b: FolderItemForSorting) => {
		if (reverseOrder) {
			[a, b] = [b, a]
		}
		if (a.ctime && b.ctime) {
			return a.ctime - b.ctime
		}
		// Folder with determined ctime always goes before empty folder (=> undetermined ctime)
		if (a.ctime) return reverseOrder ? 1 : -1
		if (b.ctime) return reverseOrder ? -1 : 1

		return EQUAL_OR_UNCOMPARABLE
	}
}

export const sorterByFolderMDate:(reverseOrder?: boolean) => SorterFn = (reverseOrder?: boolean) => {
	return (a: FolderItemForSorting, b: FolderItemForSorting) => {
		if (reverseOrder) {
			[a, b] = [b, a]
		}
		if (a.mtime && b.mtime) {
			return a.mtime - b.mtime
		}
		// Folder with determined mtime always goes before empty folder (=> undetermined ctime)
		if (a.mtime) return reverseOrder ? 1 : -1
		if (b.mtime) return reverseOrder ? -1 : 1

		return EQUAL_OR_UNCOMPARABLE
	}
}

const Sorters: { [key in CustomSortOrder]: SorterFn } = {
	[CustomSortOrder.alphabetical]: (a: FolderItemForSorting, b: FolderItemForSorting) => CollatorCompare(a.sortString, b.sortString),
	[CustomSortOrder.alphabeticalWithFileExt]: (a: FolderItemForSorting, b: FolderItemForSorting) => CollatorCompare(a.sortStringWithExt, b.sortStringWithExt),
	[CustomSortOrder.trueAlphabetical]: (a: FolderItemForSorting, b: FolderItemForSorting) => CollatorTrueAlphabeticalCompare(a.sortString, b.sortString),
	[CustomSortOrder.trueAlphabeticalWithFileExt]: (a: FolderItemForSorting, b: FolderItemForSorting) => CollatorTrueAlphabeticalCompare(a.sortStringWithExt, b.sortStringWithExt),
	[CustomSortOrder.alphabeticalReverse]: (a: FolderItemForSorting, b: FolderItemForSorting) => CollatorCompare(b.sortString, a.sortString),
	[CustomSortOrder.alphabeticalReverseWithFileExt]: (a: FolderItemForSorting, b: FolderItemForSorting) => CollatorCompare(b.sortStringWithExt, a.sortStringWithExt),
	[CustomSortOrder.trueAlphabeticalReverse]: (a: FolderItemForSorting, b: FolderItemForSorting) => CollatorTrueAlphabeticalCompare(b.sortString, a.sortString),
	[CustomSortOrder.trueAlphabeticalReverseWithFileExt]: (a: FolderItemForSorting, b: FolderItemForSorting) => CollatorTrueAlphabeticalCompare(b.sortStringWithExt, a.sortStringWithExt),
	[CustomSortOrder.byModifiedTime]: (a: FolderItemForSorting, b: FolderItemForSorting) => (a.isFolder && b.isFolder) ? CollatorCompare(a.sortString, b.sortString) : (a.mtime - b.mtime),
	[CustomSortOrder.byModifiedTimeAdvanced]: sorterByFolderMDate(),
	[CustomSortOrder.byModifiedTimeReverse]: (a: FolderItemForSorting, b: FolderItemForSorting) => (a.isFolder && b.isFolder) ? CollatorCompare(a.sortString, b.sortString) : (b.mtime - a.mtime),
	[CustomSortOrder.byModifiedTimeReverseAdvanced]: sorterByFolderMDate(true),
	[CustomSortOrder.byCreatedTime]: (a: FolderItemForSorting, b: FolderItemForSorting) => (a.isFolder && b.isFolder) ? CollatorCompare(a.sortString, b.sortString) : (a.ctime - b.ctime),
	[CustomSortOrder.byCreatedTimeAdvanced]: sorterByFolderCDate(),
	[CustomSortOrder.byCreatedTimeReverse]: (a: FolderItemForSorting, b: FolderItemForSorting) => (a.isFolder && b.isFolder) ? CollatorCompare(a.sortString, b.sortString) : (b.ctime - a.ctime),
	[CustomSortOrder.byCreatedTimeReverseAdvanced]: sorterByFolderCDate(true),
	[CustomSortOrder.byMetadataFieldAlphabetical]: sorterByMetadataField(StraightOrder, !TrueAlphabetical, SortingLevelId.forPrimary),
	[CustomSortOrder.byMetadataFieldTrueAlphabetical]: sorterByMetadataField(StraightOrder, TrueAlphabetical, SortingLevelId.forPrimary),
	[CustomSortOrder.byMetadataFieldAlphabeticalReverse]: sorterByMetadataField(ReverseOrder, !TrueAlphabetical, SortingLevelId.forPrimary),
	[CustomSortOrder.byMetadataFieldTrueAlphabeticalReverse]: sorterByMetadataField(ReverseOrder, TrueAlphabetical, SortingLevelId.forPrimary),
	[CustomSortOrder.byBookmarkOrder]: sorterByBookmarkOrder(StraightOrder),
	[CustomSortOrder.byBookmarkOrderReverse]: sorterByBookmarkOrder(ReverseOrder),

	// This is a fallback entry which should not be used - the getSorterFor() function below should protect against it
	[CustomSortOrder.standardObsidian]: (a: FolderItemForSorting, b: FolderItemForSorting) => CollatorCompare(a.sortString, b.sortString),
};

// Some sorters are different when used in primary vs. secondary sorting order
const SortersForSecondary: { [key in CustomSortOrder]?: SorterFn } = {
	[CustomSortOrder.byMetadataFieldAlphabetical]: sorterByMetadataField(StraightOrder, !TrueAlphabetical, SortingLevelId.forSecondary),
	[CustomSortOrder.byMetadataFieldTrueAlphabetical]: sorterByMetadataField(StraightOrder, TrueAlphabetical, SortingLevelId.forSecondary),
	[CustomSortOrder.byMetadataFieldAlphabeticalReverse]: sorterByMetadataField(ReverseOrder, !TrueAlphabetical, SortingLevelId.forSecondary),
	[CustomSortOrder.byMetadataFieldTrueAlphabeticalReverse]: sorterByMetadataField(ReverseOrder, TrueAlphabetical, SortingLevelId.forSecondary)
};

const SortersForDerivedPrimary: { [key in CustomSortOrder]?: SorterFn } = {
	[CustomSortOrder.byMetadataFieldAlphabetical]: sorterByMetadataField(StraightOrder, !TrueAlphabetical, SortingLevelId.forDerivedPrimary),
	[CustomSortOrder.byMetadataFieldTrueAlphabetical]: sorterByMetadataField(StraightOrder, TrueAlphabetical, SortingLevelId.forDerivedPrimary),
	[CustomSortOrder.byMetadataFieldAlphabeticalReverse]: sorterByMetadataField(ReverseOrder, !TrueAlphabetical, SortingLevelId.forDerivedPrimary),
	[CustomSortOrder.byMetadataFieldTrueAlphabeticalReverse]: sorterByMetadataField(ReverseOrder, TrueAlphabetical, SortingLevelId.forDerivedPrimary)
};

const SortersForDerivedSecondary: { [key in CustomSortOrder]?: SorterFn } = {
	[CustomSortOrder.byMetadataFieldAlphabetical]: sorterByMetadataField(StraightOrder, !TrueAlphabetical, SortingLevelId.forDerivedSecondary),
	[CustomSortOrder.byMetadataFieldTrueAlphabetical]: sorterByMetadataField(StraightOrder, TrueAlphabetical, SortingLevelId.forDerivedSecondary),
	[CustomSortOrder.byMetadataFieldAlphabeticalReverse]: sorterByMetadataField(ReverseOrder, !TrueAlphabetical, SortingLevelId.forDerivedSecondary),
	[CustomSortOrder.byMetadataFieldTrueAlphabeticalReverse]: sorterByMetadataField(ReverseOrder, TrueAlphabetical, SortingLevelId.forDerivedSecondary)
};

// OS - Obsidian Sort
const OS_alphabetical = 'alphabetical'
const OS_alphabeticalReverse = 'alphabeticalReverse'
export const OS_byModifiedTime = 'byModifiedTime'
export const OS_byModifiedTimeReverse = 'byModifiedTimeReverse'
export const OS_byCreatedTime = 'byCreatedTime'
const OS_byCreatedTimeReverse = 'byCreatedTimeReverse'

export const ObsidianStandardDefaultSortingName = OS_alphabetical

const StandardObsidianToCustomSort: {[key: string]: CustomSortOrder} = {
	[OS_alphabetical]: CustomSortOrder.alphabetical,
	[OS_alphabeticalReverse]: CustomSortOrder.alphabeticalReverse,
	[OS_byModifiedTime]: CustomSortOrder.byModifiedTimeReverse,     // In Obsidian labeled as 'Modified time (new to old)'
	[OS_byModifiedTimeReverse]: CustomSortOrder.byModifiedTime,     // In Obsidian labeled as 'Modified time (old to new)'
	[OS_byCreatedTime]: CustomSortOrder.byCreatedTimeReverse,       // In Obsidian labeled as 'Created time (new to old)'
	[OS_byCreatedTimeReverse]: CustomSortOrder.byCreatedTime        // In Obsidian labeled as 'Created time (old to new)'
}

const StandardObsidianToPlainSortFn: {[key: string]: PlainFileOnlySorterFn} = {
	[OS_alphabetical]: (a: TFile, b: TFile) => CollatorCompare(a.basename, b.basename),
	[OS_alphabeticalReverse]: (a: TFile, b: TFile) => -StandardObsidianToPlainSortFn[OS_alphabetical](a,b),
	[OS_byModifiedTime]: (a: TFile, b: TFile) => b.stat.mtime - a.stat.mtime,
	[OS_byModifiedTimeReverse]: (a: TFile, b: TFile) => -StandardObsidianToPlainSortFn[OS_byModifiedTime](a,b),
	[OS_byCreatedTime]: (a: TFile, b: TFile) => b.stat.ctime - a.stat.ctime,
	[OS_byCreatedTimeReverse]: (a: TFile, b: TFile) => -StandardObsidianToPlainSortFn[OS_byCreatedTime](a,b)
}

// Standard Obsidian comparator keeps folders in the top sorted alphabetically
const StandardObsidianComparator = (order: CustomSortOrder): SorterFn => {
	const customSorterFn = Sorters[order]
	return (a: FolderItemForSorting, b: FolderItemForSorting): number => {
		return a.isFolder || b.isFolder
			?
			(a.isFolder && !b.isFolder ? -1 : (b.isFolder && !a.isFolder ? 1 : Sorters[CustomSortOrder.alphabetical](a,b)))
			:
			customSorterFn(a, b);
	}
}

// Equivalent of StandardObsidianComparator working directly on TAbstractFile items
export const StandardPlainObsidianComparator = (order: string): PlainSorterFn => {
	const fileSorterFn = StandardObsidianToPlainSortFn[order] || StandardObsidianToCustomSort[OS_alphabetical]
	return (a: TAbstractFile, b: TAbstractFile): number => {
		const aIsFolder: boolean = a instanceof TFolder
		const bIsFolder: boolean = b instanceof TFolder
		return aIsFolder || bIsFolder
			?
			(aIsFolder && !bIsFolder ? -1 : (bIsFolder && !aIsFolder ? 1 : CollatorCompare(a.name,b.name)))
			:
			fileSorterFn(a as TFile, b as TFile);
	}
}

export const getSorterFnFor = (sorting: CustomSortOrder, currentUIselectedSorting?: string, sortLevelId?: SortingLevelId): SorterFn => {
	if (sorting === CustomSortOrder.standardObsidian) {
		sorting = StandardObsidianToCustomSort[currentUIselectedSorting ?? 'alphabetical'] ?? CustomSortOrder.alphabetical
		return StandardObsidianComparator(sorting)
	} else {
		// Some sorters have to know at which sorting level they are used
		switch(sortLevelId) {
			case SortingLevelId.forSecondary: return SortersForSecondary[sorting] ?? Sorters[sorting]
			case SortingLevelId.forDerivedPrimary: return SortersForDerivedPrimary[sorting] ?? Sorters[sorting]
			case SortingLevelId.forDerivedSecondary: return SortersForDerivedSecondary[sorting] ?? Sorters[sorting]
			case SortingLevelId.forPrimary:
			default: return Sorters[sorting]
		}
	}
}

export const getComparator = (sortSpec: CustomSortSpec, currentUIselectedSorting?: string): SorterFn => {
	const compareTwoItems = (itA: FolderItemForSorting, itB: FolderItemForSorting) => {
		if (itA.groupIdx != undefined && itB.groupIdx != undefined) {
			if (itA.groupIdx === itB.groupIdx) {
				const group: CustomSortGroup | undefined = sortSpec.groups[itA.groupIdx]
				const primary: number = group?.order ? getSorterFnFor(group.order, currentUIselectedSorting, SortingLevelId.forPrimary)(itA, itB) : EQUAL_OR_UNCOMPARABLE
				if (primary !== EQUAL_OR_UNCOMPARABLE) return primary
				const secondary: number = group?.secondaryOrder ? getSorterFnFor(group.secondaryOrder, currentUIselectedSorting, SortingLevelId.forSecondary)(itA, itB) : EQUAL_OR_UNCOMPARABLE
				if (secondary !== EQUAL_OR_UNCOMPARABLE) return secondary
				const folderLevel: number = sortSpec.defaultOrder ? getSorterFnFor(sortSpec.defaultOrder, currentUIselectedSorting, SortingLevelId.forDerivedPrimary)(itA, itB) : EQUAL_OR_UNCOMPARABLE
				if (folderLevel !== EQUAL_OR_UNCOMPARABLE) return folderLevel
				const folderLevelSecondary: number = sortSpec.defaultSecondaryOrder ? getSorterFnFor(sortSpec.defaultSecondaryOrder, currentUIselectedSorting, SortingLevelId.forDerivedSecondary)(itA, itB) : EQUAL_OR_UNCOMPARABLE
				if (folderLevelSecondary !== EQUAL_OR_UNCOMPARABLE) return folderLevelSecondary
				const defaultForUnspecified: number = getSorterFnFor(CustomSortOrder.default, undefined, SortingLevelId.forDefaultWhenUnspecified)(itA, itB)
				return defaultForUnspecified
			} else {
				return itA.groupIdx - itB.groupIdx;
			}
		} else {
			// should never happen - groupIdx is not known for at least one of items to compare.
			// The logic of determining the index always sets some idx
			// Yet for sanity and to satisfy TS code analyzer some valid behavior below
			if (itA.groupIdx !== undefined) return -1
			if (itB.groupIdx !== undefined) return 1
			return getSorterFnFor(CustomSortOrder.default, currentUIselectedSorting)(itA, itB)
		}
	}
	return compareTwoItems
}

const isFolder = (entry: TAbstractFile) => {
	// The plain obvious 'entry instanceof TFolder' doesn't work inside Jest unit tests, hence a workaround below
	return !!((entry as any).isRoot);
}

const isByMetadata = (order: CustomSortOrder | undefined) => {
	return order === CustomSortOrder.byMetadataFieldAlphabetical || order === CustomSortOrder.byMetadataFieldAlphabeticalReverse ||
	       order === CustomSortOrder.byMetadataFieldTrueAlphabetical || order === CustomSortOrder.byMetadataFieldTrueAlphabeticalReverse
}

// IMPORTANT: do not change the value of below constants
//    It is used in sorter to discern empty folders (thus undetermined dates) from other folders
export const DEFAULT_FOLDER_MTIME: number = 0
export const DEFAULT_FOLDER_CTIME: number = 0

type RegexMatchedGroup = string | undefined
type RegexFullMatch = string | undefined
type Matched = boolean

export const matchGroupRegex = (theRegex: RegExpSpec, nameForMatching: string): [Matched, RegexMatchedGroup, RegexFullMatch] => {
	const match: RegExpMatchArray | null | undefined = theRegex.regex.exec(nameForMatching);
	if (match) {
		const normalizer: NormalizerFn | undefined = theRegex.normalizerFn
		const regexMatchedGroup: string | undefined = match[1]
		if (regexMatchedGroup) {
			return [true, normalizer ? normalizer!(regexMatchedGroup)! : regexMatchedGroup, match[0]]
		} else {
			return [true, undefined, match[0]]
		}
	}
	return [false, undefined, undefined]
}

export const determineSortingGroup = function (entry: TFile | TFolder, spec: CustomSortSpec, ctx?: ProcessingContext): FolderItemForSorting {
	let groupIdx: number
	let determined: boolean = false
	let derivedText: string | null | undefined
	let derivedTextWithExt: string | undefined
	let bookmarkedIdx: number | undefined

	const aFolder: boolean = isFolder(entry)
	const aFile: boolean = !aFolder
	const entryAsTFile: TFile = entry as TFile
	const basename: string = aFolder ? entry.name : entryAsTFile.basename

	// When priorities come in play, the ordered list of groups to check could be shorter
	//    than the actual full set of defined groups, because the outsiders group are not
	//    in the ordered list (aka priorityOrder array)
	const numOfGroupsToCheck: number = spec.priorityOrder ? spec.priorityOrder.length : spec.groups.length
	for (let idx = 0; idx < numOfGroupsToCheck && !determined; idx++) {
		derivedText = null
		groupIdx = spec.priorityOrder ? spec.priorityOrder[idx] : idx
		const group: CustomSortGroup = spec.groupsShadow ? spec.groupsShadow[groupIdx] : spec.groups[groupIdx];
		if (group.foldersOnly && aFile) continue;
		if (group.filesOnly && aFolder) continue;
		const nameForMatching: string = group.matchFilenameWithExt ? entry.name : basename;
		switch (group.type) {
			case CustomSortGroupType.ExactPrefix:
				if (group.exactPrefix) {
					if (nameForMatching.startsWith(group.exactPrefix)) {
						determined = true;
					}
				} else { // regexp is involved
					const [matched, matchedGroup] = matchGroupRegex(group.regexPrefix!, nameForMatching)
					determined = matched
					derivedText = matchedGroup ?? derivedText
				}
				break;
			case CustomSortGroupType.ExactSuffix:
				if (group.exactSuffix) {
					if (nameForMatching.endsWith(group.exactSuffix)) {
						determined = true;
					}
				} else { // regexp is involved
					const [matched, matchedGroup] = matchGroupRegex(group.regexSuffix!, nameForMatching)
					determined = matched
					derivedText = matchedGroup ?? derivedText
				}
				break;
			case CustomSortGroupType.ExactHeadAndTail:
				if (group.exactPrefix && group.exactSuffix) {
					if (nameForMatching.length >= group.exactPrefix.length + group.exactSuffix.length) {
						if (nameForMatching.startsWith(group.exactPrefix) && nameForMatching.endsWith(group.exactSuffix)) {
							determined = true;
						}
					}
				} else if (group.exactPrefix || group.exactSuffix) { // regexp is involved as the prefix or as the suffix (not both)
					if ((group.exactPrefix && nameForMatching.startsWith(group.exactPrefix)) ||
						(group.exactSuffix && nameForMatching.endsWith(group.exactSuffix))) {
						const [matched, matchedGroup, fullMatch] = matchGroupRegex(group.exactPrefix ? group.regexSuffix! : group.regexPrefix!, nameForMatching)
						if (matched) {
							// check for overlapping of prefix and suffix match (not allowed)
							if ((fullMatch!.length + (group.exactPrefix?.length ?? 0) + (group.exactSuffix?.length ?? 0)) <= nameForMatching.length) {
								determined = true
								derivedText = matchedGroup ?? derivedText
							}
						}
					}
				} else { // regexp is involved both as the prefix and as the suffix
					const [matchedLeft, matchedGroupLeft, fullMatchLeft] = matchGroupRegex(group.regexPrefix!, nameForMatching)
					const [matchedRight, matchedGroupRight, fullMatchRight] = matchGroupRegex(group.regexSuffix!, nameForMatching)
					if (matchedLeft && matchedRight) {
						// check for overlapping of prefix and suffix match (not allowed)
						if ((fullMatchLeft!.length + fullMatchRight!.length) <= nameForMatching.length) {
							determined = true
							if (matchedGroupLeft || matchedGroupRight) {
								derivedText = ((matchedGroupLeft || '') + (matchedGroupRight || '')) || derivedText
							}
						}
					}
			}
				break;
			case CustomSortGroupType.ExactName:
				if (group.exactText) {
					if (nameForMatching === group.exactText) {
						determined = true;
					}
				} else { // regexp is involved
					const [matched, matchedGroup] = matchGroupRegex(group.regexPrefix!, nameForMatching)
					if (matched) {
						determined = true
						derivedText = matchedGroup ?? derivedText
					}
				}
				break
			case CustomSortGroupType.HasMetadataField:
				if (group.withMetadataFieldName) {
					if (ctx?._mCache) {
						// For folders - scan metadata of 'folder note'
						const notePathToScan: string = aFile ? entry.path : `${entry.path}/${entry.name}.md`
						const frontMatterCache: FrontMatterCache | undefined = ctx._mCache.getCache(notePathToScan)?.frontmatter
						const hasMetadata: boolean | undefined = frontMatterCache?.hasOwnProperty(group.withMetadataFieldName)

						if (hasMetadata) {
							determined = true
						}
					}
				}
				break
			case CustomSortGroupType.StarredOnly:
				if (ctx?.starredPluginInstance) {
					const starred: boolean = determineStarredStatusOf(entry, aFile, ctx.starredPluginInstance)
					if (starred) {
						determined = true
					}
				}
				break
			case CustomSortGroupType.BookmarkedOnly:
				if (ctx?.bookmarksPluginInstance) {
					const bookmarkOrder: number | undefined = ctx?.bookmarksPluginInstance.determineBookmarkOrder(entry.path)
					if (bookmarkOrder) { // safe ==> orders intentionally start from 1
						determined = true
						bookmarkedIdx = bookmarkOrder
					}
				}
			case CustomSortGroupType.HasIcon:
				if(ctx?.iconFolderPluginInstance) {
					let iconName: string | undefined = determineIconOf(entry, ctx.iconFolderPluginInstance)
					if (iconName) {
						if (group.iconName) {
							determined = iconName === group.iconName
						} else {
							determined = true
						}
					}
				}
				break
			case CustomSortGroupType.MatchAll:
				determined = true;
				break
		}
		if (determined && derivedText) {
			derivedTextWithExt = derivedText + '//' + entry.name
			derivedText = derivedText + '//' + basename
		}
	}

	const idxAfterLastGroupIdx: number = spec.groups.length
	let determinedGroupIdx: number | undefined = determined ? groupIdx! : idxAfterLastGroupIdx

	// Redirection to the first group of combined, if detected
	if (determined) {
		const combinedGroupIdx: number | undefined = spec.groups[determinedGroupIdx].combineWithIdx
		if (combinedGroupIdx !== undefined) {
			determinedGroupIdx = combinedGroupIdx
		}
	}

	if (!determined) {
		// Automatically assign the index to outsiders group, if relevant was configured
		if (isDefined(spec.outsidersFilesGroupIdx) && aFile) {
			determinedGroupIdx = spec.outsidersFilesGroupIdx;
			determined = true
		} else if (isDefined(spec.outsidersFoldersGroupIdx) && aFolder) {
			determinedGroupIdx = spec.outsidersFoldersGroupIdx;
			determined = true
		} else if (isDefined(spec.outsidersGroupIdx)) {
			determinedGroupIdx = spec.outsidersGroupIdx;
			determined = true
		}
	}

	let metadataValueToSortBy: string | undefined
	let metadataValueSecondaryToSortBy: string | undefined
	let metadataValueDerivedPrimaryToSortBy: string | undefined
	let metadataValueDerivedSecondaryToSortBy: string | undefined

	if (determined && determinedGroupIdx !== undefined) {  // <-- defensive code, maybe too defensive
		const group: CustomSortGroup = spec.groups[determinedGroupIdx];
		const isPrimaryOrderByMetadata: boolean = isByMetadata(group?.order)
		const isSecondaryOrderByMetadata: boolean = isByMetadata(group?.secondaryOrder)
		const isDerivedPrimaryByMetadata: boolean = isByMetadata(spec.defaultOrder)
		const isDerivedSecondaryByMetadata: boolean = isByMetadata(spec.defaultSecondaryOrder)
		if (isPrimaryOrderByMetadata || isSecondaryOrderByMetadata || isDerivedPrimaryByMetadata || isDerivedSecondaryByMetadata) {
			if (ctx?._mCache) {
				// For folders - scan metadata of 'folder note'
				const notePathToScan: string = aFile ? entry.path : `${entry.path}/${entry.name}.md`
				const frontMatterCache: FrontMatterCache | undefined = ctx._mCache.getCache(notePathToScan)?.frontmatter
				if (isPrimaryOrderByMetadata) metadataValueToSortBy = frontMatterCache?.[group?.byMetadataField || group?.withMetadataFieldName || DEFAULT_METADATA_FIELD_FOR_SORTING]
				if (isSecondaryOrderByMetadata) metadataValueSecondaryToSortBy = frontMatterCache?.[group?.byMetadataFieldSecondary || group?.withMetadataFieldName || DEFAULT_METADATA_FIELD_FOR_SORTING]
				if (isDerivedPrimaryByMetadata) metadataValueDerivedPrimaryToSortBy = frontMatterCache?.[spec.byMetadataField || DEFAULT_METADATA_FIELD_FOR_SORTING]
				if (isDerivedSecondaryByMetadata) metadataValueDerivedSecondaryToSortBy = frontMatterCache?.[spec.byMetadataFieldSecondary || DEFAULT_METADATA_FIELD_FOR_SORTING]
			}
		}
	}

	return {
		// idx of the matched group or idx of Outsiders group or the largest index (= groups count+1)
		groupIdx: determinedGroupIdx,
		sortString: derivedText ?? basename,
		sortStringWithExt: derivedText ? derivedTextWithExt! : entry.name,
		metadataFieldValue: metadataValueToSortBy,
		metadataFieldValueSecondary: metadataValueSecondaryToSortBy,
		metadataFieldValueForDerived: metadataValueDerivedPrimaryToSortBy,
		metadataFieldValueForDerivedSecondary: metadataValueDerivedSecondaryToSortBy,
		isFolder: aFolder,
		folder: aFolder ? (entry as TFolder) : undefined,
		path: entry.path,
		ctime: aFile ? entryAsTFile.stat.ctime : DEFAULT_FOLDER_CTIME,
		mtime: aFile ? entryAsTFile.stat.mtime : DEFAULT_FOLDER_MTIME,
		bookmarkedIdx: bookmarkedIdx
	}
}

const SortOrderRequiringFolderDate = new Set<CustomSortOrder>([
	CustomSortOrder.byModifiedTimeAdvanced,
	CustomSortOrder.byModifiedTimeReverseAdvanced,
	CustomSortOrder.byCreatedTimeAdvanced,
	CustomSortOrder.byCreatedTimeReverseAdvanced
])

export const sortOrderNeedsFolderDates = (order: CustomSortOrder | undefined, secondary?: CustomSortOrder): boolean => {
	// The CustomSortOrder.standardObsidian used as default because it doesn't require date on folders
	return SortOrderRequiringFolderDate.has(order ?? CustomSortOrder.standardObsidian)
		|| SortOrderRequiringFolderDate.has(secondary ?? CustomSortOrder.standardObsidian)
}

const SortOrderRequiringBookmarksOrder = new Set<CustomSortOrder>([
	CustomSortOrder.byBookmarkOrder,
	CustomSortOrder.byBookmarkOrderReverse
])

export const sortOrderNeedsBookmarksOrder = (order: CustomSortOrder | undefined, secondary?: CustomSortOrder): boolean => {
	// The CustomSortOrder.standardObsidian used as default because it doesn't require bookmarks order
	return SortOrderRequiringBookmarksOrder.has(order ?? CustomSortOrder.standardObsidian)
		|| SortOrderRequiringBookmarksOrder.has(secondary ?? CustomSortOrder.standardObsidian)
}

// Syntax sugar for readability
export type ModifiedTime = number
export type CreatedTime = number

export const determineDatesForFolder = (folder: TFolder, now: number): [ModifiedTime, CreatedTime] => {
	let mtimeOfFolder: ModifiedTime = DEFAULT_FOLDER_MTIME
	let ctimeOfFolder: CreatedTime = DEFAULT_FOLDER_CTIME

	folder.children.forEach((item) => {
		if (!isFolder(item)) {
			const file: TFile = item as TFile
			if (file.stat.mtime > mtimeOfFolder) {
				mtimeOfFolder = file.stat.mtime
			}
			if (file.stat.ctime < ctimeOfFolder || ctimeOfFolder === DEFAULT_FOLDER_CTIME) {
				ctimeOfFolder = file.stat.ctime
			}
		}
	})
	return [mtimeOfFolder, ctimeOfFolder]
}

export const determineFolderDatesIfNeeded = (folderItems: Array<FolderItemForSorting>, sortingSpec: CustomSortSpec) => {
	const Now: number = Date.now()
	folderItems.forEach((item) => {
		if (item.folder) {
			const folderDefaultSortRequiresFolderDate: boolean = !!(sortingSpec.defaultOrder && sortOrderNeedsFolderDates(sortingSpec.defaultOrder, sortingSpec.defaultSecondaryOrder))
			let groupSortRequiresFolderDate: boolean = false
			if (!folderDefaultSortRequiresFolderDate) {
				const groupIdx: number | undefined = item.groupIdx
				if (groupIdx !== undefined) {
					const groupOrder: CustomSortOrder | undefined = sortingSpec.groups[groupIdx].order
					const groupSecondaryOrder: CustomSortOrder | undefined = sortingSpec.groups[groupIdx].secondaryOrder
					groupSortRequiresFolderDate = !!groupOrder && sortOrderNeedsFolderDates(groupOrder, groupSecondaryOrder)
				}
			}
			if (folderDefaultSortRequiresFolderDate || groupSortRequiresFolderDate) {
				[item.mtime, item.ctime] = determineDatesForFolder(item.folder, Now)
			}
		}
	})
}

// Order by bookmarks order can be applied independently of grouping by bookmarked status
//   This function determines the bookmarked order if the sorting criteria (of group or entire folder) requires it
export const determineBookmarksOrderIfNeeded = (folderItems: Array<FolderItemForSorting>, sortingSpec: CustomSortSpec, plugin: BookmarksPluginInterface) => {
	if (!plugin) return

	folderItems.forEach((item) => {
		const folderDefaultSortRequiresBookmarksOrder: boolean = !!(sortingSpec.defaultOrder && sortOrderNeedsBookmarksOrder(sortingSpec.defaultOrder, sortingSpec.defaultSecondaryOrder))
		let groupSortRequiresBookmarksOrder: boolean = false
		if (!folderDefaultSortRequiresBookmarksOrder) {
			const groupIdx: number | undefined = item.groupIdx
			if (groupIdx !== undefined) {
				const groupOrder: CustomSortOrder | undefined = sortingSpec.groups[groupIdx].order
				const groupSecondaryOrder: CustomSortOrder | undefined = sortingSpec.groups[groupIdx].secondaryOrder
				groupSortRequiresBookmarksOrder = sortOrderNeedsBookmarksOrder(groupOrder, groupSecondaryOrder)
			}
		}
		if (folderDefaultSortRequiresBookmarksOrder || groupSortRequiresBookmarksOrder) {
			item.bookmarkedIdx = plugin.determineBookmarkOrder(item.path)
		}
	})
}

export const folderSort = function (sortingSpec: CustomSortSpec, ctx: ProcessingContext) {
	let fileExplorer = this.fileExplorer

	// shallow copy of groups and expand folder-specific macros on them
	sortingSpec.groupsShadow = sortingSpec.groups?.map((group) => Object.assign({} as CustomSortGroup, group))
	const parentFolderName: string|undefined = this.file.name
	expandMacros(sortingSpec, parentFolderName)

	const folderItems: Array<FolderItemForSorting> = (sortingSpec.itemsToHide ?
		this.file.children.filter((entry: TFile | TFolder) => {
			return !sortingSpec.itemsToHide!.has(entry.name)
		})
		:
		this.file.children)
		.map((entry: TFile | TFolder) => {
			const itemForSorting: FolderItemForSorting = determineSortingGroup(entry, sortingSpec, ctx)
			return itemForSorting
		})

	// Finally, for advanced sorting by modified date, for some folders the modified date has to be determined
	determineFolderDatesIfNeeded(folderItems, sortingSpec)

	if (ctx.bookmarksPluginInstance) {
		determineBookmarksOrderIfNeeded(folderItems, sortingSpec, ctx.bookmarksPluginInstance)
	}

	const comparator: SorterFn = getComparator(sortingSpec, fileExplorer.sortOrder)

	folderItems.sort(comparator)

	const items = folderItems
		.map((item: FolderItemForSorting) => fileExplorer.fileItems[item.path])

	if (requireApiVersion && requireApiVersion("0.15.0")) {
		this.vChildren.setChildren(items);
	} else {
		this.children = items;
	}
};

// Returns a sorted copy of the input array, intentionally to keep it intact
export const sortFolderItemsForBookmarking = function (folder: TFolder, items: Array<TAbstractFile>, sortingSpec: CustomSortSpec|null|undefined, ctx: ProcessingContext, uiSortOrder: string): Array<TAbstractFile> {
	if (sortingSpec) {
		const folderItemsByPath: { [key: string]: TAbstractFile } = {}

		// shallow copy of groups and expand folder-specific macros on them
		sortingSpec.groupsShadow = sortingSpec.groups?.map((group) => Object.assign({} as CustomSortGroup, group))
		const parentFolderName: string|undefined = folder.name
		expandMacros(sortingSpec, parentFolderName)

		const folderItems: Array<FolderItemForSorting> = items.map((entry: TFile | TFolder) => {
			folderItemsByPath[entry.path] = entry
			const itemForSorting: FolderItemForSorting = determineSortingGroup(entry, sortingSpec, ctx)
			return itemForSorting
		})

		// Finally, for advanced sorting by modified date, for some folders the modified date has to be determined
		determineFolderDatesIfNeeded(folderItems, sortingSpec)

		if (ctx.bookmarksPluginInstance) {
			determineBookmarksOrderIfNeeded(folderItems, sortingSpec, ctx.bookmarksPluginInstance)
		}

		const comparator: SorterFn = getComparator(sortingSpec, uiSortOrder)

		folderItems.sort(comparator)

		const sortedItems: Array<TAbstractFile> = folderItems.map((entry) => folderItemsByPath[entry.path])

		return sortedItems
	} else { // No custom sorting or the custom sort disabled - apply standard Obsidian sorting (internally 1:1 recreated implementation)
		const folderItems: Array<TAbstractFile> = items.map((entry: TFile | TFolder) => entry)
		const plainSorterFn: PlainSorterFn = StandardPlainObsidianComparator(uiSortOrder)
		folderItems.sort(plainSorterFn)
		return folderItems
	}
};
