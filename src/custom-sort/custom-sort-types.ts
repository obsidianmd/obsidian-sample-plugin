import {MetadataCache, Plugin} from "obsidian";

export enum CustomSortGroupType {
	Outsiders, // Not belonging to any of other groups
	MatchAll, // like a wildard *, used in connection with foldersOnly or filesOnly. The difference between the MatchAll and Outsiders is
	ExactName,                           // ... that MatchAll captures the item (folder, note) and prevents further matching against other rules
	ExactPrefix,						  // ... while the Outsiders captures items which didn't match any of other defined groups
	ExactSuffix,
	ExactHeadAndTail, // Like W...n or Un...ed, which is shorter variant of typing the entire title
	HasMetadataField  // Notes (or folder's notes) containing a specific metadata field
}

export enum CustomSortOrder {
	alphabetical = 1,  // = 1 to allow: if (customSortOrder) { ...
	alphabeticalReverse,
	byModifiedTime,   // New to old
	byModifiedTimeAdvanced,
	byModifiedTimeReverse,  // Old to new
	byModifiedTimeReverseAdvanced,
	byCreatedTime,  // New to old
	byCreatedTimeAdvanced,
	byCreatedTimeReverse,
	byCreatedTimeReverseAdvanced,
	byMetadataFieldAlphabetical,
	byMetadataFieldAlphabeticalReverse,
	standardObsidian,  // Let the folder sorting be in hands of Obsidian, whatever user selected in the UI
	default = alphabetical
}

export interface RecognizedOrderValue {
	order: CustomSortOrder
	secondaryOrder?: CustomSortOrder
	applyToMetadataField?: string
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
	byMetadataField?: string     // for 'by-metadata:' if the order is by metadata alphabetical or reverse
	secondaryOrder?: CustomSortOrder
	filesOnly?: boolean
	matchFilenameWithExt?: boolean
	foldersOnly?: boolean
	withMetadataFieldName?: string // for 'with-metadata:'
}

export interface CustomSortSpec {
	targetFoldersPaths: Array<string>   // For root use '/'
	defaultOrder?: CustomSortOrder
	byMetadataField?: string            // for 'by-metadata:' if the defaultOrder is by metadata alphabetical or reverse
	groups: Array<CustomSortGroup>
	outsidersGroupIdx?: number
	outsidersFilesGroupIdx?: number
	outsidersFoldersGroupIdx?: number
	itemsToHide?: Set<string>
	plugin?: Plugin                     // to hand over the access to App instance to the sorting engine

		// For internal transient use
	_mCache?: MetadataCache
}

export const DEFAULT_METADATA_FIELD_FOR_SORTING: string = 'sort-index-value'
