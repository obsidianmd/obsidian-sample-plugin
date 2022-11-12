import {FrontMatterCache, MetadataCache, requireApiVersion, TAbstractFile, TFile, TFolder} from 'obsidian';
import {
	CustomSortGroup,
	CustomSortGroupType,
	CustomSortOrder,
	CustomSortSpec,
	DEFAULT_METADATA_FIELD_FOR_SORTING
} from "./custom-sort-types";
import {isDefined} from "../utils/utils";

let CollatorCompare = new Intl.Collator(undefined, {
	usage: "sort",
	sensitivity: "base",
	numeric: true,
}).compare;

let CollatorTrueAlphabeticalCompare = new Intl.Collator(undefined, {
	usage: "sort",
	sensitivity: "base",
	numeric: false,
}).compare;

export interface FolderItemForSorting {
	path: string
	groupIdx?: number  // the index itself represents order for groups
	sortString: string // fragment (or full name) to be used for sorting
	metadataFieldValue?: string // relevant to metadata-based sorting only
	matchGroup?: string // advanced - used for secondary sorting rule, to recognize 'same regex match'
	ctimeOldest: number // for a file, both ctime values are the same. For folder they can be different:
	ctimeNewest: number     //  ctimeOldest = ctime of oldest child file, ctimeNewest = ctime of newest child file
	mtime: number
	isFolder: boolean
	folder?: TFolder
}

export type SorterFn = (a: FolderItemForSorting, b: FolderItemForSorting) => number
export type CollatorCompareFn = (a: string, b: string) => number

// Syntax sugar
const TrueAlphabetical: boolean = true
const ReverseOrder: boolean = true
const StraightOrder: boolean = false

const sorterByMetadataField:(reverseOrder?: boolean, trueAlphabetical?: boolean) => SorterFn = (reverseOrder: boolean, trueAlphabetical?: boolean) => {
	const collatorCompareFn: CollatorCompareFn = trueAlphabetical ? CollatorTrueAlphabeticalCompare : CollatorCompare
	return (a: FolderItemForSorting, b: FolderItemForSorting) => {
		if (reverseOrder) {
			[a, b] = [b, a]
		}
		if (a.metadataFieldValue && b.metadataFieldValue) {
			const sortResult: number = collatorCompareFn(a.metadataFieldValue, b.metadataFieldValue)
			if (sortResult === 0) {
				// Fallback -> requested sort by metadata and both items have the same metadata value
				return collatorCompareFn(a.sortString, b.sortString)    // switch to alphabetical sort by note/folder titles
			} else {
				return sortResult
			}
		}
		// Item with metadata goes before the w/o metadata
		if (a.metadataFieldValue) return reverseOrder ? 1 : -1
		if (b.metadataFieldValue) return reverseOrder ? -1 : 1
		// Fallback -> requested sort by metadata, yet none of two items contain it, use alphabetical by name
		return collatorCompareFn(a.sortString, b.sortString)
	}
}

