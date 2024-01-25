export enum CustomSortGroupType {
	Outsiders, // Not belonging to any of other groups
	MatchAll, // like a wildard *, used in connection with foldersOnly or filesOnly. The difference between the MatchAll and Outsiders is
	ExactName,                           // ... that MatchAll captures the item (folder, note) and prevents further matching against other rules
	ExactPrefix,						  // ... while the Outsiders captures items which didn't match any of other defined groups
	ExactSuffix,
	ExactHeadAndTail, // Like W...n or Un...ed, which is shorter variant of typing the entire title
	HasMetadataField,  // Notes (or folder's notes) containing a specific metadata field
	StarredOnly,
	BookmarkedOnly,
	HasIcon
}

export enum CustomSortOrder {
	alphabetical = 1,  // = 1 to allow: if (customSortOrder) { ...
	alphabeticalWithFileExt,
	trueAlphabetical,
	trueAlphabeticalWithFileExt,
	alphabeticalReverse,
	alphabeticalReverseWithFileExt,
	trueAlphabeticalReverse,
	trueAlphabeticalReverseWithFileExt,
	byModifiedTime,   // New to old
	byModifiedTimeAdvanced,
	byModifiedTimeReverse,  // Old to new
	byModifiedTimeReverseAdvanced,
	byCreatedTime,  // New to old
	byCreatedTimeAdvanced,
	byCreatedTimeReverse,
	byCreatedTimeReverseAdvanced,
	byMetadataFieldAlphabetical,
	byMetadataFieldTrueAlphabetical,
	byMetadataFieldAlphabeticalReverse,
	byMetadataFieldTrueAlphabeticalReverse,
	standardObsidian,  // whatever user selected in the UI
	byBookmarkOrder,
	byBookmarkOrderReverse,
	default = alphabetical
}

export interface RecognizedOrderValue {
	order: CustomSortOrder
	applyToMetadataField?: string
	secondaryOrder?: CustomSortOrder
	secondaryApplyToMetadataField?: string
}

export type NormalizerFn = (s: string) => string | null
export const IdentityNormalizerFn: NormalizerFn = (s: string) => s

export interface RegExpSpec {
	regex: RegExp
	normalizerFn?: NormalizerFn
}

export interface CustomSortGroup {
	type: CustomSortGroupType
	exactText?: string
	exactPrefix?: string
	regexPrefix?: RegExpSpec
	exactSuffix?: string
	regexSuffix?: RegExpSpec
	order?: CustomSortOrder
	byMetadataField?: string     // for 'by-metadata:' sorting if the order is by metadata alphabetical or reverse
	secondaryOrder?: CustomSortOrder
	byMetadataFieldSecondary?: string     // for 'by-metadata:' sorting if the order is by metadata alphabetical or reverse
	filesOnly?: boolean
	matchFilenameWithExt?: boolean
	foldersOnly?: boolean
	withMetadataFieldName?: string // for 'with-metadata:' grouping
	iconName?: string // for integration with obsidian-folder-icon community plugin
	priority?: number
	combineWithIdx?: number
}

export interface CustomSortSpec {
		// plays only informative role about the original parsed 'target-folder:' values
	targetFoldersPaths: Array<string>   // For root use '/'
	defaultOrder?: CustomSortOrder
	defaultSecondaryOrder?: CustomSortOrder
	byMetadataField?: string            // for 'by-metadata:' if the defaultOrder is by metadata
	byMetadataFieldSecondary?: string
	groups: Array<CustomSortGroup>
	groupsShadow?: Array<CustomSortGroup>   // A shallow copy of groups, used at applying sorting for items in a folder.
	                                        // Stores folder-specific values (e.g. macros expanded with folder-specific values)
	outsidersGroupIdx?: number
	outsidersFilesGroupIdx?: number
	outsidersFoldersGroupIdx?: number
	itemsToHide?: Set<string>
	priorityOrder?: Array<number>       // Indexes of groups in evaluation order
	implicit?: boolean // spec applied automatically (e.g. auto integration with a plugin)
}

export const DEFAULT_METADATA_FIELD_FOR_SORTING: string = 'sort-index-value'
