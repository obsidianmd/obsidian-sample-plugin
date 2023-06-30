import {
    CustomSortSpec
} from "./custom-sort-types";

const MACRO_PREFIX: string = '{:'
const MACRO_SUFFIX: string = ':}'

const PARENT_FOLDER_NAME_PLACEHOLDER: string = '%parent-folder-name%'

const PARENT_FOLDER_NAME_MACRO: string = MACRO_PREFIX + PARENT_FOLDER_NAME_PLACEHOLDER + MACRO_SUFFIX

export const expandMacrosInString = function(source: string|undefined, parentFolderName?: string|undefined): string|undefined {
    if (source && parentFolderName) {
        return source.replace(PARENT_FOLDER_NAME_MACRO, parentFolderName)
    } else {
        return source
    }
}

export const expandMacros = function(sortingSpec: CustomSortSpec, parentFolderName: string|undefined) {
    sortingSpec.groupsShadow?.forEach((shadowGroup) => {
        if (parentFolderName) { // root has no parent folder, ignore relevant macros for the root
            if (shadowGroup.exactText) {
                shadowGroup.exactText = expandMacrosInString(shadowGroup.exactText, parentFolderName)
            }
            if (shadowGroup.exactPrefix) {
                shadowGroup.exactPrefix = expandMacrosInString(shadowGroup.exactPrefix, parentFolderName)
            }
            if (shadowGroup.exactSuffix) {
                shadowGroup.exactSuffix = expandMacrosInString(shadowGroup.exactSuffix, parentFolderName)
            }
        }
    })
}
