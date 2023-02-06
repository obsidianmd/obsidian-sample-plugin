import * as regexpp from "regexpp";

export type DeterminedSortingSpec<SortingSpec> = {
	spec?: SortingSpec
}

export interface FolderMatchingTreeNode<SortingSpec> {
	path?: string
	name?: string
	matchChildren?: SortingSpec
	matchAll?: SortingSpec
	subtree: { [key: string]: FolderMatchingTreeNode<SortingSpec> }
}

export interface FolderMatchingRegexp<SortingSpec> {
	regexp: RegExp
	againstName: boolean
	priority: number
	logMatches: boolean
	sortingSpec: SortingSpec
}

const SLASH: string = '/'
export const MATCH_CHILDREN_PATH_TOKEN: string = '...'
export const MATCH_ALL_PATH_TOKEN: string = '*'
export const MATCH_CHILDREN_1_SUFFIX: string = `/${MATCH_CHILDREN_PATH_TOKEN}`
export const MATCH_CHILDREN_2_SUFFIX: string = `/${MATCH_CHILDREN_PATH_TOKEN}/`
export const MATCH_ALL_SUFFIX: string = `/${MATCH_ALL_PATH_TOKEN}`

export const NO_PRIORITY = 0

export const splitPath = (path: string): Array<string> => {
	return path.split(SLASH).filter((name) => !!name)
}

export interface AddingWildcardFailure {
	errorMsg: string
}

export class FolderWildcardMatching<SortingSpec> {

	// mimics the structure of folders, so for example tree.matchAll contains the matchAll flag for the root '/'
	tree: FolderMatchingTreeNode<SortingSpec> = {
		subtree: {}
	}

	regexps: Array<FolderMatchingRegexp<SortingSpec>>

	// cache
	determinedWildcardRules: { [key: string]: DeterminedSortingSpec<SortingSpec> } = {}

	addWildcardDefinition = (wilcardDefinition: string, rule: SortingSpec): AddingWildcardFailure | null | undefined => {
		const pathComponents: Array<string> = splitPath(wilcardDefinition)
		const lastComponent: string | undefined = pathComponents.pop()
		if (lastComponent !== MATCH_ALL_PATH_TOKEN && lastComponent !== MATCH_CHILDREN_PATH_TOKEN) {
			return null
		}
		let leafNode: FolderMatchingTreeNode<SortingSpec> = this.tree
		pathComponents.forEach((pathComponent) => {
			let subtree: FolderMatchingTreeNode<SortingSpec> = leafNode.subtree[pathComponent]
			if (subtree) {
				leafNode = subtree
			} else {
				const newSubtree: FolderMatchingTreeNode<SortingSpec> = {
					name: pathComponent,
					subtree: {}
				}
				leafNode.subtree[pathComponent] = newSubtree
				leafNode = newSubtree
			}
		})
		if (lastComponent === MATCH_CHILDREN_PATH_TOKEN) {
			if (leafNode.matchChildren) {
				return {errorMsg: `Duplicate wildcard '${lastComponent}' specification for ${wilcardDefinition}`}
			} else {
				leafNode.matchChildren = rule
			}
		} else { // Implicitly: MATCH_ALL_PATH_TOKEN
			if (leafNode.matchAll) {
				return {errorMsg: `Duplicate wildcard '${lastComponent}' specification for ${wilcardDefinition}`}
			} else {
				leafNode.matchAll = rule
			}
		}
	}

	addRegexpDefinition = (regexp: RegExp,
						   againstName: boolean,
						   priority: number | undefined,
						   log: boolean | undefined,
						   rule: SortingSpec
	) => {
		const newItem: FolderMatchingRegexp<SortingSpec> = {
			regexp: regexp,
			againstName: againstName,
			priority: priority || NO_PRIORITY,
			sortingSpec: rule,
			logMatches: !!log
		}
		if (this.regexps === undefined || this.regexps.length === 0) {
			this.regexps = [newItem]
		} else {
			// priority is present ==> consciously determine where to insert the regexp
			let idx = 0
			while (idx < this.regexps.length && this.regexps[idx].priority > newItem.priority) {
				idx++
			}
			this.regexps.splice(idx, 0, newItem)
		}
	}

	folderMatch = (folderPath: string, folderName?: string): SortingSpec | null => {
		const spec: DeterminedSortingSpec<SortingSpec> = this.determinedWildcardRules[folderPath]

		if (spec) {
			return spec.spec ?? null
		} else {
			let rule: SortingSpec | null | undefined
			// regexp matching
			if (this.regexps) {
				for (let r of this.regexps) {
					if (r.againstName && !folderName) {
						// exclude the edge case:
						// - root folder which has empty name (and path /)
						// AND name-matching regexp allows zero-length matches
						continue
					}
					if (r.regexp.test(r.againstName ? (folderName || '') : folderPath)) {
						rule = r.sortingSpec
						if (r.logMatches) {
							const msgDetails: string = (r.againstName) ? `name: ${folderName}` : `path: ${folderPath}`
							console.log(`custom-sort plugin - regexp <${r.regexp.source}> matched folder ${msgDetails}`)
						}
						break
					}
				}
			}

			// simple wildards matching
			if (!rule) {
				rule = this.tree.matchChildren
				let inheritedRule: SortingSpec | undefined = this.tree.matchAll
				const pathComponents: Array<string> = splitPath(folderPath)
				let parentNode: FolderMatchingTreeNode<SortingSpec> = this.tree
				let lastIdx: number = pathComponents.length - 1
				for (let i = 0; i <= lastIdx; i++) {
					const name: string = pathComponents[i]
					let matchedPath: FolderMatchingTreeNode<SortingSpec> = parentNode.subtree[name]
					if (matchedPath) {
						parentNode = matchedPath
						rule = matchedPath?.matchChildren ?? null
						inheritedRule = matchedPath.matchAll ?? inheritedRule
					} else {
						if (i < lastIdx) {
							rule = inheritedRule
						}
						break
					}
				}

				rule = rule ?? inheritedRule
			}

			if (rule) {
				this.determinedWildcardRules[folderPath] = {spec: rule}
				return rule
			} else {
				this.determinedWildcardRules[folderPath] = {}
				return null
			}
		}
	}
}
