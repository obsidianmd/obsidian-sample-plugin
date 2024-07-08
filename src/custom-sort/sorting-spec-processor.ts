import {
	CustomSortGroup,
	CustomSortGroupType,
	CustomSortOrder,
	CustomSortSpec,
	DEFAULT_METADATA_FIELD_FOR_SORTING,
	IdentityNormalizerFn,
	NormalizerFn,
	RecognizedOrderValue,
	RegExpSpec
} from "./custom-sort-types";
import {isDefined, last} from "../utils/utils";
import {
	CompoundNumberDashRegexStr,
	CompoundNumberDotRegexStr,
	CompoundRomanNumberDashRegexStr,
	CompoundRomanNumberDotRegexStr,
	DASH_SEPARATOR,
	Date_dd_Mmm_yyyy_RegexStr,
	DOT_SEPARATOR,
	getNormalizedDate_dd_Mmm_yyyy_NormalizerFn,
	getNormalizedNumber,
	getNormalizedRomanNumber,
	NumberRegexStr,
	RomanNumberRegexStr,
	WordInAnyLanguageRegexStr,
	WordInASCIIRegexStr
} from "./matchers";
import {
	FolderWildcardMatching,
	MATCH_ALL_SUFFIX,
	MATCH_CHILDREN_1_SUFFIX,
	MATCH_CHILDREN_2_SUFFIX,
	NO_PRIORITY
} from "./folder-matching-rules"

interface ProcessingContext {
	folderPath: string
	specs: Array<CustomSortSpec>
	currentSpec?: CustomSortSpec
	currentSpecGroup?: CustomSortGroup
	implicitSpec?: boolean

	// Support for specific conditions (intentionally not generic approach)
	previousValidEntryWasTargetFolderAttr?: boolean  // Entry in previous non-empty valid line
}

interface ParsedSortingGroup {
	filesOnly?: boolean
	matchFilenameWithExt?: boolean
	foldersOnly?: boolean
	plainSpec?: string
	arraySpec?: Array<string>
	outsidersGroup?: boolean // Mutually exclusive with plainSpec and arraySpec
	itemToHide?: boolean
	priority?: number
	combine?: boolean
}

export enum ProblemCode {
	SyntaxError,
	SyntaxErrorInGroupSpec,
	DuplicateSortSpecForSameFolder,
	DuplicateOrderAttr,
	DanglingOrderAttr,
	MissingAttributeValue,
	NoSpaceBetweenAttributeAndValue,
	InvalidAttributeValue,
	TargetFolderNestedSpec,
	TooManySortingSymbols,
	SortingSymbolAdjacentToWildcard,
	ItemToHideExactNameWithExtRequired,
	ItemToHideNoSupportForThreeDots,
	DuplicateWildcardSortSpecForSameFolder,
	ProblemNoLongerApplicable_StandardObsidianSortAllowedOnlyAtFolderLevel, // Placeholder kept to avoid refactoring of many unit tests (hardcoded error codes)
	PriorityNotAllowedOnOutsidersGroup,
	TooManyPriorityPrefixes,
	CombiningNotAllowedOnOutsidersGroup,
	TooManyCombinePrefixes,
	ModifierPrefixesOnlyOnOutsidersGroup,
	OnlyLastCombinedGroupCanSpecifyOrder,
	TooManyGroupTypePrefixes,
	PriorityPrefixAfterGroupTypePrefix,
	CombinePrefixAfterGroupTypePrefix,
	InlineRegexInPrefixAndSuffix,
	DuplicateByNameSortSpecForFolder,
	EmptyFolderNameToMatch,
	InvalidOrEmptyFolderMatchingRegexp
}

const ContextFreeProblems = new Set<ProblemCode>([
	ProblemCode.DuplicateSortSpecForSameFolder,
	ProblemCode.DuplicateWildcardSortSpecForSameFolder,
	ProblemCode.OnlyLastCombinedGroupCanSpecifyOrder,
	ProblemCode.DuplicateByNameSortSpecForFolder,
	ProblemCode.EmptyFolderNameToMatch,
	ProblemCode.InvalidOrEmptyFolderMatchingRegexp
])

const ThreeDots = '...';
const ThreeDotsLength = ThreeDots.length;

const AmbigueFourDotsEscaper = './...'
const AmbigueFourDotsEscaperLength = AmbigueFourDotsEscaper.length
const AmbigueFourDotsEscaperOverlap = 1  // Number of leading chars in the Escaper to retain in original string

interface CustomSortOrderAscDescPair {
	asc: CustomSortOrder
	desc: CustomSortOrder
}

interface CustomSortOrderSpec {
	order: CustomSortOrder
	byMetadataField?: string
}

const MAX_SORT_LEVEL: number = 1

// remember about .toLowerCase() before comparison!
const OrderLiterals: { [key: string]: CustomSortOrderAscDescPair } = {
	'a-z.': {asc: CustomSortOrder.alphabeticalWithFileExt, desc: CustomSortOrder.alphabeticalReverseWithFileExt},
	'a-z': {asc: CustomSortOrder.alphabetical, desc: CustomSortOrder.alphabeticalReverse},
	'true a-z.': {asc: CustomSortOrder.trueAlphabeticalWithFileExt, desc: CustomSortOrder.trueAlphabeticalReverseWithFileExt},
	'true a-z': {asc: CustomSortOrder.trueAlphabetical, desc: CustomSortOrder.trueAlphabeticalReverse},
	'created': {asc: CustomSortOrder.byCreatedTime, desc: CustomSortOrder.byCreatedTimeReverse},
	'modified': {asc: CustomSortOrder.byModifiedTime, desc: CustomSortOrder.byModifiedTimeReverse},
	'advanced modified': {asc: CustomSortOrder.byModifiedTimeAdvanced, desc: CustomSortOrder.byModifiedTimeReverseAdvanced},
	'advanced created': {asc: CustomSortOrder.byCreatedTimeAdvanced, desc: CustomSortOrder.byCreatedTimeReverseAdvanced},
	'advanced recursive modified': {asc: CustomSortOrder.byModifiedTimeAdvancedRecursive, desc: CustomSortOrder.byModifiedTimeReverseAdvancedRecursive},
	'advanced recursive created': {asc: CustomSortOrder.byCreatedTimeAdvancedRecursive, desc: CustomSortOrder.byCreatedTimeReverseAdvancedRecursive},
	'standard': {asc: CustomSortOrder.standardObsidian, desc: CustomSortOrder.standardObsidian},
	'ui selected': {asc: CustomSortOrder.standardObsidian, desc: CustomSortOrder.standardObsidian},
    'by-bookmarks-order': {asc: CustomSortOrder.byBookmarkOrder, desc: CustomSortOrder.byBookmarkOrderReverse},
	'files-first': {asc: CustomSortOrder.fileFirst, desc: CustomSortOrder.fileFirst},
	'folders-first': {asc: CustomSortOrder.folderFirst, desc: CustomSortOrder.folderFirst},
	'vsc-unicode': {asc: CustomSortOrder.vscUnicode, desc: CustomSortOrder.vscUnicodeReverse},
	'unicode-charcode': {asc: CustomSortOrder.vscUnicode, desc: CustomSortOrder.vscUnicodeReverse}
}

const OrderByMetadataLexeme: string = 'by-metadata:'

const OrderLevelsSeparator: string = ','

enum Attribute {
	TargetFolder = 1, // Starting from 1 to allow: if (attribute) { ...
	OrderAsc,
	OrderDesc,
	OrderUnspecified
}

type OrderAttribute = Exclude<Attribute, Attribute.TargetFolder>

const SortingOrderSpecInvalid: string = 'Invalid sorting order'

const ErrorMsgForAttribute: { [key in Attribute]: string } = {
	[Attribute.TargetFolder]: 'Invalid target folder specification',
	[Attribute.OrderAsc]: SortingOrderSpecInvalid,
	[Attribute.OrderDesc]: SortingOrderSpecInvalid,
	[Attribute.OrderUnspecified]: SortingOrderSpecInvalid
}

const TargetFolderLexeme: string = 'target-folder:'

const OrderDirectionAttrLexemes: { [key: string]: OrderAttribute } = {
	'<': Attribute.OrderAsc,
	'\\<': Attribute.OrderAsc, // to allow single-liners in YAML
	'>': Attribute.OrderDesc,
	'\\>': Attribute.OrderDesc // to allow single-liners in YAML
}

const OrderDirectionPrefixAttrLexemes: { [key: string]: OrderAttribute } = {
	...OrderDirectionAttrLexemes,
	'order-asc:': Attribute.OrderAsc,
	'order-desc:': Attribute.OrderDesc,
	'sorting:': Attribute.OrderUnspecified,
}

const OrderDirectionPostfixAttrLexemes: { [key: string]: OrderAttribute } = {
	...OrderDirectionAttrLexemes,
	'order-asc': Attribute.OrderAsc,
	'order-desc': Attribute.OrderDesc,
	'asc': Attribute.OrderAsc,
	'desc': Attribute.OrderDesc,
}

const TargetFolderLexemes: { [key: string]: Attribute } = {
	[TargetFolderLexeme]: Attribute.TargetFolder,
	'::::': Attribute.TargetFolder
}

const AttrLexemes: { [key: string]: Attribute } = {
	...OrderDirectionPrefixAttrLexemes,
	...OrderDirectionPostfixAttrLexemes,
	...TargetFolderLexemes
}

interface HasOrderAttrLexeme {
	lexeme: string
	attr: OrderAttribute
}

const startsWithOrderAttrLexeme = (s: string, postfixLexemes?: boolean): HasOrderAttrLexeme|undefined => {
	const hasLexeme= Object.keys(postfixLexemes ? OrderDirectionPostfixAttrLexemes : OrderDirectionPrefixAttrLexemes)
		.find((lexeme) => {
			return s?.toLowerCase().startsWith(lexeme)
		})
	return hasLexeme ?
		{lexeme: hasLexeme, attr: postfixLexemes ? OrderDirectionPostfixAttrLexemes[hasLexeme] : OrderDirectionPrefixAttrLexemes[hasLexeme]}
		:
		undefined
}

interface HasOrderNameLiteral {
	literal: string
	order: CustomSortOrderAscDescPair
}