export let Sorters: { [key in CustomSortOrder]: SorterFn } = {
	[CustomSortOrder.alphabetical]: (a: FolderItemForSorting, b: FolderItemForSorting) => CollatorCompare(a.sortString, b.sortString),
	[CustomSortOrder.trueAlphabetical]: (a: FolderItemForSorting, b: FolderItemForSorting) => CollatorTrueAlphabeticalCompare(a.sortString, b.sortString),
	[CustomSortOrder.alphabeticalReverse]: (a: FolderItemForSorting, b: FolderItemForSorting) => CollatorCompare(b.sortString, a.sortString),
	[CustomSortOrder.trueAlphabeticalReverse]: (a: FolderItemForSorting, b: FolderItemForSorting) => CollatorTrueAlphabeticalCompare(b.sortString, a.sortString),
	[CustomSortOrder.byModifiedTime]: (a: FolderItemForSorting, b: FolderItemForSorting) => (a.isFolder && b.isFolder) ? CollatorCompare(a.sortString, b.sortString) : (a.mtime - b.mtime),
	[CustomSortOrder.byModifiedTimeAdvanced]: (a: FolderItemForSorting, b: FolderItemForSorting) => a.mtime - b.mtime,
	[CustomSortOrder.byModifiedTimeReverse]: (a: FolderItemForSorting, b: FolderItemForSorting) => (a.isFolder && b.isFolder) ? CollatorCompare(a.sortString, b.sortString) : (b.mtime - a.mtime),
	[CustomSortOrder.byModifiedTimeReverseAdvanced]: (a: FolderItemForSorting, b: FolderItemForSorting) => b.mtime - a.mtime,
	[CustomSortOrder.byCreatedTime]: (a: FolderItemForSorting, b: FolderItemForSorting) => (a.isFolder && b.isFolder) ? CollatorCompare(a.sortString, b.sortString) : (a.ctimeNewest - b.ctimeNewest),
	[CustomSortOrder.byCreatedTimeAdvanced]: (a: FolderItemForSorting, b: FolderItemForSorting) => a.ctimeNewest - b.ctimeNewest,
	[CustomSortOrder.byCreatedTimeReverse]: (a: FolderItemForSorting, b: FolderItemForSorting) => (a.isFolder && b.isFolder) ? CollatorCompare(a.sortString, b.sortString) : (b.ctimeOldest - a.ctimeOldest),
	[CustomSortOrder.byCreatedTimeReverseAdvanced]: (a: FolderItemForSorting, b: FolderItemForSorting) => b.ctimeOldest - a.ctimeOldest,
	[CustomSortOrder.byMetadataFieldAlphabetical]: sorterByMetadataField(StraightOrder),
	[CustomSortOrder.byMetadataFieldTrueAlphabetical]: sorterByMetadataField(StraightOrder, TrueAlphabetical),
	[CustomSortOrder.byMetadataFieldAlphabeticalReverse]: sorterByMetadataField(ReverseOrder),
	[CustomSortOrder.byMetadataFieldTrueAlphabeticalReverse]: sorterByMetadataField(ReverseOrder, TrueAlphabetical),

	// This is a fallback entry which should not be used - the plugin code should refrain from custom sorting at all
	[CustomSortOrder.standardObsidian]: (a: FolderItemForSorting, b: FolderItemForSorting) => CollatorCompare(a.sortString, b.sortString),
};

function compareTwoItems(itA: FolderItemForSorting, itB: FolderItemForSorting, sortSpec: CustomSortSpec) {
	if (itA.groupIdx != undefined && itB.groupIdx != undefined) {
		if (itA.groupIdx === itB.groupIdx) {
			const group: CustomSortGroup | undefined = sortSpec.groups[itA.groupIdx]
			if (group?.regexSpec && group.secondaryOrder && itA.matchGroup === itB.matchGroup) {
				return Sorters[group.secondaryOrder ?? CustomSortOrder.default](itA, itB)
			} else {
				return Sorters[group?.order ?? CustomSortOrder.default](itA, itB)
			}
		} else {
			return itA.groupIdx - itB.groupIdx;
		}
	} else {
		// should never happen - groupIdx is not known for at least one of items to compare.
		// The logic of determining the index always sets some idx
		// Yet for sanity and to satisfy TS code analyzer a fallback to default behavior below
		return Sorters[CustomSortOrder.default](itA, itB)
	}
}

const isFolder = (entry: TAbstractFile) => {
	// The plain obvious 'entry instanceof TFolder' doesn't work inside Jest unit tests, hence a workaround below
	return !!((entry as any).isRoot);
}

const isByMetadata = (order: CustomSortOrder | undefined) => {
	return order === CustomSortOrder.byMetadataFieldAlphabetical || order === CustomSortOrder.byMetadataFieldAlphabeticalReverse ||
	       order === CustomSortOrder.byMetadataFieldTrueAlphabetical || order === CustomSortOrder.byMetadataFieldTrueAlphabeticalReverse
}

export const DEFAULT_FOLDER_MTIME: number = 0
export const DEFAULT_FOLDER_CTIME: number = 0

