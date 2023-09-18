import {FolderWildcardMatching} from './folder-matching-rules'

type SortingSpec = string

const checkIfImplicitSpec = (s: SortingSpec) => false
const checkIfImplicitSpecByPrefix = (s: SortingSpec) => s.startsWith('implicit:')

const createMockMatcherRichVersion = (): FolderWildcardMatching<SortingSpec> => {
	const matcher: FolderWildcardMatching<SortingSpec> = new FolderWildcardMatching(checkIfImplicitSpec)
	let p: string
	p = '/...'; matcher.addWildcardDefinition(p, `00 ${p}`)
	p = '/*'; matcher.addWildcardDefinition(p, `0 ${p}`)
	p = 'Reviews/...'; matcher.addWildcardDefinition(p, `1 ${p}`)
	p = '/Reviews/*'; matcher.addWildcardDefinition(p, `2 ${p}`)
	p = '/Reviews/daily/a/.../'; matcher.addWildcardDefinition(p, `3 ${p}`)
	p = 'Reviews/daily/a/*'; matcher.addWildcardDefinition(p, `4 ${p}`)
	return matcher
}

const PRIO1 = 1
const PRIO2 = 2
const PRIO3 = 3

const createMockMatcherSimplestVersion = (): FolderWildcardMatching<SortingSpec> => {
	const matcher: FolderWildcardMatching<SortingSpec> = new FolderWildcardMatching(checkIfImplicitSpec)
	matcher.addWildcardDefinition('/Reviews/daily/*', '/Reviews/daily/*')
	return matcher
}

const createMockMatcherRootOnlyVersion = (): FolderWildcardMatching<SortingSpec> => {
	const matcher: FolderWildcardMatching<SortingSpec> = new FolderWildcardMatching(checkIfImplicitSpec)
	matcher.addWildcardDefinition('/...', '/...')
	return matcher
}

const createMockMatcherRootOnlyDeepVersion = (): FolderWildcardMatching<SortingSpec> => {
	const matcher: FolderWildcardMatching<SortingSpec> = new FolderWildcardMatching(checkIfImplicitSpec)
	matcher.addWildcardDefinition('/*', '/*')
	return matcher
}

const createMockMatcherSimpleVersion = (): FolderWildcardMatching<SortingSpec> => {
	const matcher: FolderWildcardMatching<SortingSpec> = new FolderWildcardMatching(checkIfImplicitSpec)
	matcher.addWildcardDefinition('/Reviews/daily/*', '/Reviews/daily/*')
	matcher.addWildcardDefinition('/Reviews/daily/...', '/Reviews/daily/...')
	return matcher
}