const startsWithOrderNameLiteral = (s: string): HasOrderNameLiteral|undefined => {
	const hasLiteral= Object.keys(OrderLiterals).find((literal) => {
		return s?.toLowerCase().startsWith(literal)
	})
	return hasLiteral ?
		{literal: hasLiteral, order: OrderLiterals[hasLiteral]}
		:
		undefined
}

const OrdersSupportedByMetadata: { [key in CustomSortOrder]?: CustomSortOrder} = {
	[CustomSortOrder.alphabetical]: CustomSortOrder.byMetadataFieldAlphabetical,
	[CustomSortOrder.alphabeticalReverse]: CustomSortOrder.byMetadataFieldAlphabeticalReverse,
	[CustomSortOrder.trueAlphabetical]: CustomSortOrder.byMetadataFieldTrueAlphabetical,
	[CustomSortOrder.trueAlphabeticalReverse]: CustomSortOrder.byMetadataFieldTrueAlphabeticalReverse,
	[CustomSortOrder.alphabeticalWithFileExt]: CustomSortOrder.byMetadataFieldAlphabetical,
	[CustomSortOrder.alphabeticalReverseWithFileExt]: CustomSortOrder.byMetadataFieldAlphabeticalReverse,
	[CustomSortOrder.trueAlphabeticalWithFileExt]: CustomSortOrder.byMetadataFieldTrueAlphabetical,
	[CustomSortOrder.trueAlphabeticalReverseWithFileExt]: CustomSortOrder.byMetadataFieldTrueAlphabeticalReverse
}

const CURRENT_FOLDER_SYMBOL: string = '.'

interface ParsedSortingAttribute {
	nesting: number      // nesting level, 0 (default), 1+
	attribute: Attribute
	value?: any
}

type AttrValueValidatorFn = (v: string, attr: Attribute, attrLexeme: string) => any|AttrError|null;

// Lexemes with name prefix _1_ have to be checked before others, because they are longer variants of shorter lexemes
//    and thus plain parsing would detect the shorter contained variants first otherwise.

const FilesGroupVerboseLexeme: string = '/:files'
const FilesGroupShortLexeme: string = '/:'
const _1_FilesWithExtGroupVerboseLexeme: string = '/:files.'
const _1_FilesWithExtGroupShortLexeme: string = '/:.'
const FoldersGroupVerboseLexeme: string = '/folders'
const FoldersGroupShortLexeme: string = '/'
const AnyTypeGroupLexemeShort: string = '%'  // See % as a combination of / and :
const AnyTypeGroupLexeme1: string = '/folders:files'
const _1_AnyTypeWithExtGroupLexeme1: string = '/folders:files.'
const AnyTypeGroupLexeme2: string = '/%'  // See % as a combination of / and :
const _1_AnyTypeWithExtGroupLexeme2: string = '/%.'  // See % as a combination of / and :.
const HideItemShortLexeme: string = '--%'  // See % as a combination of / and :
const HideItemVerboseLexeme: string = '/--hide:'

const MetadataFieldIndicatorLexeme: string = 'with-metadata:'

const BookmarkedItemIndicatorLexeme: string = 'bookmarked:'

const StarredItemsIndicatorLexeme: string = 'starred:'

const IconIndicatorLexeme: string = 'with-icon:'

const CommentPrefix: string = '//'

const PriorityModifierPrio1Lexeme: string = '/!'
const PriorityModifierPrio2Lexeme: string = '/!!'
const PriorityModifierPrio3Lexeme: string = '/!!!'

const PriorityModifierPrio1TargetFolderLexeme: string = '/!:'
const PriorityModifierPrio2TargetFolderLexeme: string = '/!!:'
const PriorityModifierPrio3TargetFolderLexeme: string = '/!!!:'

const PRIO_1: number = 1
const PRIO_2: number = 2
const PRIO_3: number = 3

const SortingGroupPriorityPrefixes: { [key: string]: number } = {
	[PriorityModifierPrio1Lexeme]: PRIO_1,
	[PriorityModifierPrio2Lexeme]: PRIO_2,
	[PriorityModifierPrio3Lexeme]: PRIO_3
}

const TargetFolderRegexpPriorityPrefixes: { [key: string]: number } = {
	[PriorityModifierPrio1TargetFolderLexeme]: PRIO_1,
	[PriorityModifierPrio2TargetFolderLexeme]: PRIO_2,
	[PriorityModifierPrio3TargetFolderLexeme]: PRIO_3
}

const CombineGroupLexeme: string = '/+'

const CombiningGroupPrefixes: Array<string> = [
	CombineGroupLexeme
]

interface SortingGroupType {
	filesOnly?: boolean
	filenameWithExt?: boolean  // The text matching criteria should apply to filename + extension
	foldersOnly?: boolean
	itemToHide?: boolean
	priority?: number
}

const SortingGroupPrefixes: { [key: string]: SortingGroupType } = {
	[_1_AnyTypeWithExtGroupLexeme1]: {filenameWithExt: true},
	[_1_AnyTypeWithExtGroupLexeme2]: {filenameWithExt: true},
	[_1_FilesWithExtGroupShortLexeme]: {filesOnly: true, filenameWithExt: true},
	[_1_FilesWithExtGroupVerboseLexeme]: {filesOnly: true, filenameWithExt: true},
	[FilesGroupShortLexeme]: {filesOnly: true},
	[FilesGroupVerboseLexeme]: {filesOnly: true},
	[FoldersGroupShortLexeme]: {foldersOnly: true},
	[FoldersGroupVerboseLexeme]: {foldersOnly: true},
	[AnyTypeGroupLexemeShort]: {},
	[AnyTypeGroupLexeme1]: {},
	[AnyTypeGroupLexeme2]: {},
	[HideItemShortLexeme]: {itemToHide: true},
	[HideItemVerboseLexeme]: {itemToHide: true}
}

const isThreeDots = (s: string): boolean => {
	return s === ThreeDots
}

const containsThreeDots = (s: string): boolean => {
	return s.indexOf(ThreeDots) !== -1
}

const RomanNumberRegexSymbol: string = '\\R+'                // Roman number
const CompoundRomanNumberDotRegexSymbol: string = '\\.R+'    // Compound Roman number with dot as separator
const CompoundRomanNumberDashRegexSymbol: string = '\\-R+'   // Compound Roman number with dash as separator

const NumberRegexSymbol: string = '\\d+'               // Plain number
const CompoundNumberDotRegexSymbol: string = '\\.d+'   // Compound number with dot as separator
const CompoundNumberDashRegexSymbol: string = '\\-d+'  // Compound number with dash as separator

const WordInASCIIRegexSymbol: string = '\\a+'
const WordInAnyLanguageRegexSymbol: string = '\\A+'

const InlineRegexSymbol_Digit1: string = '\\d'
const InlineRegexSymbol_Digit2: string = '\\[0-9]'
const InlineRegexSymbol_0_to_3: string = '\\[0-3]'

const Date_dd_Mmm_yyyy_RegexSymbol: string = '\\[dd-Mmm-yyyy]'

const InlineRegexSymbol_CapitalLetter: string = '\\C'
const InlineRegexSymbol_LowercaseLetter: string = '\\l'

const UnsafeRegexCharsRegex: RegExp = /[\^$.\-+\[\]{}()|*?=!\\]/g

export const escapeRegexUnsafeCharacters = (s: string): string => {
	return s.replace(UnsafeRegexCharsRegex, '\\$&')
}

const sortingSymbolsArr: Array<string> = [
	escapeRegexUnsafeCharacters(NumberRegexSymbol),
	escapeRegexUnsafeCharacters(RomanNumberRegexSymbol),
	escapeRegexUnsafeCharacters(CompoundNumberDotRegexSymbol),
	escapeRegexUnsafeCharacters(CompoundNumberDashRegexSymbol),
	escapeRegexUnsafeCharacters(CompoundRomanNumberDotRegexSymbol),
	escapeRegexUnsafeCharacters(CompoundRomanNumberDashRegexSymbol),
	escapeRegexUnsafeCharacters(WordInASCIIRegexSymbol),
	escapeRegexUnsafeCharacters(WordInAnyLanguageRegexSymbol),
	escapeRegexUnsafeCharacters(Date_dd_Mmm_yyyy_RegexSymbol)
]

const sortingSymbolsRegex = new RegExp(sortingSymbolsArr.join('|'), 'gi')

const inlineRegexSymbolsArrEscapedForRegex: Array<string> = [
	escapeRegexUnsafeCharacters(InlineRegexSymbol_Digit1),
	escapeRegexUnsafeCharacters(InlineRegexSymbol_Digit2),
	escapeRegexUnsafeCharacters(InlineRegexSymbol_0_to_3),
	escapeRegexUnsafeCharacters(InlineRegexSymbol_CapitalLetter),
	escapeRegexUnsafeCharacters(InlineRegexSymbol_LowercaseLetter),
]

interface RegexExpr {
	regexExpr: string
	isUnicode?: boolean
	isCaseSensitive?: boolean
}

// Don't be confused if the source lexeme is equal to the resulting regex piece, logically these two distinct spaces
const inlineRegexSymbolsToRegexExpressionsArr: { [key: string]: RegexExpr} = {
	[InlineRegexSymbol_Digit1]: {regexExpr: '\\d'},
	[InlineRegexSymbol_Digit2]: {regexExpr: '[0-9]'},
	[InlineRegexSymbol_0_to_3]: {regexExpr: '[0-3]'},
	[InlineRegexSymbol_CapitalLetter]: {regexExpr: '[\\p{Lu}\\p{Lt}]', isUnicode: true, isCaseSensitive: true},
	[InlineRegexSymbol_LowercaseLetter]: {regexExpr: '\\p{Ll}', isUnicode: true, isCaseSensitive: true},
}

const inlineRegexSymbolsDetectionRegex = new RegExp(inlineRegexSymbolsArrEscapedForRegex.join('|'), 'gi')

export const hasMoreThanOneSortingSymbol = (s: string): boolean => {
	sortingSymbolsRegex.lastIndex = 0
	return sortingSymbolsRegex.test(s) && sortingSymbolsRegex.test(s)
}
export const detectSortingSymbols = (s: string): boolean => {
	sortingSymbolsRegex.lastIndex = 0
	return sortingSymbolsRegex.test(s)
}

export const detectInlineRegex = (s?: string): boolean => {
	inlineRegexSymbolsDetectionRegex.lastIndex = 0
	return s ? inlineRegexSymbolsDetectionRegex.test(s) : false
}