export const determineSortingGroup = function (entry: TFile | TFolder, spec: CustomSortSpec): FolderItemForSorting {
	let groupIdx: number
	let determined: boolean = false
	let matchedGroup: string | null | undefined
	let metadataValueToSortBy: string | undefined
	const aFolder: boolean = isFolder(entry)
	const aFile: boolean = !aFolder
	const entryAsTFile: TFile = entry as TFile
	const basename: string = aFolder ? entry.name : entryAsTFile.basename

	for (groupIdx = 0; groupIdx < spec.groups.length; groupIdx++) {
		matchedGroup = null
		const group: CustomSortGroup = spec.groups[groupIdx];
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
					const match: RegExpMatchArray | null | undefined = group.regexSpec?.regex.exec(nameForMatching);
					if (match) {
						determined = true
						matchedGroup = group.regexSpec?.normalizerFn(match[1]);
					}
				}
				break;
			case CustomSortGroupType.ExactSuffix:
				if (group.exactSuffix) {
					if (nameForMatching.endsWith(group.exactSuffix)) {
						determined = true;
					}
				} else { // regexp is involved
					const match: RegExpMatchArray | null | undefined = group.regexSpec?.regex.exec(nameForMatching);
					if (match) {
						determined = true
						matchedGroup = group.regexSpec?.normalizerFn(match[1]);
					}
				}
				break;
			case CustomSortGroupType.ExactHeadAndTail:
				if (group.exactPrefix && group.exactSuffix) {
					if (nameForMatching.length >= group.exactPrefix.length + group.exactSuffix.length) {
						if (nameForMatching.startsWith(group.exactPrefix) && nameForMatching.endsWith(group.exactSuffix)) {
							determined = true;
						}
					}
				} else { // regexp is involved as the prefix or as the suffix
					if ((group.exactPrefix && nameForMatching.startsWith(group.exactPrefix)) ||
						(group.exactSuffix && nameForMatching.endsWith(group.exactSuffix))) {
						const match: RegExpMatchArray | null | undefined = group.regexSpec?.regex.exec(nameForMatching);
						if (match) {
							const fullMatch: string = match[0]
							matchedGroup = group.regexSpec?.normalizerFn(match[1]);
							// check for overlapping of prefix and suffix match (not allowed)
							if ((fullMatch.length + (group.exactPrefix?.length ?? 0) + (group.exactSuffix?.length ?? 0)) <= nameForMatching.length) {
								determined = true
							} else {
								matchedGroup = null // if it falls into Outsiders group, let it use title to sort
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
					const match: RegExpMatchArray | null | undefined = group.regexSpec?.regex.exec(nameForMatching);
					if (match) {
						determined = true
						matchedGroup = group.regexSpec?.normalizerFn(match[1]);
					}
				}
				break
			case CustomSortGroupType.HasMetadataField:
				if (group.withMetadataFieldName) {
					if (spec._mCache) {
						// For folders - scan metadata of 'folder note'
						const notePathToScan: string = aFile ? entry.path : `${entry.path}/${entry.name}.md`
						const frontMatterCache: FrontMatterCache | undefined = spec._mCache.getCache(notePathToScan)?.frontmatter
						const hasMetadata: boolean | undefined = frontMatterCache?.hasOwnProperty(group.withMetadataFieldName)

						if (hasMetadata) {
							determined = true
						}
					}
				}
				break
			case CustomSortGroupType.MatchAll:
				determined = true;
				break
		}
		if (determined) {
			break;
		}
	}

	// the final groupIdx for undetermined folder entry is either the last+1 groupIdx or idx of explicitly defined outsiders group
	let determinedGroupIdx: number | undefined = groupIdx;

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

	// The not obvious logic of determining the value of metadata field to use its value for sorting
	// - the sorting spec processor automatically populates the order field of CustomSortingGroup for each group
	//    - yet defensive code should assume some default
	// - if the order in group is by metadata (and only in that case):
	//    - if byMetadata field name is defined for the group -> use it. Done even if value empty or not present.
	//    - else, if byMetadata field name is defined for the Sorting spec (folder level, for all groups) -> use it. Done even if value empty or not present.
	//    - else, if withMetadata field name is defined for the group -> use it. Done even if value empty or not present.
	//    - otherwise, fallback to the default metadata field name (hardcoded in the plugin as 'sort-index-value')

	// TODO: in manual of plugin, in details, explain these nuances. Let readme.md contain only the basic simple example and reference to manual.md section

	if (determined && determinedGroupIdx !== undefined) {  // <-- defensive code, maybe too defensive
		const group: CustomSortGroup = spec.groups[determinedGroupIdx];
		if (isByMetadata(group?.order)) {
			let metadataFieldName: string | undefined = group.byMetadataField
			if (!metadataFieldName) {
				if (isByMetadata(spec.defaultOrder)) {
					metadataFieldName = spec.byMetadataField
				}
			}
			if (!metadataFieldName) {
				metadataFieldName = group.withMetadataFieldName
			}
			if (!metadataFieldName) {
				metadataFieldName = DEFAULT_METADATA_FIELD_FOR_SORTING
			}
			if (metadataFieldName) {
				if (spec._mCache) {
					// For folders - scan metadata of 'folder note'
					const notePathToScan: string = aFile ? entry.path : `${entry.path}/${entry.name}.md`
					const frontMatterCache: FrontMatterCache | undefined = spec._mCache.getCache(notePathToScan)?.frontmatter
					metadataValueToSortBy = frontMatterCache?.[metadataFieldName]
				}
			}
		}
	}

	return {
		// idx of the matched group or idx of Outsiders group or the largest index (= groups count+1)
		groupIdx: determinedGroupIdx,
		sortString: matchedGroup ? (matchedGroup + '//' + entry.name) : entry.name,
		metadataFieldValue: metadataValueToSortBy,
		matchGroup: matchedGroup ?? undefined,
		isFolder: aFolder,
		folder: aFolder ? (entry as TFolder) : undefined,
		path: entry.path,
		ctimeNewest: aFile ? entryAsTFile.stat.ctime : DEFAULT_FOLDER_CTIME,
		ctimeOldest: aFile ? entryAsTFile.stat.ctime : DEFAULT_FOLDER_CTIME,
		mtime: aFile ? entryAsTFile.stat.mtime : DEFAULT_FOLDER_MTIME
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

// Syntax sugar for readability
export type ModifiedTime = number
export type CreatedTimeNewest = number
export type CreatedTimeOldest = number

export const determineDatesForFolder = (folder: TFolder, now: number): [ModifiedTime, CreatedTimeNewest, CreatedTimeOldest] => {
	let mtimeOfFolder: ModifiedTime = DEFAULT_FOLDER_MTIME
	let ctimeNewestOfFolder: CreatedTimeNewest = DEFAULT_FOLDER_CTIME
	let ctimeOldestOfFolder: CreatedTimeOldest = now
	folder.children.forEach((item) => {
		if (!isFolder(item)) {
			const file: TFile = item as TFile
			if (file.stat.mtime > mtimeOfFolder) {
				mtimeOfFolder = file.stat.mtime
			}
			if (file.stat.ctime > ctimeNewestOfFolder) {
				ctimeNewestOfFolder = file.stat.ctime
			}
			if (file.stat.ctime < ctimeOldestOfFolder) {
				ctimeOldestOfFolder = file.stat.ctime
			}
		}
	})
	return [mtimeOfFolder, ctimeNewestOfFolder, ctimeOldestOfFolder]
}

export const determineFolderDatesIfNeeded = (folderItems: Array<FolderItemForSorting>, sortingSpec: CustomSortSpec, sortingGroupsCardinality: {[key: number]: number} = {}) => {
	const Now: number = Date.now()
	folderItems.forEach((item) => {
		const groupIdx: number | undefined = item.groupIdx
		if (groupIdx !== undefined && sortingGroupsCardinality[groupIdx] > 1) {
			const groupOrder: CustomSortOrder | undefined = sortingSpec.groups[groupIdx].order
			if (sortOrderNeedsFolderDates(groupOrder)) {
				if (item.folder) {
					[item.mtime, item.ctimeNewest, item.ctimeOldest] = determineDatesForFolder(item.folder, Now)
				}
			}
		}
	})
}

export const folderSort = function (sortingSpec: CustomSortSpec, order: string[]) {
	let fileExplorer = this.fileExplorer
	const sortingGroupsCardinality: {[key: number]: number} = {}
	sortingSpec._mCache = sortingSpec.plugin?.app.metadataCache

	const folderItems: Array<FolderItemForSorting> = (sortingSpec.itemsToHide ?
		this.file.children.filter((entry: TFile | TFolder) => {
			return !sortingSpec.itemsToHide!.has(entry.name)
		})
		:
		this.file.children)
		.map((entry: TFile | TFolder) => {
			const itemForSorting: FolderItemForSorting = determineSortingGroup(entry, sortingSpec)
			const groupIdx: number | undefined = itemForSorting.groupIdx
			if (groupIdx !== undefined) {
				sortingGroupsCardinality[groupIdx] = 1 + (sortingGroupsCardinality[groupIdx] ?? 0)
			}
			return itemForSorting
		})

	// Finally, for advanced sorting by modified date, for some folders the modified date has to be determined
	determineFolderDatesIfNeeded(folderItems, sortingSpec, sortingGroupsCardinality)

	folderItems.sort(function (itA: FolderItemForSorting, itB: FolderItemForSorting) {
		return compareTwoItems(itA, itB, sortingSpec);
	});

	const items = folderItems
		.map((item: FolderItemForSorting) => fileExplorer.fileItems[item.path])

	if (requireApiVersion && requireApiVersion("0.15.0")) {
		this.vChildren.setChildren(items);
	} else {
		this.children = items;
	}

	// release risky references
	sortingSpec._mCache = undefined
	sortingSpec.plugin = undefined
};