describe('folderMatch', () => {
	it.each([
		['/', '00 /...'],
		['Archive/', '00 /...'],
		['Archive', '00 /...'],
		['/Archive/2019', '0 /*'],
		['Archive/2019/', '0 /*'],
		['Archive/2019/Jan', '0 /*'],
		['/Reviews', '1 Reviews/...'],
		['Reviews/weekly', '1 Reviews/...'],
		['Reviews/weekly/w50/', '2 /Reviews/*'],
		['/Reviews/daily', '2 /Reviews/*'],
		['Reviews/daily/Mon', '2 /Reviews/*'],
		['/Reviews/daily/a/', '3 /Reviews/daily/a/.../'],
		['Reviews/daily/a/Mon', '3 /Reviews/daily/a/.../'],
		['/Reviews/daily/a/Mon/Late', '4 Reviews/daily/a/*'],
		['Reviews/daily/a/Tue/Early/9am', '4 Reviews/daily/a/*']
	])('%s should match %s', (path: string, rule: string) => {
		const matcher: FolderWildcardMatching<SortingSpec> = createMockMatcherRichVersion()
		const match: SortingSpec | null = matcher.folderMatch(path)
		const matchFromCache: SortingSpec | null = matcher.folderMatch(path)
		expect(match).toBe(rule)
		expect(matchFromCache).toBe(rule)
	})
	it('should correctly handle no-root definitions', () => {
		const matcher: FolderWildcardMatching<SortingSpec> = createMockMatcherSimplestVersion()
		const match1: SortingSpec | null = matcher.folderMatch('/')
		const match2: SortingSpec | null = matcher.folderMatch('/Reviews')
		const match3: SortingSpec | null = matcher.folderMatch('/Reviews/daily/')
		const match4: SortingSpec | null = matcher.folderMatch('/Reviews/daily/Mon')
		const match5: SortingSpec | null = matcher.folderMatch('/Reviews/daily/Mon')
		expect(match1).toBeNull()
		expect(match2).toBeNull()
		expect(match3).toBe('/Reviews/daily/*')
		expect(match4).toBe('/Reviews/daily/*')
		expect(match5).toBe('/Reviews/daily/*')
	})
	it('should correctly handle root-only definition', () => {
		const matcher: FolderWildcardMatching<SortingSpec> = createMockMatcherRootOnlyVersion()
		const match1: SortingSpec | null = matcher.folderMatch('/')
		const match2: SortingSpec | null = matcher.folderMatch('/Reviews')
		const match3: SortingSpec | null = matcher.folderMatch('/Reviews/daily/')
		expect(match1).toBe('/...')
		expect(match2).toBe('/...')
		expect(match3).toBeNull()
	})
	it('should correctly handle root-only deep definition', () => {
		const matcher: FolderWildcardMatching<SortingSpec> = createMockMatcherRootOnlyDeepVersion()
		const match1: SortingSpec | null = matcher.folderMatch('/')
		const match2: SortingSpec | null = matcher.folderMatch('/Reviews')
		const match3: SortingSpec | null = matcher.folderMatch('/Reviews/daily/')
		expect(match1).toBe('/*')
		expect(match2).toBe('/*')
		expect(match3).toBe('/*')
	})
	it('should correctly handle match all and match children definitions for same path', () => {
		const matcher: FolderWildcardMatching<SortingSpec> = createMockMatcherSimpleVersion()
		const match1: SortingSpec | null = matcher.folderMatch('/')
		const match2: SortingSpec | null = matcher.folderMatch('/Reviews/daily/')
		const match3: SortingSpec | null = matcher.folderMatch('/Reviews/daily/1')
		expect(match1).toBeNull()
		expect(match2).toBe('/Reviews/daily/...')
		expect(match3).toBe('/Reviews/daily/...')
	})
	it('should detect duplicate match children definitions for same path', () => {
		const matcher: FolderWildcardMatching<SortingSpec> = new FolderWildcardMatching(checkIfImplicitSpec)
		matcher.addWildcardDefinition('Archive/2020/...', 'First occurrence')
		const result = matcher.addWildcardDefinition('/Archive/2020/.../', 'Duplicate')

		expect(result).toEqual({errorMsg: "Duplicate wildcard '...' specification for /Archive/2020/.../"})
	})
	it('should accept duplicate match children definitions for same path, if the former comes from implicit spec', () => {
		const matcher: FolderWildcardMatching<SortingSpec> = new FolderWildcardMatching(checkIfImplicitSpecByPrefix)
		matcher.addWildcardDefinition('Archive/2020/...', 'implicit: First occurrence')
		const result = matcher.addWildcardDefinition('/Archive/2020/.../', 'Duplicate')

		expect(result).toBeUndefined()
	})
	it('should detect duplicate match all definitions for same path', () => {
		const matcher: FolderWildcardMatching<SortingSpec> = new FolderWildcardMatching(checkIfImplicitSpec)
		matcher.addWildcardDefinition('/Archive/2019/*', 'First occurrence')
		const result = matcher.addWildcardDefinition('Archive/2019/*', 'Duplicate')

		expect(result).toEqual({errorMsg: "Duplicate wildcard '*' specification for Archive/2019/*"})
	})
	it('should accept duplicate match all definitions for same path, if the former comes from implicit spec', () => {
		const matcher: FolderWildcardMatching<SortingSpec> = new FolderWildcardMatching(checkIfImplicitSpecByPrefix)
		matcher.addWildcardDefinition('/Archive/2019/*', 'implicit: First occurrence')
		const result = matcher.addWildcardDefinition('Archive/2019/*', 'Duplicate')

		expect(result).toBeUndefined()
	})
	it('regexp-match by name works (order of regexp doesn\'t matter) case A', () => {
		const matcher: FolderWildcardMatching<SortingSpec> = new FolderWildcardMatching(checkIfImplicitSpec)
		matcher.addRegexpDefinition(/^daily$/, false, undefined, false, `r1`)
		matcher.addRegexpDefinition(/^daily$/, true, undefined, false, `r2`)
		matcher.addWildcardDefinition('/Reviews/*', `w1`)
		  // Path with leading /
		const match1: SortingSpec | null = matcher.folderMatch('/Reviews/daily', 'daily')
		  // Path w/o leading / - this is how Obsidian supplies the path
		const match2: SortingSpec | null = matcher.folderMatch('Reviews/daily', 'daily')
		expect(match1).toBe('r2')
		expect(match2).toBe('r2')
	})
	it('regexp-match by name works (order of regexp doesn\'t matter) reversed case A', () => {
		const matcher: FolderWildcardMatching<SortingSpec> = new FolderWildcardMatching(checkIfImplicitSpec)
		matcher.addRegexpDefinition(/^daily$/, true, undefined, false, `r2`)
		matcher.addRegexpDefinition(/^daily$/, false, undefined, false, `r1`)
		matcher.addWildcardDefinition('/Reviews/*', `w1`)
		  // Path with leading /
		const match1: SortingSpec | null = matcher.folderMatch('/Reviews/daily', 'daily')
		  // Path w/o leading / - this is how Obsidian supplies the path
		const match2: SortingSpec | null = matcher.folderMatch('Reviews/daily', 'daily')
		expect(match1).toBe('r2')
		expect(match2).toBe('r2')
	})
	it('regexp-match by path works (order of regexp doesn\'t matter) case A', () => {
		const matcher: FolderWildcardMatching<SortingSpec> = new FolderWildcardMatching(checkIfImplicitSpec)
		matcher.addRegexpDefinition(/^Reviews\/daily$/, false, undefined, false, `r1`)
		matcher.addRegexpDefinition(/^Reviews\/daily$/, true, undefined, false, `r2`)
		matcher.addWildcardDefinition('/Reviews/*', `w1`)
		  // Path with leading /
		const match1: SortingSpec | null = matcher.folderMatch('/Reviews/daily', 'daily')
		  // Path w/o leading / - this is how Obsidian supplies the path
		const match2: SortingSpec | null = matcher.folderMatch('Reviews/daily', 'daily')
		expect(match1).toBe('w1')  // The path-based regexp doesn't match the leading /
		expect(match2).toBe('r1')
	})
	it('regexp-match by path works (order of regexp doesn\'t matter) reversed case A', () => {
		const matcher: FolderWildcardMatching<SortingSpec> = new FolderWildcardMatching(checkIfImplicitSpec)
		matcher.addRegexpDefinition(/^Reviews\/daily$/, true, undefined, false, `r2`)
		matcher.addRegexpDefinition(/^Reviews\/daily$/, false, undefined, false, `r1`)
		matcher.addWildcardDefinition('/Reviews/*', `w1`)
		// Path with leading /
		const match1: SortingSpec | null = matcher.folderMatch('/Reviews/daily', 'daily')
		// Path w/o leading / - this is how Obsidian supplies the path
		const match2: SortingSpec | null = matcher.folderMatch('Reviews/daily', 'daily')
		expect(match1).toBe('w1')  // The path-based regexp doesn't match the leading /
		expect(match2).toBe('r1')
	})
	it('regexp-match by path and name for root level - order of regexp decides - case A', () => {
		const matcher: FolderWildcardMatching<SortingSpec> = new FolderWildcardMatching(checkIfImplicitSpec)
		matcher.addRegexpDefinition(/^daily$/, false, undefined, false, `r1`)
		matcher.addRegexpDefinition(/^daily$/, true, undefined, false, `r2`)
		matcher.addWildcardDefinition('/Reviews/*', `w1`)
		// Path w/o leading / - this is how Obsidian supplies the path
		const match: SortingSpec | null = matcher.folderMatch('daily', 'daily')
		expect(match).toBe('r2')
	})
	it('regexp-match by path and name for root level - order of regexp decides - reversed case A', () => {
		const matcher: FolderWildcardMatching<SortingSpec> = new FolderWildcardMatching(checkIfImplicitSpec)
		matcher.addRegexpDefinition(/^daily$/, true, undefined, false, `r2`)
		matcher.addRegexpDefinition(/^daily$/, false, undefined, false, `r1`)
		matcher.addWildcardDefinition('/Reviews/*', `w1`)
		// Path w/o leading / - this is how Obsidian supplies the path
		const match: SortingSpec | null = matcher.folderMatch('daily', 'daily')
		expect(match).toBe('r1')
	})
	it('regexp-match priorities - order of definitions irrelevant - unique priorities - case A', () => {
		const matcher: FolderWildcardMatching<SortingSpec> = new FolderWildcardMatching(checkIfImplicitSpec)
		matcher.addRegexpDefinition(/^freq\/daily$/, false, 3, false, `r1p3`)
		matcher.addRegexpDefinition(/^freq\/daily$/, false, 2, false, `r2p2`)
		matcher.addRegexpDefinition(/^freq\/daily$/, false, 1, false, `r3p1`)
		matcher.addRegexpDefinition(/^freq\/daily$/, false, undefined, false, `r4pNone`)
		// Path w/o leading / - this is how Obsidian supplies the path
		const match: SortingSpec | null = matcher.folderMatch('freq/daily', 'daily')
		expect(match).toBe('r1p3')
	})
	it('regexp-match priorities - order of definitions irrelevant - unique priorities - reversed case A', () => {
		const matcher: FolderWildcardMatching<SortingSpec> = new FolderWildcardMatching(checkIfImplicitSpec)
		matcher.addRegexpDefinition(/^freq\/daily$/, false, undefined, false, `r4pNone`)
		matcher.addRegexpDefinition(/^freq\/daily$/, false, 1, false, `r3p1`)
		matcher.addRegexpDefinition(/^freq\/daily$/, false, 2, false, `r2p2`)
		matcher.addRegexpDefinition(/^freq\/daily$/, false, 3, false, `r1p3`)
		// Path w/o leading / - this is how Obsidian supplies the path
		const match: SortingSpec | null = matcher.folderMatch('freq/daily', 'daily')
		expect(match).toBe('r1p3')
	})
	it('regexp-match priorities - order of definitions irrelevant - duplicate priorities - case A', () => {
		const matcher: FolderWildcardMatching<SortingSpec> = new FolderWildcardMatching(checkIfImplicitSpec)
		matcher.addRegexpDefinition(/^daily$/, true, 3, false, `r1p3a`)
		matcher.addRegexpDefinition(/^daily$/, true, 3, false, `r1p3b`)
		matcher.addRegexpDefinition(/^daily$/, true, 2, false, `r2p2a`)
		matcher.addRegexpDefinition(/^daily$/, true, 2, false, `r2p2b`)
		matcher.addRegexpDefinition(/^daily$/, true, 1, false, `r3p1a`)
		matcher.addRegexpDefinition(/^daily$/, true, 1, false, `r3p1b`)
		matcher.addRegexpDefinition(/^daily$/, true, undefined, false, `r4pNone`)
		// Path w/o leading / - this is how Obsidian supplies the path
		const match: SortingSpec | null = matcher.folderMatch('daily', 'daily')
		expect(match).toBe('r1p3b')
	})
	it('regexp-match priorities - order of definitions irrelevant - unique priorities - reversed case A', () => {
		const matcher: FolderWildcardMatching<SortingSpec> = new FolderWildcardMatching(checkIfImplicitSpec)
		matcher.addRegexpDefinition(/^freq\/daily$/, false, undefined, false, `r4pNone`)
		matcher.addRegexpDefinition(/^freq\/daily$/, false, 1, false, `r3p1`)
		matcher.addRegexpDefinition(/^freq\/daily$/, false, 2, false, `r2p2`)
		matcher.addRegexpDefinition(/^freq\/daily$/, false, 3, false, `r1p3`)
		// Path w/o leading / - this is how Obsidian supplies the path
		const match: SortingSpec | null = matcher.folderMatch('freq/daily', 'daily')
		expect(match).toBe('r1p3')
	})
	it('regexp-match - edge case of matching the root folder - match by path', () => {
		const matcher: FolderWildcardMatching<SortingSpec> = new FolderWildcardMatching(checkIfImplicitSpec)
		matcher.addRegexpDefinition(/^\/$/, false, undefined, false, `r1`)
		// Path w/o leading / - this is how Obsidian supplies the path
		const match: SortingSpec | null = matcher.folderMatch('/', '')
		expect(match).toBe('r1')
	})
	it('regexp-match - edge case of matching the root folder - match by name not possible', () => {
		const matcher: FolderWildcardMatching<SortingSpec> = new FolderWildcardMatching(checkIfImplicitSpec)
		  // Tricky regexp which can return zero length matches
		matcher.addRegexpDefinition(/.*/, true, undefined, false, `r1`)
		matcher.addWildcardDefinition('/*', `w1`)
		// Path w/o leading / - this is how Obsidian supplies the path
		const match: SortingSpec | null = matcher.folderMatch('/', '')
		expect(match).toBe('w1')
	})
	it('regexp-match - edge case of no match when only regexp rules present', () => {
		const matcher: FolderWildcardMatching<SortingSpec> = new FolderWildcardMatching(checkIfImplicitSpec)
		// Tricky regexp which can return zero length matches
		matcher.addRegexpDefinition(/abc/, true, undefined, false, `r1`)
		// Path w/o leading / - this is how Obsidian supplies the path
		const match: SortingSpec | null = matcher.folderMatch('/', '')
		expect(match).toBeNull()
	})
})