export const extractSortingSymbol = (s?: string): string | null => {
	if (s) {
		sortingSymbolsRegex.lastIndex = 0
		const matches: RegExpMatchArray | null = sortingSymbolsRegex.exec(s)
		return matches ? matches[0] : null
	} else {
		return null
	}
}

export interface RegExpSpecStr {
	regexpStr: string
	normalizerFn: NormalizerFn
	advancedRegexType: AdvancedRegexType
	unicodeRegex?: boolean
}

// Exposed as named exports to allow unit testing
export const RomanNumberNormalizerFn: NormalizerFn = (s: string) => getNormalizedRomanNumber(s)
export const CompoundDotRomanNumberNormalizerFn: NormalizerFn = (s: string) => getNormalizedRomanNumber(s, DOT_SEPARATOR)
export const CompoundDashRomanNumberNormalizerFn: NormalizerFn = (s: string) => getNormalizedRomanNumber(s, DASH_SEPARATOR)
export const NumberNormalizerFn: NormalizerFn = (s: string) => getNormalizedNumber(s)
export const CompoundDotNumberNormalizerFn: NormalizerFn = (s: string) => getNormalizedNumber(s, DOT_SEPARATOR)
export const CompoundDashNumberNormalizerFn: NormalizerFn = (s: string) => getNormalizedNumber(s, DASH_SEPARATOR)
export const Date_dd_Mmm_yyyy_NormalizerFn: NormalizerFn = (s: string) => getNormalizedDate_dd_Mmm_yyyy_NormalizerFn(s)

export enum AdvancedRegexType {
	None, // to allow if (advancedRegex)
	Number,
	CompoundDotNumber,
	CompoundDashNumber,
	RomanNumber,
	CompoundDotRomanNumber,
	CompoundDashRomanNumber,
	WordInASCII,
	WordInAnyLanguage,
	Date_dd_Mmm_yyyy
}

const sortingSymbolToRegexpStr: { [key: string]: RegExpSpecStr } = {
	[RomanNumberRegexSymbol.toLowerCase()]: {
		regexpStr: RomanNumberRegexStr,
		normalizerFn: RomanNumberNormalizerFn,
		advancedRegexType: AdvancedRegexType.RomanNumber
	},
	[CompoundRomanNumberDotRegexSymbol.toLowerCase()]: {
		regexpStr: CompoundRomanNumberDotRegexStr,
		normalizerFn: CompoundDotRomanNumberNormalizerFn,
		advancedRegexType: AdvancedRegexType.CompoundDotRomanNumber
	},
	[CompoundRomanNumberDashRegexSymbol.toLowerCase()]: {
		regexpStr: CompoundRomanNumberDashRegexStr,
		normalizerFn: CompoundDashRomanNumberNormalizerFn,
		advancedRegexType: AdvancedRegexType.CompoundDashRomanNumber
	},
	[NumberRegexSymbol.toLowerCase()]: {
		regexpStr: NumberRegexStr,
		normalizerFn: NumberNormalizerFn,
		advancedRegexType: AdvancedRegexType.Number
	},
	[CompoundNumberDotRegexSymbol.toLowerCase()]: {
		regexpStr: CompoundNumberDotRegexStr,
		normalizerFn: CompoundDotNumberNormalizerFn,
		advancedRegexType: AdvancedRegexType.CompoundDotNumber
	},
	[CompoundNumberDashRegexSymbol.toLowerCase()]: {
		regexpStr: CompoundNumberDashRegexStr,
		normalizerFn: CompoundDashNumberNormalizerFn,
		advancedRegexType: AdvancedRegexType.CompoundDashNumber
	},
	[WordInASCIIRegexSymbol]: {  // Intentionally retain character case
		regexpStr: WordInASCIIRegexStr,
		normalizerFn: IdentityNormalizerFn,
		advancedRegexType: AdvancedRegexType.WordInASCII
	},
	[WordInAnyLanguageRegexSymbol]: {  // Intentionally retain character case
		regexpStr: WordInAnyLanguageRegexStr,
		normalizerFn: IdentityNormalizerFn,
		advancedRegexType: AdvancedRegexType.WordInAnyLanguage,
		unicodeRegex: true
	},
	[Date_dd_Mmm_yyyy_RegexSymbol]: { // Intentionally retain character case
		regexpStr: Date_dd_Mmm_yyyy_RegexStr,
		normalizerFn: Date_dd_Mmm_yyyy_NormalizerFn,
		advancedRegexType: AdvancedRegexType.RomanNumber
	}
}

// advanced regex is a regex, which:
//     - includes a matching group, which is then extracted for sorting needs
//     - AND
//     - contains variable-length matching regex, e.g. [0-9]+
//     - thus requires the prefix and suffix information to check adjacency (to detect and avoid regex backtracking problems)
// to compare, the non-advanced regex (aka simple regex) is constant-length wildcard, e.g.
//     - a single digit
//     - a single alphanumeric character (not implemented yet)
//     - fixed length number (not implemented yet)
//     - overall, guaranteed not to have zero-length matches
export interface RegexMatcherInfo {
	regexpSpec: RegExpSpec
	prefix: string    // NOTE! This can also contain regex string, yet w/o matching groups and w/o optional matches
	suffix: string    //    in other words, if there is a regex in prefix or suffix, it is guaranteed to not have zero-length matches
	containsAdvancedRegex: AdvancedRegexType
}

export enum RegexpUsedAs {
	InUnitTest,
	Prefix,
	Suffix,
	FullMatch
}

export const convertPlainStringToLeftRegex = (s: string): RegexMatcherInfo | null => {
	return convertPlainStringToRegex(s, RegexpUsedAs.Prefix)
}

export const convertPlainStringToRightRegex = (s: string): RegexMatcherInfo | null => {
	return convertPlainStringToRegex(s, RegexpUsedAs.Suffix)
}

export const convertPlainStringToFullMatchRegex = (s: string): RegexMatcherInfo | null => {
	return convertPlainStringToRegex(s, RegexpUsedAs.FullMatch)
}

export const convertPlainStringToRegex = (s: string, actAs: RegexpUsedAs): RegexMatcherInfo | null => {
	const regexMatchesStart: boolean = [RegexpUsedAs.Prefix, RegexpUsedAs.FullMatch].includes(actAs)
	const regexMatchesEnding: boolean = [RegexpUsedAs.Suffix, RegexpUsedAs.FullMatch].includes(actAs)
	const detectedSymbol: string | null = extractSortingSymbol(s)
	if (detectedSymbol) {
		// for some sorting symbols lower- and upper-case syntax has different meaning, for some others not
		const replacement: RegExpSpecStr = sortingSymbolToRegexpStr[detectedSymbol] ?? sortingSymbolToRegexpStr[detectedSymbol.toLowerCase()]
		const [extractedPrefix, extractedSuffix] = s!.split(detectedSymbol)
		const regexPrefix: string = regexMatchesStart ? '^' : ''
		const regexSuffix: string = regexMatchesEnding ? '$' : ''
		const escapedProcessedPrefix: RegexAsString = convertInlineRegexSymbolsAndEscapeTheRest(extractedPrefix)
		const escapedProcessedSuffix: RegexAsString = convertInlineRegexSymbolsAndEscapeTheRest(extractedSuffix)
		const regexUnicode: boolean = !!replacement.unicodeRegex || !!escapedProcessedPrefix.isUnicodeRegex || !!escapedProcessedSuffix.isUnicodeRegex
		const regexCaseSensitive: boolean = !!escapedProcessedPrefix.isCaseSensitiveRegex || !!escapedProcessedSuffix.isCaseSensitiveRegex
		const regexFlags: string = `${regexUnicode?'u':''}${regexCaseSensitive?'':'i'}`
		return {
			regexpSpec: {
				regex: new RegExp(`${regexPrefix}${escapedProcessedPrefix.s}${replacement.regexpStr}${escapedProcessedSuffix.s}${regexSuffix}`, regexFlags),
				normalizerFn: replacement.normalizerFn
			},
			prefix: extractedPrefix,
			suffix: extractedSuffix,
			containsAdvancedRegex: replacement.advancedRegexType
		}
	} else if (detectInlineRegex(s)) {
		const replacement: RegexAsString = convertInlineRegexSymbolsAndEscapeTheRest(s)!
		const regexPrefix: string = regexMatchesStart ? '^' : ''
		const regexSuffix: string = regexMatchesEnding ? '$' : ''
		const regexFlags: string = `${replacement.isUnicodeRegex?'u':''}${replacement.isCaseSensitiveRegex?'':'i'}`
		return {
			regexpSpec: {
				regex: new RegExp(`${regexPrefix}${replacement.s}${regexSuffix}`, regexFlags)
			},
			prefix: '', // shouldn't be used anyway because of the below containsAdvancedRegex: false
			suffix: '', // ---- // ----
			containsAdvancedRegex: AdvancedRegexType.None
		}
	} else {
		return null
	}
}

export interface RegexAsString {
	s: string
	isUnicodeRegex?: boolean
	isCaseSensitiveRegex?: boolean
}

export const convertInlineRegexSymbolsAndEscapeTheRest = (s: string): RegexAsString => {
	if (s === '') {
		return {
			s: s
		}
	}

	let regexAsString: Array<string> = []
	let isUnicode: boolean = false
    let isCaseSensitive: boolean = false

	while (s!.length > 0) {
		// detect the first inline regex
		let earliestRegexSymbolIdx: number | undefined = undefined
		let earliestRegexSymbol: string | undefined = undefined
		for (let inlineRegexSymbol of Object.keys(inlineRegexSymbolsToRegexExpressionsArr)) {
			const index: number = s!.indexOf(inlineRegexSymbol)
			if (index >= 0) {
				if (earliestRegexSymbolIdx !== undefined) {
					if (index < earliestRegexSymbolIdx) {
						earliestRegexSymbolIdx = index
						earliestRegexSymbol = inlineRegexSymbol
					}
				} else {
					earliestRegexSymbolIdx = index
					earliestRegexSymbol = inlineRegexSymbol
				}
			}
		}
		if (earliestRegexSymbolIdx !== undefined) {
			if (earliestRegexSymbolIdx > 0) {
				const charsBeforeRegexSymbol: string = s!.substring(0, earliestRegexSymbolIdx)
				regexAsString.push(escapeRegexUnsafeCharacters(charsBeforeRegexSymbol))
				s = s!.substring(earliestRegexSymbolIdx)
			}
			const expr = inlineRegexSymbolsToRegexExpressionsArr[earliestRegexSymbol!]
			regexAsString.push(expr.regexExpr)
			isUnicode ||= !!expr.isUnicode
			isCaseSensitive ||= !!expr.isCaseSensitive
			s = s!.substring(earliestRegexSymbol!.length)
		} else {
			regexAsString.push(escapeRegexUnsafeCharacters(s))
			s = ''
		}
	}

	return {
		s: regexAsString.join(''),
		isUnicodeRegex: isUnicode,
		isCaseSensitiveRegex: isCaseSensitive
	}
}

