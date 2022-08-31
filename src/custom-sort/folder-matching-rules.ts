export interface FolderPattern {
	path: string
	deep: boolean
	nestingLevel: number
}

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

const SLASH: string = '/'
export const MATCH_CHILDREN_PATH_TOKEN: string = '...'
export const MATCH_ALL_PATH_TOKEN: string = '*'
export const MATCH_CHILDREN_1_SUFFIX: string = `/${MATCH_CHILDREN_PATH_TOKEN}`
export const MATCH_CHILDREN_2_SUFFIX: string = `/${MATCH_CHILDREN_PATH_TOKEN}/`
export const MATCH_ALL_SUFFIX: string = `/${MATCH_ALL_PATH_TOKEN}`


export const splitPath = (path: string): Array<string> => {
	return path.split(SLASH).filter((name) => !!name)
}

export interface AddingWildcardFailure {
	errorMsg: string
}

export class FolderWildcardMatching<SortingSpec> {

	tree: FolderMatchingTreeNode<SortingSpec> = {
		subtree: {}
	}

	// cache
	determinedWildcardRules: { [key: string]: DeterminedSortingSpec<SortingSpec> } = {}

	addWildcardDefinition = (wilcardDefinition: string, rule: SortingSpec): AddingWildcardFailure | null => {
		const pathComponents: Array<string> = splitPath(wilcardDefinition)
		const lastComponent: string = pathComponents.pop()
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

	folderMatch = (folderPath: string): SortingSpec | null => {
		const spec: DeterminedSortingSpec<SortingSpec> = this.determinedWildcardRules[folderPath]

		if (spec) {
			return spec.spec ?? null
		} else {
			let rule: SortingSpec = this.tree.matchChildren
			let inheritedRule: SortingSpec = this.tree.matchAll
			const pathComponents: Array<string> = splitPath(folderPath)
			let parentNode: FolderMatchingTreeNode<SortingSpec> = this.tree
			let lastIdx: number = pathComponents.length - 1
			for(let i=0; i<=lastIdx; i++) {
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
