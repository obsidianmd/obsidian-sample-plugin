export enum CustomSortGroupType {
	Outsiders, // Not belonging to any of other groups
	MatchAll, // like a wildard *, used in connection with foldersOnly or filesOnly. The difference between the MatchAll and Outsiders is
	ExactName,                           // ... that MatchAll captures the item (folder, note) and prevents further matching against other rules
	ExactPrefix,						  // ... while the Outsiders captures items which didn't match any of other defined groups
	ExactSuffix,
	ExactHeadAndTail, // Like W...n or Un...ed, which is shorter variant of typing the entire title
}

export enum CustomSortOrder {
	alphabetical = 1,  // = 1 to allow: if (customSortOrder) { ...
	alphabeticalReverse,
	byModifiedTime,
	byModifiedTimeAdvanced,
	byModifiedTimeReverse,
	byModifiedTimeReverseAdvanced,
	byCreatedTime,
	byCreatedTimeAdvanced,
	byCreatedTimeReverse,
	byCreatedTimeReverseAdvanced,
	standardObsidian,  // Let the folder sorting be in hands of Obsidian, whatever user selected in the UI
	default = alphabetical
}

export interface RecognizedOrderValue {
	order: CustomSortOrder
	secondaryOrder?: CustomSortOrder
}

export type NormalizerFn = (s: string) => string | null

export interface RegExpSpec {
	regex: RegExp
	normalizerFn: NormalizerFn
}

export interface CustomSortGroup {
	type: CustomSortGroupType
	regexSpec?: RegExpSpec
	exactText?: string
	exactPrefix?: string
	exactSuffix?: string
	order?: CustomSortOrder
	secondaryOrder?: CustomSortOrder
	filesOnly?: boolean
	matchFilenameWithExt?: boolean
	foldersOnly?: boolean,
}

export interface CustomSortSpec {
	targetFoldersPaths: Array<string>   // For root use '/'
	defaultOrder?: CustomSortOrder
	groups: Array<CustomSortGroup>
	outsidersGroupIdx?: number
	outsidersFilesGroupIdx?: number
	outsidersFoldersGroupIdx?: number
	itemsToHide?: Set<string>
}