export const MatchFolderNameLexeme: string = 'name:'
export const MatchFolderByRegexpLexeme: string = 'regexp:'
export const RegexpAgainstFolderName: string = 'for-name:'
export const DebugFolderRegexMatchesLexeme: string = 'debug:'

type FolderPath = string
type FolderName = string

export interface FolderPathToSortSpecMap {
	[key: FolderPath]: CustomSortSpec
}

export interface FolderNameToSortSpecMap {
	[key: FolderName]: CustomSortSpec
}

export interface SortSpecsCollection {
	sortSpecByPath?: FolderPathToSortSpecMap
	sortSpecByName?: FolderNameToSortSpecMap
	sortSpecByWildcard?: FolderWildcardMatching<CustomSortSpec>
}

const ensureCollectionHasSortSpecByPath = (collection?: SortSpecsCollection | null) => {
	collection = collection ?? {}
	if (!collection.sortSpecByPath) {
		collection.sortSpecByPath = {}
	}
	return collection
}

const ensureCollectionHasSortSpecByName = (collection?: SortSpecsCollection | null) => {
	collection = collection ?? {}
	if (!collection.sortSpecByName) {
		collection.sortSpecByName = {}
	}
	return collection
}

const ensureCollectionHasSortSpecByWildcard = (collection?: SortSpecsCollection | null) => {
	collection = collection ?? {}
	if (!collection.sortSpecByWildcard) {
		collection.sortSpecByWildcard = new FolderWildcardMatching<CustomSortSpec>((spec: CustomSortSpec) => !!spec.implicit)
	}
	return collection
}

interface AdjacencyInfo {
	noPrefix: boolean,
	noSuffix: boolean
}

const checkAdjacency = (sortingSymbolInfo: RegexMatcherInfo): AdjacencyInfo => {
	return {
		noPrefix: sortingSymbolInfo.prefix.length === 0,
		noSuffix: sortingSymbolInfo.suffix.length === 0
	}
}

const endsWithWildcardPatternSuffix = (path: string): boolean => {
	return path.endsWith(MATCH_CHILDREN_1_SUFFIX) ||
		path.endsWith(MATCH_CHILDREN_2_SUFFIX) ||
		path.endsWith(MATCH_ALL_SUFFIX)
}


/*
 Important note:
   even if the actual enum labels seem to be unused thus unneeded, their numerical values (implied by the order below) matter.
   They define the priorities of the rules for wilcard target-folder specs. The rule with higher priority overrides the one with lower
 */
enum WildcardPriority {
	NO_WILDCARD = 1,
	NO_WILDCARD_IMPLICIT,
	MATCH_CHILDREN,
	MATCH_ALL,
	MATCH_CHILDREN_IMPLICIT,
	MATCH_ALL_IMPLICIT
}

const stripWildcardPatternSuffix = (path: string, ofImplicitSpec: boolean): {path: string, detectedWildcardPriority: number} => {
	if (path.endsWith(MATCH_ALL_SUFFIX)) {
		path = path.slice(0, -MATCH_ALL_SUFFIX.length)
		return {
			path: path.length > 0 ? path : '/',
			detectedWildcardPriority: ofImplicitSpec ? WildcardPriority.MATCH_ALL_IMPLICIT : WildcardPriority.MATCH_ALL
		}
	}
	if (path.endsWith(MATCH_CHILDREN_1_SUFFIX)) {
		path = path.slice(0, -MATCH_CHILDREN_1_SUFFIX.length)
		return {
			path: path.length > 0 ? path : '/',
			detectedWildcardPriority: ofImplicitSpec ? WildcardPriority.MATCH_CHILDREN_IMPLICIT : WildcardPriority.MATCH_CHILDREN
		}
	}
	if (path.endsWith(MATCH_CHILDREN_2_SUFFIX)) {
		path = path.slice(0, -MATCH_CHILDREN_2_SUFFIX.length)
		return {
			path: path.length > 0 ? path : '/',
			detectedWildcardPriority: ofImplicitSpec ? WildcardPriority.MATCH_CHILDREN_IMPLICIT : WildcardPriority.MATCH_CHILDREN
		}
	}
	return {
		path: path,
		detectedWildcardPriority: ofImplicitSpec ? WildcardPriority.NO_WILDCARD_IMPLICIT : WildcardPriority.NO_WILDCARD
	}
}

const eatPrefixIfPresent = (expression: string, prefix: string, onDetected: () => void): string => {
	const detected: boolean = expression.startsWith(prefix)
	if (detected) {
		onDetected()
		return expression.substring(prefix.length).trim()
	} else {
		return expression
	}
}

export interface ConsumedFolderMatchingRegexp {
	regexp: RegExp
	againstName: boolean
	priority: number | undefined
	log: boolean | undefined
}

export const consumeFolderByRegexpExpression = (expression: string): ConsumedFolderMatchingRegexp => {
	let againstName: boolean = false
	let priority: number | undefined
	let logMatches: boolean | undefined

	let nextRoundNeeded: boolean

	do {
		nextRoundNeeded = false

		expression = eatPrefixIfPresent(expression, RegexpAgainstFolderName, () => {
			againstName = true
			nextRoundNeeded = true
		})

		for (const priorityPrefix of Object.keys(TargetFolderRegexpPriorityPrefixes)) {
			let doBreak: boolean = false
			expression = eatPrefixIfPresent(expression, priorityPrefix, () => {
				priority = TargetFolderRegexpPriorityPrefixes[priorityPrefix]
				nextRoundNeeded = true
				doBreak = true
			})
			if (doBreak) {
				break
			}
		}

		expression = eatPrefixIfPresent(expression, DebugFolderRegexMatchesLexeme, () => {
			logMatches = true
			nextRoundNeeded = true
		})
	} while (nextRoundNeeded)

	// do not allow empty regexp
	if (!expression || expression.trim() === '') {
		throw new Error('Empty regexp')
	}

	return {
		regexp: new RegExp(expression),
		againstName: againstName,
		priority: priority === undefined ? NO_PRIORITY : priority,
		log: !!logMatches
	}
}

class AttrError {
	constructor(public errorMsg: string) {
	}
}

// Simplistic
const extractIdentifier = (text: string, defaultResult?: string): string | undefined => {
	const identifier: string = text.trim().split(' ')?.[0]?.trim()
	return identifier ? identifier : defaultResult
}

const ADJACENCY_ERROR: string = "Sorting symbol must not be directly adjacent to a wildcard because of potential performance problem. An additional explicit separator helps in such case."

export class SortingSpecProcessor {
	ctx: ProcessingContext
	currentEntryLine: string | null
	currentEntryLineIdx: number | null
	currentSortingSpecContainerFilePath: string | null
	problemAlreadyReportedForCurrentLine: boolean | null
	recentErrorMessage: string | null

	// Helper map to deal with rule priorities for the same path
	//   and also detect non-wildcard duplicates.
	//   The wildcard duplicates were detected prior to this point, no need to bother about them
	pathMatchPriorityForPath: {[key: string]: WildcardPriority} = {}

	// Logger parameter exposed to support unit testing of error cases as well as capturing error messages
	//  for in-app presentation
	constructor(private errorLogger?: typeof console.log) {
	}

