import {FolderWildcardMatching} from './folder-matching-rules'

type SortingSpec = string

const createMockMatcherRichVersion = (): FolderWildcardMatching<SortingSpec> => {
	const matcher: FolderWildcardMatching<SortingSpec> = new FolderWildcardMatching()
	let p: string
	p = '/...'; matcher.addWildcardDefinition(p, `00 ${p}`)
	p = '/*'; matcher.addWildcardDefinition(p, `0 ${p}`)
	p = 'Reviews/...'; matcher.addWildcardDefinition(p, `1 ${p}`)
	p = '/Reviews/*'; matcher.addWildcardDefinition(p, `2 ${p}`)
	p = '/Reviews/daily/a/.../'; matcher.addWildcardDefinition(p, `3 ${p}`)
	p = 'Reviews/daily/a/*'; matcher.addWildcardDefinition(p, `4 ${p}`)
	return matcher
}

const createMockMatcherSimplestVersion = (): FolderWildcardMatching<SortingSpec> => {
	const matcher: FolderWildcardMatching<SortingSpec> = new FolderWildcardMatching()
	matcher.addWildcardDefinition('/Reviews/daily/*', '/Reviews/daily/*')
	return matcher
}

const createMockMatcherRootOnlyVersion = (): FolderWildcardMatching<SortingSpec> => {
	const matcher: FolderWildcardMatching<SortingSpec> = new FolderWildcardMatching()
	matcher.addWildcardDefinition('/...', '/...')
	return matcher
}

const createMockMatcherRootOnlyDeepVersion = (): FolderWildcardMatching<SortingSpec> => {
	const matcher: FolderWildcardMatching<SortingSpec> = new FolderWildcardMatching()
	matcher.addWildcardDefinition('/*', '/*')
	return matcher
}

const createMockMatcherSimpleVersion = (): FolderWildcardMatching<SortingSpec> => {
	const matcher: FolderWildcardMatching<SortingSpec> = new FolderWildcardMatching()
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
		const match: SortingSpec = matcher.folderMatch(path)
		const matchFromCache: SortingSpec = matcher.folderMatch(path)
		expect(match).toBe(rule)
		expect(matchFromCache).toBe(rule)
	})
	it('should correctly handle no-root definitions', () => {
		const matcher: FolderWildcardMatching<SortingSpec> = createMockMatcherSimplestVersion()
		const match1: SortingSpec = matcher.folderMatch('/')
		const match2: SortingSpec = matcher.folderMatch('/Reviews')
		const match3: SortingSpec = matcher.folderMatch('/Reviews/daily/')
		const match4: SortingSpec = matcher.folderMatch('/Reviews/daily/Mon')
		const match5: SortingSpec = matcher.folderMatch('/Reviews/daily/Mon')
		expect(match1).toBeNull()
		expect(match2).toBeNull()
		expect(match3).toBe('/Reviews/daily/*')
		expect(match4).toBe('/Reviews/daily/*')
		expect(match5).toBe('/Reviews/daily/*')
	})
	it('should correctly handle root-only definition', () => {
		const matcher: FolderWildcardMatching<SortingSpec> = createMockMatcherRootOnlyVersion()
		const match1: SortingSpec = matcher.folderMatch('/')
		const match2: SortingSpec = matcher.folderMatch('/Reviews')
		const match3: SortingSpec = matcher.folderMatch('/Reviews/daily/')
		expect(match1).toBe('/...')
		expect(match2).toBe('/...')
		expect(match3).toBeNull()
	})
	it('should correctly handle root-only deep definition', () => {
		const matcher: FolderWildcardMatching<SortingSpec> = createMockMatcherRootOnlyDeepVersion()
		const match1: SortingSpec = matcher.folderMatch('/')
		const match2: SortingSpec = matcher.folderMatch('/Reviews')
		const match3: SortingSpec = matcher.folderMatch('/Reviews/daily/')
		expect(match1).toBe('/*')
		expect(match2).toBe('/*')
		expect(match3).toBe('/*')
	})
	it('should correctly handle match all and match children definitions for same path', () => {
		const matcher: FolderWildcardMatching<SortingSpec> = createMockMatcherSimpleVersion()
		const match1: SortingSpec = matcher.folderMatch('/')
		const match2: SortingSpec = matcher.folderMatch('/Reviews/daily/')
		const match3: SortingSpec = matcher.folderMatch('/Reviews/daily/1')
		expect(match1).toBeNull()
		expect(match2).toBe('/Reviews/daily/...')
		expect(match3).toBe('/Reviews/daily/...')
	})
	it('should detect duplicate match children definitions for same path', () => {
		const matcher: FolderWildcardMatching<SortingSpec> = new FolderWildcardMatching()
		matcher.addWildcardDefinition('Archive/2020/...', 'First occurrence')
		const result = matcher.addWildcardDefinition('/Archive/2020/.../', 'Duplicate')

		expect(result).toEqual({errorMsg: "Duplicate wildcard '...' specification for /Archive/2020/.../"})
	})
	it('should detect duplicate match all definitions for same path', () => {
		const matcher: FolderWildcardMatching<SortingSpec> = new FolderWildcardMatching()
		matcher.addWildcardDefinition('/Archive/2019/*', 'First occurrence')
		const result = matcher.addWildcardDefinition('Archive/2019/*', 'Duplicate')

		expect(result).toEqual({errorMsg: "Duplicate wildcard '*' specification for Archive/2019/*"})
	})
})
