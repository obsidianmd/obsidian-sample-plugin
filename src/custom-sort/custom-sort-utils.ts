import {CustomSortGroupType, CustomSortOrder, CustomSortSpec} from "./custom-sort-types";

// Put here to allow unit tests coverage of this specific implicit sorting spec
export const ImplicitSortspecForBookmarksIntegration: string = `
target-folder: /*
bookmarked:
  < by-bookmarks-order
sorting: standard
`

export interface HasSortingTypes {
    byBookmarks: number
    standardObsidian: number
    total: number
}

export interface HasGroupingTypes {
    byBookmarks: number
    byIcon: number
    total: number
}

export interface HasSortingOrGrouping {
    sorting: HasSortingTypes
    grouping: HasGroupingTypes
}

export const checkByBookmark = (has: HasSortingOrGrouping, order?: CustomSortOrder, groupType?: CustomSortGroupType ) => {
    groupType === CustomSortGroupType.BookmarkedOnly && has.grouping.byBookmarks++;
    (order === CustomSortOrder.byBookmarkOrder || order === CustomSortOrder.byBookmarkOrderReverse) && has.sorting.byBookmarks++;
}

export const checkByIcon = (has: HasSortingOrGrouping, order?: CustomSortOrder, groupType?: CustomSortGroupType ) => {
    groupType === CustomSortGroupType.HasIcon && has.grouping.byIcon++;
}

export const checkStandardObsidian = (has: HasSortingOrGrouping, order?: CustomSortOrder, groupType?: CustomSortGroupType ) => {
    order === CustomSortOrder.standardObsidian && has.sorting.standardObsidian++;
}

export const doCheck = (has: HasSortingOrGrouping, order?: CustomSortOrder, groupType?: CustomSortGroupType) => {
    checkByBookmark(has, order, groupType)
    checkByIcon(has, order, groupType)
    checkStandardObsidian(has, order, groupType)

    order !== undefined && has.sorting.total++
    groupType !== undefined && groupType !== CustomSortGroupType.Outsiders && has.grouping.total++;
}

export const collectSortingAndGroupingTypes = (sortSpec?: CustomSortSpec|null): HasSortingOrGrouping => {
    const has: HasSortingOrGrouping = {
        grouping: {
            byIcon: 0, byBookmarks: 0, total: 0
        },
        sorting: {
            byBookmarks: 0, standardObsidian: 0, total: 0
        }
    }
    if (!sortSpec) return has
    doCheck(has, sortSpec.defaultSorting?.order)
    doCheck(has, sortSpec.defaultSecondarySorting?.order)
    if (sortSpec.groups) {
        for (let group of sortSpec.groups) {
            doCheck(has, group.sorting?.order, group.type)
            doCheck(has, group.secondarySorting?.order)
        }
    }
    return has
}

export const hasOnlyByBookmarkOrStandardObsidian = (has: HasSortingOrGrouping): boolean => {
    return has.sorting.total === has.sorting.standardObsidian + has.sorting.byBookmarks &&
        has.grouping.total === has.grouping.byBookmarks
}