	// root level parser function
	parseSortSpecFromText(text: Array<string>,
						  folderPath: string,
						  sortingSpecFileName: string,
						  collection?: SortSpecsCollection | null,
						  implicitSpec?: boolean
	): SortSpecsCollection | null | undefined {
		// reset / init processing state after potential previous invocation
		this.ctx = {
			folderPath: folderPath,   // location of the sorting spec file
			specs: [],
			implicitSpec: implicitSpec
		};
		this.currentEntryLine = null
		this.currentEntryLineIdx = null
		this.currentSortingSpecContainerFilePath = null
		this.problemAlreadyReportedForCurrentLine = null
		this.recentErrorMessage = null

		let success: boolean = false;
		let lineIdx: number = 0;
		for (let entryLine of text) {
			lineIdx++
			this.currentEntryLine = entryLine
			this.currentEntryLineIdx = lineIdx
			this.currentSortingSpecContainerFilePath = `${folderPath === '/' ? '' : folderPath}/${sortingSpecFileName}`
			this.problemAlreadyReportedForCurrentLine = false

			const trimmedEntryLine: string = entryLine.trim()
			if (trimmedEntryLine === '') continue
			if (trimmedEntryLine.startsWith(CommentPrefix)) continue

			success = false   // Empty lines and comments are OK, that's why setting so late

			const attr: ParsedSortingAttribute | null = this.parseAttribute(entryLine);
			if (attr) {
				success = this.processParsedSortingAttribute(attr);
				this.ctx.previousValidEntryWasTargetFolderAttr = success && (attr.attribute === Attribute.TargetFolder)
			} else if (!this.problemAlreadyReportedForCurrentLine && !this.checkForRiskyAttrSyntaxError(entryLine)) {
				let group: ParsedSortingGroup | null = this.parseSortingGroupSpec(entryLine);
				if (!this.problemAlreadyReportedForCurrentLine && !group) {
					// Default for unrecognized syntax: treat the line as exact name (of file or folder)
					group = {plainSpec: trimmedEntryLine}
				}
				if (group) {
					success = this.processParsedSortGroupSpec(group);
				}
				this.ctx.previousValidEntryWasTargetFolderAttr = undefined
			}
			if (!success) {
				if (!this.problemAlreadyReportedForCurrentLine) {
					this.problem(ProblemCode.SyntaxError, "Sorting specification line doesn't match any supported syntax")
				}
				break;
			}
		}

		if (success) {
			if (this.ctx.specs.length > 0) {
				for (let spec of this.ctx.specs) {
					if (!this.postprocessSortSpec(spec)) {
						return null
					}
				}

				for (let spec of this.ctx.specs) {
					// Consume the folder names prefixed by the designated lexeme
					for (let idx = 0; idx<spec.targetFoldersPaths.length; idx++) {
						const path = spec.targetFoldersPaths[idx]
						if (path.startsWith(MatchFolderNameLexeme)) {
							const folderNameToMatch: string = path.substring(MatchFolderNameLexeme.length).trim()
							if (folderNameToMatch === '') {
								this.problem(ProblemCode.EmptyFolderNameToMatch,
									`Empty '${TargetFolderLexeme} ${MatchFolderNameLexeme}' value` )
								return null // Failure - not allow duplicate by folderNameToMatch specs for the same folder folderNameToMatch
							}
							collection = ensureCollectionHasSortSpecByName(collection)
							if (collection.sortSpecByName![folderNameToMatch]) {
								this.problem(ProblemCode.DuplicateByNameSortSpecForFolder,
									`Duplicate '${TargetFolderLexeme} ${MatchFolderNameLexeme}' definition for the same name <${folderNameToMatch}>` )
								return null // Failure - not allow duplicate by folderNameToMatch specs for the same folder folderNameToMatch
							} else {
								collection.sortSpecByName![folderNameToMatch] = spec
							}
						}
					}
				}

				for (let spec of this.ctx.specs) {
					// Consume the folder paths ending with wildcard specs or regexp-based
					for (let idx = 0; idx<spec.targetFoldersPaths.length; idx++) {
						const path = spec.targetFoldersPaths[idx]
						if (path.startsWith(MatchFolderByRegexpLexeme)) {
							collection = ensureCollectionHasSortSpecByWildcard(collection)
							const folderByRegexpExpression: string = path.substring(MatchFolderByRegexpLexeme.length).trim()
							try {
								const r: ConsumedFolderMatchingRegexp = consumeFolderByRegexpExpression(folderByRegexpExpression)
								collection.sortSpecByWildcard!.addRegexpDefinition(r.regexp, r.againstName, r.priority, r.log, spec)
							} catch (e) {
								this.problem(ProblemCode.InvalidOrEmptyFolderMatchingRegexp,
									`Invalid or empty folder regexp expression <${folderByRegexpExpression}>`)
								return null
							}
						} else if (endsWithWildcardPatternSuffix(path)) {
							collection = ensureCollectionHasSortSpecByWildcard(collection)
							const ruleAdded = collection.sortSpecByWildcard!.addWildcardDefinition(path, spec)
							if (ruleAdded?.errorMsg) {
								this.problem(ProblemCode.DuplicateWildcardSortSpecForSameFolder, ruleAdded?.errorMsg)
								return null // Failure - not allow duplicate wildcard specs for the same folder
							}
						}
					}
				}

				for (let spec of this.ctx.specs) {
					for (let idx = 0; idx < spec.targetFoldersPaths.length; idx++) {
						const originalPath = spec.targetFoldersPaths[idx]
						if (!originalPath.startsWith(MatchFolderNameLexeme) && !originalPath.startsWith(MatchFolderByRegexpLexeme)) {
							const {path, detectedWildcardPriority} = stripWildcardPatternSuffix(originalPath, !!spec.implicit)
							let storeTheSpec: boolean = true
							const preexistingSortSpecPriority: WildcardPriority = this.pathMatchPriorityForPath[path]
							if (preexistingSortSpecPriority) {
								if (preexistingSortSpecPriority === WildcardPriority.NO_WILDCARD && detectedWildcardPriority === WildcardPriority.NO_WILDCARD) {
									this.problem(ProblemCode.DuplicateSortSpecForSameFolder, `Duplicate sorting spec for folder ${path}`)
									return null // Failure - not allow duplicate specs for the same no-wildcard folder path
								} else if (detectedWildcardPriority >= preexistingSortSpecPriority) {
									// Ignore lower priority rule
									storeTheSpec = false
								}
							}
							if (storeTheSpec) {
								collection = ensureCollectionHasSortSpecByPath(collection)
								collection.sortSpecByPath![path] = spec
								this.pathMatchPriorityForPath[path] = detectedWildcardPriority
							}
						}
					}
				}
			}
			return collection
		} else {
			return null
		}
	}

	problem = (code: ProblemCode, details: string): void => {
		const problemLabel = ProblemCode[code]
		let logger: typeof console.log = this.errorLogger ?? console.error
		const hasLineContext: boolean = !ContextFreeProblems.has(code)
		const lineContext = (hasLineContext) ? ` line ${this.currentEntryLineIdx} of` : ''

		logger(`Sorting specification problem: ${code}:${problemLabel} ${details} ---` +
			`encountered in${lineContext} sorting spec in file ${this.currentSortingSpecContainerFilePath}`)
		if (lineContext) {
			logger(`Content of problematic line: "${this.currentEntryLine}"`)
		}

		this.recentErrorMessage =
			`File: ${this.currentSortingSpecContainerFilePath}\n` +
			(hasLineContext ? `Specification line #${this.currentEntryLineIdx}: "${this.currentEntryLine}"\n` : '') +
			`Problem: ${code}:${problemLabel}\n` +
			`Details: ${details}`
		this.problemAlreadyReportedForCurrentLine = true
	}

	// level 1 parser functions defined in order of occurrence and dependency

	private parseAttribute = (line: string): ParsedSortingAttribute | null => {
		const lineTrimmedStart: string = line.trimStart()
		const nestingLevel: number = line.length - lineTrimmedStart.length

		// Attribute lexeme (name or alias) requires trailing space separator
		const indexOfSpace: number = lineTrimmedStart.indexOf(' ')
		if (indexOfSpace === -1) {
			return null;   // Seemingly not an attribute or a syntax error, to be checked separately
		}
		const firstLexeme: string = lineTrimmedStart.substring(0, indexOfSpace)
		const firstLexemeLowerCase: string = firstLexeme.toLowerCase()
		const recognizedAttr: Attribute = AttrLexemes[firstLexemeLowerCase]

		if (recognizedAttr) {
			const attrValue: string = lineTrimmedStart.substring(indexOfSpace).trim()
			if (attrValue) {
				const validator: AttrValueValidatorFn = this.attrValueValidators[recognizedAttr]
				if (validator) {
					const validValue = validator(attrValue, recognizedAttr, firstLexeme);
					if (validValue instanceof AttrError) {
						this.problem(ProblemCode.InvalidAttributeValue, validValue.errorMsg || ErrorMsgForAttribute[recognizedAttr])
					} else if (validValue) {
						return {
							nesting: nestingLevel,
							attribute: recognizedAttr,
							value: validValue
						}
					} else {
						this.problem(ProblemCode.InvalidAttributeValue, ErrorMsgForAttribute[recognizedAttr])
					}
				} else {
					return {
						nesting: nestingLevel,
						attribute: recognizedAttr,
						value: attrValue
					}
				}
			} else {
				this.problem(ProblemCode.MissingAttributeValue, `${ErrorMsgForAttribute[recognizedAttr]}: "${firstLexeme}" requires a value to follow`)
			}
		}
		return null; // Seemingly not an attribute or not a valid attribute expression (respective syntax error could have been logged)
	}

	private processParsedSortingAttribute(attr: ParsedSortingAttribute): boolean {
		if (attr.attribute === Attribute.TargetFolder) {
			if (attr.nesting === 0) { // root-level attribute causing creation of new spec or decoration of a previous one
				if (this.ctx.previousValidEntryWasTargetFolderAttr) {
					if (this.ctx.currentSpec) {
						this.ctx.currentSpec.targetFoldersPaths.push(attr.value)
					} else {
						// Should never reach this execution path, yet for sanity and clarity:
						this.ctx.currentSpec = this.putNewSpecForNewTargetFolder(attr.value)
					}
				} else {
					this.ctx.currentSpec = this.putNewSpecForNewTargetFolder(attr.value)
				}
				return true
			} else {
				this.problem(ProblemCode.TargetFolderNestedSpec, `Nested (indented) specification of target folder is not allowed`)
				return false
			}
		} else if (attr.attribute === Attribute.OrderAsc || attr.attribute === Attribute.OrderDesc || attr.attribute === Attribute.OrderUnspecified) {
			if (attr.nesting === 0) {
				if (!this.ctx.currentSpec) {
					this.ctx.currentSpec = this.putNewSpecForNewTargetFolder()
				}
				if (this.ctx.currentSpec.defaultOrder) {
					const folderPathsForProblemMsg: string = this.ctx.currentSpec.targetFoldersPaths.join(' :: ');
					this.problem(ProblemCode.DuplicateOrderAttr, `Duplicate order specification for folder(s) ${folderPathsForProblemMsg}`)
					return false;
				}
				this.ctx.currentSpec.defaultOrder = (attr.value as RecognizedOrderValue).order
				this.ctx.currentSpec.byMetadataField = (attr.value as RecognizedOrderValue).applyToMetadataField
				this.ctx.currentSpec.defaultSecondaryOrder = (attr.value as RecognizedOrderValue).secondaryOrder
				this.ctx.currentSpec.byMetadataFieldSecondary = (attr.value as RecognizedOrderValue).secondaryApplyToMetadataField
				return true;
			} else if (attr.nesting > 0) { // For now only distinguishing nested (indented) and not-nested (not-indented), the depth doesn't matter
				if (!this.ctx.currentSpec || !this.ctx.currentSpecGroup) {
					this.problem(ProblemCode.DanglingOrderAttr, `Nested (indented) attribute requires prior sorting group definition`)
					return false;
				}
				if (this.ctx.currentSpecGroup.order) {
					const folderPathsForProblemMsg: string = this.ctx.currentSpec.targetFoldersPaths.join(' :: ');
					this.problem(ProblemCode.DuplicateOrderAttr, `Duplicate order specification for a sorting rule of folder ${folderPathsForProblemMsg}`)
					return false;
				}
				this.ctx.currentSpecGroup.order = (attr.value as RecognizedOrderValue).order
				this.ctx.currentSpecGroup.byMetadataField = (attr.value as RecognizedOrderValue).applyToMetadataField
				this.ctx.currentSpecGroup.secondaryOrder = (attr.value as RecognizedOrderValue).secondaryOrder
				this.ctx.currentSpecGroup.byMetadataFieldSecondary = (attr.value as RecognizedOrderValue).secondaryApplyToMetadataField
				return true;
			}
		}
		return false;
	}

