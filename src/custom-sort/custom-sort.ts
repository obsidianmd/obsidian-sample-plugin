import {requireApiVersion, TAbstractFile, TFile, TFolder} from 'obsidian';
import {CustomSortGroup, CustomSortGroupType, CustomSortOrder, CustomSortSpec} from "./custom-sort-types";
import {isDefined} from "../utils/utils";

let Collator = new Intl.Collator(undefined, {
	usage: "sort",
	sensitivity: "base",
	numeric: true,
}).compare;

interface FolderItemForSorting {
	path: string
	groupIdx?: number  // the index itself represents order for groups
	sortString: string // fragment (or full name) to be used for sorting
	matchGroup?: string // advanced - used for secondary sorting rule, to recognize 'same regex match'
	ctime: number
	mtime: number
	isFolder: boolean
	folder?: TFolder
}

type SorterFn = (a: FolderItemForSorting, b: FolderItemForSorting) => number

let Sorters: { [key in CustomSortOrder]: SorterFn } = {
	[CustomSortOrder.alphabetical]: (a: FolderItemForSorting, b: FolderItemForSorting) => Collator(a.sortString, b.sortString),
	[CustomSortOrder.alphabeticalReverse]: (a: FolderItemForSorting, b: FolderItemForSorting) => Collator(b.sortString, a.sortString),
	[CustomSortOrder.byModifiedTime]: (a: FolderItemForSorting, b: FolderItemForSorting) => (a.isFolder && b.isFolder) ? Collator(a.sortString, b.sortString) : (a.mtime - b.mtime),
	[CustomSortOrder.byModifiedTimeAdvanced]: (a: FolderItemForSorting, b: FolderItemForSorting) => a.mtime - b.mtime,
	[CustomSortOrder.byModifiedTimeReverse]: (a: FolderItemForSorting, b: FolderItemForSorting) => (a.isFolder && b.isFolder) ? Collator(a.sortString, b.sortString) : (b.mtime - a.mtime),
	[CustomSortOrder.byModifiedTimeReverseAdvanced]: (a: FolderItemForSorting, b: FolderItemForSorting) => b.mtime - a.mtime,
	[CustomSortOrder.byCreatedTime]: (a: FolderItemForSorting, b: FolderItemForSorting) => (a.isFolder && b.isFolder) ? Collator(a.sortString, b.sortString) : (a.ctime - b.ctime),
	[CustomSortOrder.byCreatedTimeReverse]: (a: FolderItemForSorting, b: FolderItemForSorting) => (a.isFolder && b.isFolder) ? Collator(a.sortString, b.sortString) : (b.ctime - a.ctime),

	// This is a fallback entry which should not be used - the plugin code should refrain from custom sorting at all
	[CustomSortOrder.standardObsidian]: (a: FolderItemForSorting, b: FolderItemForSorting) => Collator(a.sortString, b.sortString),
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

export const DEFAULT_FOLDER_MTIME: number = 0
export const DEFAULT_FOLDER_CTIME: number = 0

export const determineSortingGroup = function (entry: TFile | TFolder, spec: CustomSortSpec): FolderItemForSorting {
	let groupIdx: number
	let determined: boolean = false
	let matchedGroup: string | null | undefined
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
				break;
			case CustomSortGroupType.MatchAll:
				determined = true;
				break;
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
		} else if (isDefined(spec.outsidersFoldersGroupIdx) && aFolder) {
			determinedGroupIdx = spec.outsidersFoldersGroupIdx;
		} else if (isDefined(spec.outsidersGroupIdx)) {
			determinedGroupIdx = spec.outsidersGroupIdx;
		}
	}

	return {
		// idx of the matched group or idx of Outsiders group or the largest index (= groups count+1)
		groupIdx: determinedGroupIdx,
		sortString: matchedGroup ? (matchedGroup + '//' + entry.name) : entry.name,
		matchGroup: matchedGroup ?? undefined,
		isFolder: aFolder,
		folder: aFolder ? (entry as TFolder) : undefined,
		path: entry.path,
		ctime: aFile ? entryAsTFile.stat.ctime : DEFAULT_FOLDER_CTIME,
		mtime: aFile ? entryAsTFile.stat.mtime : DEFAULT_FOLDER_MTIME
	}
}

export const sortOrderNeedsFoldersMDate = (order: CustomSortOrder | undefined, secondary?: CustomSortOrder): boolean => {
	return order === CustomSortOrder.byModifiedTimeAdvanced
		|| order === CustomSortOrder.byModifiedTimeReverseAdvanced
		|| secondary === CustomSortOrder.byModifiedTimeAdvanced
		|| secondary === CustomSortOrder.byModifiedTimeReverseAdvanced
}

// Syntax sugar for readability
export type ModifiedTime = number

export const determineModifiedDateForFolder = (folder: TFolder): ModifiedTime => {
	let mtimeOfFolder: ModifiedTime = DEFAULT_FOLDER_MTIME
	folder.children.forEach((item) => {
		if (!isFolder(item)) {
			const file: TFile = item as TFile
			if (file.stat.mtime > mtimeOfFolder) {
				mtimeOfFolder = file.stat.mtime
			}
		}
	})
	return mtimeOfFolder
}


export const folderSort = function (sortingSpec: CustomSortSpec, order: string[]) {
	let fileExplorer = this.fileExplorer
	const sortingGroupsCardinality: {[key: number]: number} = {}

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

	// Finally, for advanced sorting by modified date, for some of the folders the modified date has to be determined
	folderItems.forEach((item) => {
		const groupIdx: number | undefined = item.groupIdx
		if (groupIdx !== undefined) {
			const groupOrder: CustomSortOrder | undefined = sortingSpec.groups[groupIdx].order
			if (sortOrderNeedsFoldersMDate(groupOrder)) {
				if (item.folder) {
					item.mtime = determineModifiedDateForFolder(item.folder)
				}
			}
		}
	})

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
};