	private checkForRiskyAttrSyntaxError = (line: string): boolean => {
		const lineTrimmedStart: string = line.trimStart()
		const lineTrimmedStartLowerCase: string = lineTrimmedStart.toLowerCase()
		// no space present, check for potential syntax errors
		for (let attrLexeme of Object.keys(AttrLexemes)) {
			if (lineTrimmedStartLowerCase.startsWith(attrLexeme)) {
				const originalAttrLexeme: string = lineTrimmedStart.substring(0, attrLexeme.length)
				if (lineTrimmedStartLowerCase.length === attrLexeme.length) {
					this.problem(ProblemCode.MissingAttributeValue, `Attribute "${originalAttrLexeme}" requires a value to follow`)
					return true
				} else {
					this.problem(ProblemCode.NoSpaceBetweenAttributeAndValue, `Space required after attribute name "${originalAttrLexeme}"`)
					return true
				}
			}
		}
		return false
	}

	private parseSortingGroupSpec = (line: string): ParsedSortingGroup | null => {
		let s: string = line.trim()

		if (hasMoreThanOneSortingSymbol(s)) {
			this.problem(ProblemCode.TooManySortingSymbols, 'Maximum one sorting symbol allowed per line')
			return null
		}

		if (containsThreeDots(s)) {
			const [prefix, suffix] = s.split(ThreeDots)
			if (containsThreeDots(prefix) && containsThreeDots(suffix)) {
				this.problem(ProblemCode.InlineRegexInPrefixAndSuffix, 'In current version, inline regex symbols are not allowed both in prefix and suffix.')
				return null
			}
		}

		let groupPriority: number | undefined = undefined
		let groupPriorityPrefixesCount: number = 0
		let combineGroup: boolean | undefined = undefined
		let combineGroupPrefixesCount: number = 0
		let groupType: SortingGroupType | undefined = undefined
		let groupTypePrefixesCount: number = 0
		let priorityPrefixAfterGroupTypePrefix: boolean = false
		let combinePrefixAfterGroupTypePrefix: boolean = false

		let prefixRecognized: boolean | undefined = undefined
		while (prefixRecognized === undefined || prefixRecognized) {
			let doContinue: boolean = false // to support 'continue' on external loop from nested loop

			for (const priorityPrefix of Object.keys(SortingGroupPriorityPrefixes)) {
				if (s === priorityPrefix || s.startsWith(priorityPrefix + ' ')) {
					groupPriority = SortingGroupPriorityPrefixes[priorityPrefix]
					groupPriorityPrefixesCount ++
					prefixRecognized = true
					doContinue = true
					if (groupType) {
						priorityPrefixAfterGroupTypePrefix = true
					}
					s = s.substring(priorityPrefix.length).trim()
					break
				}
			}

			if (doContinue) continue

			for (let combinePrefix of CombiningGroupPrefixes) {
				if (s === combinePrefix || s.startsWith(combinePrefix + ' ')) {
					combineGroup = true
					combineGroupPrefixesCount ++
					prefixRecognized = true
					doContinue = true
					if (groupType) {
						combinePrefixAfterGroupTypePrefix = true
					}
					s = s.substring(combinePrefix.length).trim()
					break
				}
			}

			if (doContinue) continue

			for (const sortingGroupTypePrefix of Object.keys(SortingGroupPrefixes)) {
				if (s === sortingGroupTypePrefix || s.startsWith(sortingGroupTypePrefix + ' ')) {
					groupType = SortingGroupPrefixes[sortingGroupTypePrefix]
					groupTypePrefixesCount++
					prefixRecognized = true
					doContinue = true
					s = s.substring(sortingGroupTypePrefix.length).trim()
					break
				}
			}

			if (doContinue) continue

			prefixRecognized = false
		}

		if (groupPriorityPrefixesCount > 1) {
			this.problem(ProblemCode.TooManyPriorityPrefixes, 'Only one priority prefix allowed on sorting group')
			return null
		}

		if (s === '' && groupPriority) {
			this.problem(ProblemCode.PriorityNotAllowedOnOutsidersGroup, 'Priority is not allowed for sorting group with empty match-pattern')
			return null
		}

		if (combineGroupPrefixesCount > 1) {
			this.problem(ProblemCode.TooManyCombinePrefixes, 'Only one combining prefix allowed on sorting group')
			return null
		}

		if (s === '' && combineGroup) {
			this.problem(ProblemCode.CombiningNotAllowedOnOutsidersGroup, 'Combining is not allowed for sorting group with empty match-pattern')
			return null
		}

		if (groupTypePrefixesCount > 1) {
			this.problem(ProblemCode.TooManyGroupTypePrefixes, 'Only one sorting group type prefix allowed on sorting group')
			return null
		}

		if (priorityPrefixAfterGroupTypePrefix) {
			this.problem(ProblemCode.PriorityPrefixAfterGroupTypePrefix, 'Priority prefix must be used before sorting group type indicator')
			return null
		}

		if (combinePrefixAfterGroupTypePrefix) {
			this.problem(ProblemCode.CombinePrefixAfterGroupTypePrefix, 'Combining prefix must be used before sorting group type indicator')
			return null
		}

		if (s === '' && groupType) { // alone alone alone
			if (groupType.itemToHide) {
				this.problem(ProblemCode.ItemToHideExactNameWithExtRequired, 'Exact name with ext of file or folders to hide is required')
				return null
			} else { // !sortingGroupIndicatorPrefixAlone.itemToHide
				return {
					outsidersGroup: true,
					filesOnly: groupType.filesOnly,
					foldersOnly: groupType.foldersOnly
				}
			}
		}

		if (groupType) {
			if (groupType.itemToHide) {
				return {
					itemToHide: true,
					plainSpec: s,
					filesOnly: groupType.filesOnly,
					foldersOnly: groupType.foldersOnly
				}
			} else { // !sortingGroupType.itemToHide
				return {
					plainSpec: s,
					filesOnly: groupType.filesOnly,
					foldersOnly: groupType.foldersOnly,
					matchFilenameWithExt: groupType.filenameWithExt,
					priority: groupPriority ?? undefined,
					combine: combineGroup
				}
			}
		}

		if ((groupPriority || combineGroup) && s !== '' ) {
			// Edge case: line with only priority prefix or combine prefix and no other known syntax, yet some content
			return {
				plainSpec: s,
				priority: groupPriority,
				combine: combineGroup
			}
		}
		return null;
	}

	// Artificial value used to indicate not-undefined value in if (COMBINING_INDICATOR_IDX) { ... }
	COMBINING_INDICATOR_IDX: number = -1

	private processParsedSortGroupSpec(group: ParsedSortingGroup): boolean {
		if (!this.ctx.currentSpec) {
			this.ctx.currentSpec = this.putNewSpecForNewTargetFolder()
		}

		if (group.plainSpec) {
			group.arraySpec = this.convertPlainStringSortingGroupSpecToArraySpec(group.plainSpec)
			delete group.plainSpec
		}

		if (group.itemToHide) {
			if (!this.consumeParsedItemToHide(group)) {
				this.problem(ProblemCode.ItemToHideNoSupportForThreeDots, 'For hiding of file or folder, the exact name with ext is required and no sorting symbols allowed')
				return false
			} else {
				return true
			}
		} else { // !group.itemToHide
			const newGroup: CustomSortGroup | null = this.consumeParsedSortingGroupSpec(group)
			if (newGroup) {
				if (this.adjustSortingGroupForSortingSymbol(newGroup)) {
					if (this.ctx.currentSpec) {
						const groupIdx = this.ctx.currentSpec.groups.push(newGroup) - 1
						this.ctx.currentSpecGroup = newGroup
						// Consume group with priority
						if (group.priority && group.priority > 0) {
							newGroup.priority = group.priority
							this.addExpediteGroupInfo(this.ctx.currentSpec, group.priority, groupIdx)
						}
						// Consume combined group
						if (group.combine) {
							newGroup.combineWithIdx = this.COMBINING_INDICATOR_IDX
						}
						return true;
					} else {
						return false
					}
				} else {
					return false
				}
			} else {
				return false;
			}
		}
	}

	private postprocessSortSpec(spec: CustomSortSpec): boolean {
		// clean up to prevent false warnings in console
		spec.outsidersGroupIdx = undefined
		spec.outsidersFilesGroupIdx = undefined
		spec.outsidersFoldersGroupIdx = undefined
		let outsidersGroupForFolders: boolean | undefined
		let outsidersGroupForFiles: boolean | undefined

		// process all defined sorting groups
		for (let groupIdx = 0; groupIdx < spec.groups.length; groupIdx++) {
			const group: CustomSortGroup = spec.groups[groupIdx];
			if (group.type === CustomSortGroupType.Outsiders) {
				if (group.filesOnly) {
					if (isDefined(spec.outsidersFilesGroupIdx)) {
						console.warn(`Ignoring duplicate Outsiders-files sorting group definition in sort spec for folder '${last(spec.targetFoldersPaths)}'`)
					} else {
						spec.outsidersFilesGroupIdx = groupIdx
						outsidersGroupForFiles = true
					}
				} else if (group.foldersOnly) {
					if (isDefined(spec.outsidersFoldersGroupIdx)) {
						console.warn(`Ignoring duplicate Outsiders-folders sorting group definition in sort spec for folder '${last(spec.targetFoldersPaths)}'`)
					} else {
						spec.outsidersFoldersGroupIdx = groupIdx
						outsidersGroupForFolders = true
					}
				} else {
					if (isDefined(spec.outsidersGroupIdx)) {
						console.warn(`Ignoring duplicate Outsiders sorting group definition in sort spec for folder '${last(spec.targetFoldersPaths)}'`)
					} else {
						spec.outsidersGroupIdx = groupIdx
						outsidersGroupForFolders = true
						outsidersGroupForFiles = true
					}
				}
			}
		}
		if (isDefined(spec.outsidersGroupIdx) && (isDefined(spec.outsidersFilesGroupIdx) || isDefined(spec.outsidersFoldersGroupIdx))) {
			console.warn(`Inconsistent Outsiders sorting group definition in sort spec for folder '${last(spec.targetFoldersPaths)}'`)
		}
		// For consistency and to simplify sorting code later on, implicitly append a single catch-all Outsiders group
		if (!(outsidersGroupForFiles && outsidersGroupForFolders)) {
			spec.outsidersGroupIdx = spec.groups.length
			spec.groups.push({
				type: CustomSortGroupType.Outsiders
			})
		}

		// Process 'combined groups'
		let anyCombinedGroupPresent: boolean = false
		let currentCombinedGroupIdx: number | undefined = undefined
		for (let i=0; i<spec.groups.length; i++) {
			const group: CustomSortGroup = spec.groups[i]
			if (group.combineWithIdx === this.COMBINING_INDICATOR_IDX) { // Here we expect the COMBINING_INDICATOR_IDX artificial value or undefined
				if (currentCombinedGroupIdx === undefined) {
					currentCombinedGroupIdx = i
				} else {
					// Ensure that the preceding group doesn't contain sorting order
					if (spec.groups[i - 1].order) {
						this.problem(ProblemCode.OnlyLastCombinedGroupCanSpecifyOrder, 'Predecessor group of combined group cannot contain order specification. Put it at the last of group in combined groups')
						return false
					}
				}

				group.combineWithIdx = currentCombinedGroupIdx
				anyCombinedGroupPresent = true
			} else {
				currentCombinedGroupIdx = undefined
			}
		}

		// Populate sorting order within combined groups
		if (anyCombinedGroupPresent) {
			let orderForCombinedGroup: CustomSortOrder | undefined
			let byMetadataFieldForCombinedGroup: string | undefined
			let secondaryOrderForCombinedGroup: CustomSortOrder | undefined
			let secondaryByMetadataFieldForCombinedGroup: string | undefined
			let idxOfCurrentCombinedGroup: number | undefined = undefined
			for (let i = spec.groups.length - 1; i >= 0; i--) {
				const group: CustomSortGroup = spec.groups[i]

				if (group.combineWithIdx !== undefined) {
					if (group.combineWithIdx === idxOfCurrentCombinedGroup) { // a subsequent (2nd, 3rd, ...) group of combined (counting from the end)
						group.order = orderForCombinedGroup
						group.byMetadataField = byMetadataFieldForCombinedGroup
						group.secondaryOrder = secondaryOrderForCombinedGroup
						group.byMetadataFieldSecondary = secondaryByMetadataFieldForCombinedGroup
					} else { // the first group of combined (counting from the end)
						idxOfCurrentCombinedGroup = group.combineWithIdx
						orderForCombinedGroup = group.order // could be undefined
						byMetadataFieldForCombinedGroup = group.byMetadataField // could be undefined
						secondaryOrderForCombinedGroup = group.secondaryOrder // could be undefined
						secondaryByMetadataFieldForCombinedGroup = group.byMetadataFieldSecondary // could be undefined
					}
				} else {
					// for sanity
					idxOfCurrentCombinedGroup = undefined
					orderForCombinedGroup = undefined
					byMetadataFieldForCombinedGroup = undefined
					secondaryOrderForCombinedGroup = undefined
					secondaryByMetadataFieldForCombinedGroup = undefined
				}
			}
		}

		// If any priority sorting group was present in the spec, determine the groups evaluation order
		if (spec.priorityOrder) {
			// priorityOrder array already contains at least one priority group, so append all non-priority groups for the final order
			// (Outsiders groups are ignored intentionally)
			for (let idx=0; idx < spec.groups.length; idx++) {
				const group: CustomSortGroup = spec.groups[idx]
				if (group.priority === undefined && group.type !== CustomSortGroupType.Outsiders) {
					spec.priorityOrder.push(idx)
				}
			}
		}

		const CURRENT_FOLDER_PREFIX: string = `${CURRENT_FOLDER_SYMBOL}/`

		// Replace the dot-folder names (coming from: 'target-folder: .') with actual folder names
		spec.targetFoldersPaths.forEach((path, idx) => {
			if (path === CURRENT_FOLDER_SYMBOL) {
				spec.targetFoldersPaths[idx] = this.ctx.folderPath
			} else if (path.startsWith(CURRENT_FOLDER_PREFIX)) {
				spec.targetFoldersPaths[idx] = `${this.ctx.folderPath}/${path.substring(CURRENT_FOLDER_PREFIX.length)}`
			}
		});

		return true // success indicator
	}

	// level 2 parser functions defined in order of occurrence and dependency

	private validateTargetFolderAttrValue: AttrValueValidatorFn = (v: string, attr: Attribute, attrLexeme: string): string | null => {
		if (v) {
			const trimmed: string = v.trim();
			return trimmed || null;
		} else {
			return null;
		}
	}

	private internalValidateOrderAttrValue = (sortOrderSpecText: string, prefixLexeme: string): Array<CustomSortOrderSpec>|AttrError|null => {
		if (sortOrderSpecText.indexOf(CommentPrefix) >= 0) {
			sortOrderSpecText = sortOrderSpecText.substring(0, sortOrderSpecText.indexOf(CommentPrefix))
		}

		const sortLevels: Array<string> = `${prefixLexeme||''} ${sortOrderSpecText}`.trim().split(OrderLevelsSeparator)
		let sortOrderSpec: Array<CustomSortOrderSpec> = []

		// Max two levels are supported, excess levels specs are ignored
		for (let level: number = 0; level <= MAX_SORT_LEVEL && level < sortLevels.length; level++) {
			let orderNameForErrorMsg = level === 0 ? 'Primary' : 'Secondary'
			let orderSpec: string = sortLevels[level].trim()
			let applyToMetadata: boolean = false

			// The direction (asc or desc lexeme) can come before the order literal
			//     and for level 0 it always comes first (otherwise this validator would not be invoked)
			const hasDirectionPrefix: HasOrderAttrLexeme|undefined = startsWithOrderAttrLexeme(orderSpec)
			orderSpec = hasDirectionPrefix ? orderSpec.substring(hasDirectionPrefix.lexeme.length).trim() : orderSpec

			let orderName: HasOrderNameLiteral|undefined = startsWithOrderNameLiteral(orderSpec)
			orderSpec = orderName ? orderSpec.substring(orderName.literal.length).trim() : orderSpec

			// Order direction, for level > 0 can also occur after order name or can be omitted
			const hasDirectionPostfix: HasOrderAttrLexeme|undefined = (orderName) ? startsWithOrderAttrLexeme(orderSpec, true) : undefined
			orderSpec = hasDirectionPostfix ? orderSpec.substring(hasDirectionPostfix.lexeme.length).trim() : orderSpec

			let metadataName: string|undefined
			if (orderSpec.startsWith(OrderByMetadataLexeme)) {
				applyToMetadata = true
				metadataName = orderSpec.substring(OrderByMetadataLexeme.length).trim() || undefined
				orderSpec = '' // metadataName is unparsed, consumes the remainder string, even if malformed, e.g. with infix spaces
			}

			// check for any superfluous text
			const superfluousText = orderSpec.trim()||undefined
			if (superfluousText) {
				return new AttrError(`${orderNameForErrorMsg} sorting order contains unrecognized text: >>> ${superfluousText} <<<`)
			}

			// check consistency of prefix and postfix orders, if both are present
			if (hasDirectionPrefix && hasDirectionPostfix) {
				if (hasDirectionPrefix.attr !== Attribute.OrderUnspecified && hasDirectionPostfix.attr !== Attribute.OrderUnspecified)
					if (hasDirectionPrefix.attr !== hasDirectionPostfix.attr)
					{
						return new AttrError(`${orderNameForErrorMsg} sorting direction ${hasDirectionPrefix.lexeme} and ${hasDirectionPostfix.lexeme} are contradicting`)
					}
			}

			let order: CustomSortOrder|undefined
			if (orderName) {
				const direction: OrderAttribute = hasDirectionPrefix ? hasDirectionPrefix.attr : (
					hasDirectionPostfix ? hasDirectionPostfix.attr : Attribute.OrderAsc
				)
				switch (direction) {
					case Attribute.OrderAsc: order = orderName.order.asc
						break
					case Attribute.OrderDesc: order = orderName.order.desc
						break
					case Attribute.OrderUnspecified:
						if (hasDirectionPostfix) {
							order = hasDirectionPostfix.attr === Attribute.OrderAsc ? orderName.order.asc : orderName.order.desc
						} else {
							order = orderName.order.asc
						}
						break
					default:
						order = undefined
				}

				if (applyToMetadata) {
					if (order) {
						order = OrdersSupportedByMetadata[order]
					}
					if (!order) {
						return new AttrError(`Sorting by metadata requires one of alphabetical orders`)
					}
				}
			} else {
				// order name not specified, this is a general syntax error
				return null
			}
			sortOrderSpec[level] = {
				order: order!,
				byMetadataField: metadataName
			}
		}
		return sortOrderSpec
	}

	private validateOrderAttrValue: AttrValueValidatorFn = (v: string, attr: Attribute, attrLexeme: string): RecognizedOrderValue|AttrError|null => {
		const recognized: Array<CustomSortOrderSpec>|AttrError|null = this.internalValidateOrderAttrValue(v, attrLexeme)
		return recognized ? (recognized instanceof AttrError ? recognized : {
			order: recognized[0].order,
			applyToMetadataField: recognized[0].byMetadataField,
			secondaryOrder: recognized[1]?.order,
			secondaryApplyToMetadataField: recognized[1]?.byMetadataField
		}) : null;
	}

	attrValueValidators: { [key in Attribute]: AttrValueValidatorFn } = {
		[Attribute.TargetFolder]: this.validateTargetFolderAttrValue.bind(this),
		[Attribute.OrderAsc]: this.validateOrderAttrValue.bind(this),
		[Attribute.OrderDesc]: this.validateOrderAttrValue.bind(this),
		[Attribute.OrderUnspecified]: this.validateOrderAttrValue.bind(this)
	}

	convertPlainStringSortingGroupSpecToArraySpec = (spec: string): Array<string> => {
		spec = spec.trim()
		if (isThreeDots(spec)) {
			return [ThreeDots]
		}
		if (spec.startsWith(ThreeDots)) {
			return [ThreeDots, spec.substring(ThreeDotsLength)];
		}
		if (spec.endsWith(ThreeDots)) {
			if (spec.endsWith(AmbigueFourDotsEscaper)) {
				return [spec.substring(0, spec.length - AmbigueFourDotsEscaperLength + AmbigueFourDotsEscaperOverlap), ThreeDots];
			} else {
				return [spec.substring(0, spec.length - ThreeDotsLength), ThreeDots];
			}
		}

		const idx = spec.indexOf(ThreeDots);
		const idxOfAmbigueFourDotsEscaper = spec.indexOf(AmbigueFourDotsEscaper)
		if (idx > 0) {
			if (idxOfAmbigueFourDotsEscaper >= 0 &&
				idxOfAmbigueFourDotsEscaper === idx - (AmbigueFourDotsEscaperLength - ThreeDotsLength) ) {
				return [
					spec.substring(0, idxOfAmbigueFourDotsEscaper + AmbigueFourDotsEscaperOverlap),
					ThreeDots,
					spec.substring(idx + ThreeDotsLength)
				];
			} else {
				return [
					spec.substring(0, idx),
					ThreeDots,
					spec.substring(idx + ThreeDotsLength)
				];
			}
		}

		// Unrecognized, treat as exact match
		return [spec];
	}

	private putNewSpecForNewTargetFolder(folderPath?: string): CustomSortSpec {
		const newSpec: CustomSortSpec = {
			targetFoldersPaths: [folderPath ?? this.ctx.folderPath],
			groups: [],
			implicit: this.ctx.implicitSpec
		}

		this.ctx.specs.push(newSpec);
		this.ctx.currentSpec = undefined;
		this.ctx.currentSpecGroup = undefined;

		return newSpec
	}

	// Detection of slippery syntax errors which can confuse user due to false positive parsing with an unexpected sorting result

	private consumeParsedItemToHide(spec: ParsedSortingGroup): boolean {
		if (spec.arraySpec?.length === 1) {
			const theOnly: string = spec.arraySpec[0]
			if (!isThreeDots(theOnly)) {
				const nameWithExt: string = theOnly.trim()
				if (nameWithExt) { // Sanity check
					if (!detectSortingSymbols(nameWithExt)) {
						if (this.ctx.currentSpec) {
							const itemsToHide: Set<string> = this.ctx.currentSpec?.itemsToHide ?? new Set<string>()
							itemsToHide.add(nameWithExt)
							this.ctx.currentSpec.itemsToHide = itemsToHide
							return true
						}
					}
				}
			}
		}
		return false
	}

	private consumeParsedSortingGroupSpec = (spec: ParsedSortingGroup): CustomSortGroup | null => {
		if (spec.outsidersGroup) {
			return {
				type: CustomSortGroupType.Outsiders,
				filesOnly: spec.filesOnly,
				foldersOnly: spec.foldersOnly,
				matchFilenameWithExt: spec.matchFilenameWithExt  // Doesn't make sense for matching, yet for multi-match
			}               									    // theoretically could match the sorting of matched files
		}

		if (spec.arraySpec?.length === 1) {
			const theOnly: string = spec.arraySpec[0]
			if (isThreeDots(theOnly)) {
				return {
					type: CustomSortGroupType.MatchAll,
					filesOnly: spec.filesOnly,
					foldersOnly: spec.foldersOnly,
					matchFilenameWithExt: spec.matchFilenameWithExt  // Doesn't make sense for matching, yet for multi-match
				}               									    // theoretically could match the sorting of matched files
			} else {
				if (theOnly.startsWith(MetadataFieldIndicatorLexeme)) {
					const metadataFieldName: string | undefined = extractIdentifier(
						theOnly.substring(MetadataFieldIndicatorLexeme.length),
						DEFAULT_METADATA_FIELD_FOR_SORTING
					)
					return {
						type: CustomSortGroupType.HasMetadataField,
						withMetadataFieldName: metadataFieldName,
						filesOnly: spec.filesOnly,
						foldersOnly: spec.foldersOnly,
						matchFilenameWithExt: spec.matchFilenameWithExt
					}
				} else if (theOnly.startsWith(BookmarkedItemIndicatorLexeme)) {
					return {
						type: CustomSortGroupType.BookmarkedOnly,
						filesOnly: spec.filesOnly,
						foldersOnly: spec.foldersOnly,
						matchFilenameWithExt: spec.matchFilenameWithExt
					}
				} else if (theOnly.startsWith(IconIndicatorLexeme)) {
					const iconName: string | undefined = extractIdentifier(theOnly.substring(IconIndicatorLexeme.length))
					return {
						type: CustomSortGroupType.HasIcon,
						iconName: iconName,
						filesOnly: spec.filesOnly,
						foldersOnly: spec.foldersOnly,
						matchFilenameWithExt: spec.matchFilenameWithExt
					}
				} else if (theOnly.startsWith(StarredItemsIndicatorLexeme)) {
					return {
						type: CustomSortGroupType.StarredOnly,
						filesOnly: spec.filesOnly,
						foldersOnly: spec.foldersOnly,
						matchFilenameWithExt: spec.matchFilenameWithExt
					}
				} else {
					// For non-three dots single text line assume exact match group
					return {
						type: CustomSortGroupType.ExactName,
						exactText: theOnly,
						filesOnly: spec.filesOnly,
						foldersOnly: spec.foldersOnly,
						matchFilenameWithExt: spec.matchFilenameWithExt
					}
				}
			}
		}
		if (spec.arraySpec?.length === 2) {
			const theFirst: string = spec.arraySpec[0]
			const theSecond: string = spec.arraySpec[1]
			if (isThreeDots(theFirst) && !isThreeDots(theSecond) && !containsThreeDots(theSecond)) {
				return {
					type: CustomSortGroupType.ExactSuffix,
					exactSuffix: theSecond,
					filesOnly: spec.filesOnly,
					foldersOnly: spec.foldersOnly,
					matchFilenameWithExt: spec.matchFilenameWithExt
				}
			} else if (!isThreeDots(theFirst) && isThreeDots(theSecond) && !containsThreeDots(theFirst)) {
				return {
					type: CustomSortGroupType.ExactPrefix,
					exactPrefix: theFirst,
					filesOnly: spec.filesOnly,
					foldersOnly: spec.foldersOnly,
					matchFilenameWithExt: spec.matchFilenameWithExt
				}
			} else {
				// both are three dots or contain three dots or
				this.problem(ProblemCode.SyntaxErrorInGroupSpec, "three dots occurring more than once and no more text specified")
				return null;
			}
		}
		if (spec.arraySpec?.length === 3) {
			const theFirst: string = spec.arraySpec[0]
			const theMiddle: string = spec.arraySpec[1]
			const theLast: string = spec.arraySpec[2]
			if (isThreeDots(theMiddle)
				&& !isThreeDots(theFirst)
				&& !isThreeDots(theLast)
				&& !containsThreeDots(theLast)) {
				return {
					type: CustomSortGroupType.ExactHeadAndTail,
					exactPrefix: theFirst,
					exactSuffix: theLast,
					filesOnly: spec.filesOnly,
					foldersOnly: spec.foldersOnly,
					matchFilenameWithExt: spec.matchFilenameWithExt
				}
			} else {
				// both are three dots or three dots occurring more times
				this.problem(ProblemCode.SyntaxErrorInGroupSpec, "three dots occurring more than once or unrecognized specification of sorting rule")
				return null;
			}
		}
		this.problem(ProblemCode.SyntaxErrorInGroupSpec, "Unrecognized specification of sorting rule")
		return null;
	}

	// Returns true if no regex will be involved (hence no adjustment) or if correctly adjusted with regex
	private adjustSortingGroupForRegexBasedMatchers = (group: CustomSortGroup): boolean => {
		return this.adjustSortingGroupForSortingSymbol(group)
	}

	// Returns true if no sorting symbol (hence no adjustment) or if correctly adjusted with regex
	private adjustSortingGroupForSortingSymbol = (group: CustomSortGroup): boolean => {
		switch (group.type) {
			case CustomSortGroupType.ExactPrefix:
				const regexInPrefix = convertPlainStringToLeftRegex(group.exactPrefix!)
				if (regexInPrefix) {
					if (regexInPrefix.containsAdvancedRegex && checkAdjacency(regexInPrefix).noSuffix) {
						this.problem(ProblemCode.SortingSymbolAdjacentToWildcard, ADJACENCY_ERROR)
						return false;
					}
					delete group.exactPrefix
					group.regexPrefix = regexInPrefix.regexpSpec
				}
				break;
			case CustomSortGroupType.ExactSuffix:
				const regexInSuffix = convertPlainStringToRightRegex(group.exactSuffix!)
				if (regexInSuffix) {
					if (regexInSuffix.containsAdvancedRegex && checkAdjacency(regexInSuffix).noPrefix) {
						this.problem(ProblemCode.SortingSymbolAdjacentToWildcard, ADJACENCY_ERROR)
						return false;
					}
					delete group.exactSuffix
					group.regexSuffix = regexInSuffix.regexpSpec
				}
				break;
			case CustomSortGroupType.ExactHeadAndTail:
				const regexInHead = convertPlainStringToLeftRegex(group.exactPrefix!)
				if (regexInHead) {
					if (regexInHead.containsAdvancedRegex && checkAdjacency(regexInHead).noSuffix) {
						this.problem(ProblemCode.SortingSymbolAdjacentToWildcard, ADJACENCY_ERROR)
						return false;
					}
					delete group.exactPrefix
					group.regexPrefix = regexInHead.regexpSpec
				}
				const regexInTail = convertPlainStringToRightRegex(group.exactSuffix!)
				if (regexInTail) {
					if (regexInTail.containsAdvancedRegex && checkAdjacency(regexInTail).noPrefix) {
						this.problem(ProblemCode.SortingSymbolAdjacentToWildcard, ADJACENCY_ERROR)
						return false;
					}
					delete group.exactSuffix
					group.regexSuffix = regexInTail.regexpSpec
				}
				break;
			case CustomSortGroupType.ExactName:
				const regexInExactMatch = convertPlainStringToFullMatchRegex(group.exactText!)
				if (regexInExactMatch) {
					delete group.exactText
					group.regexPrefix = regexInExactMatch.regexpSpec
				}
				break;
		}
		return true
	}

	private addExpediteGroupInfo = (spec: CustomSortSpec, groupPriority: number, groupIdx: number) => {
		if (!spec.priorityOrder) {
			spec.priorityOrder = []
		}
		let inserted: boolean = false
		for (let idx=0; idx<spec.priorityOrder.length; idx++) {
			if (groupPriority > spec.groups[spec.priorityOrder[idx]].priority!) {
				spec.priorityOrder.splice(idx, 0, groupIdx)
				inserted = true
				break
			}
		}
		if (!inserted) {
			spec.priorityOrder.push(groupIdx)
		}
	}
}
