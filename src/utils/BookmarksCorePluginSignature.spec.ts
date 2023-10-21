import {
    _unitTests,
    BookmarkedParentFolder,
    OrderedBookmarks
} from "./BookmarksCorePluginSignature";
import {extractParentFolderPath} from "./utils";

type Bookmarks_PluginInstance = any

const getEmptyBookmarksMock = (): Bookmarks_PluginInstance => ({} as Bookmarks_PluginInstance)

const getNullBookmarksMock = (): Bookmarks_PluginInstance => ({
        items: null
    } as unknown as Bookmarks_PluginInstance)

const getBookmarksMock = (items: any): Bookmarks_PluginInstance => ({
    items: items
} as Bookmarks_PluginInstance)

const getBrokenBookmarksMock1 = (): Bookmarks_PluginInstance => ({
    items: 123
} as Bookmarks_PluginInstance)

const getBrokenBookmarksMock2 = (): Bookmarks_PluginInstance => ({
    items: () => { return [] }
} as Bookmarks_PluginInstance)

const derivePath = (previousPath: string|undefined, path: string): string => {
    const match = path?.match(/(^\s+\/)/)
    if (match && previousPath) {
        const lengthToTake = match[1].length
        let derivedPart = previousPath.substring(0, lengthToTake)
        derivedPart = derivedPart.endsWith('/') ? derivedPart : `${derivedPart}/`
        const newPathSuffix = path.substring(lengthToTake)
        return `${derivedPart}${newPathSuffix}`
    } else {
        return path
    }
}

interface PathAndOrder {
    path: string
    order: number
}

class bkCacheMock {
    entries: Array<PathAndOrder> = []
    coveredPaths: {[key: string]: boolean} = {}

    getCache() {
        const cache: OrderedBookmarks = {}
        this.entries.forEach((it) => {
            cache[it.path] = it.order
        })
        return cache
    }
    getPathsCoverage() {
        return this.coveredPaths
    }
    getExpected() {
        return [this.getCache(), this.getPathsCoverage()]
    }
    add(path: string, order: number): bkCacheMock {
        path = derivePath(this.entries.slice(-1)?.[0]?.path, path)
        this.entries.push({
            path: path,
            order: order
        })
        this.coveredPaths[extractParentFolderPath(path) || '/'] = true
        return this
    }
}

const attachRemoveFunction = (arr: Array<any>): Array<any> => {
    arr.remove = (itemToRemove: any) => {
        if (itemToRemove) {
            let index
            do {
                index = arr?.findIndex((it) => it === itemToRemove)
                if (index !== -1) {
                    arr?.splice(index, 1)
                }
            } while (index !== -1)
        }
    }
    return arr
}

const consumeBkMock = (tree: any): Array<any> => {
    const bkmrks: Array<any> = attachRemoveFunction([])
    const pathOf = (s: string) => {
        const match = s.match(/^\d+:(.+)$/)
        return match ? match[1] : s
    }
    const typeOf = (s: string) => {
        const match = s.match(/(file|folder)/)
        return match ? match[1] : 'unknown'
    }
    const hasIndicator = (s: string) => {
        return s.endsWith('^')
    }
    const consumeLevel = (entries: any, container?: Array<any>) => {
        Object.keys(entries).forEach((entryKey) => {
            container = container ?? attachRemoveFunction([])
            const value = entries[entryKey]
            if ('string' === typeof value) { // file or folder
                const path = pathOf(entryKey)
                container.push({
                    type: typeOf(value),
                    path: pathOf(entryKey),
                    subpath: hasIndicator(value) ? '#^-' : undefined
                })
            } else { // group
                container.push({
                    type: 'group',
                    items: consumeLevel(value),
                    title: entryKey
                })
            }
        })
        return container || attachRemoveFunction([])
    }
    consumeLevel(tree, bkmrks)
    return bkmrks
}

describe('getOrderedBookmarks - basic scenarios', () => {
    it('should correctly handle no bookmarks plugin scenario', () => {
        const result = _unitTests.getOrderedBookmarks(null!)
        expect(result).toEqual([undefined, undefined])
    })
    it('should correctly handle no bookmarks scenario', () => {
        const result = _unitTests.getOrderedBookmarks(getEmptyBookmarksMock())
        expect(result).toEqual([undefined, undefined])
    })
    it('should correctly handle edge case of the bookmarks plugin responding with null', () => {
        const result = _unitTests.getOrderedBookmarks(getNullBookmarksMock())
        expect(result).toEqual([undefined, undefined])
    })
    it('should correctly handle bookmarks plugin responding with empty collection', () => {
        const items: [] = []
        const result = _unitTests.getOrderedBookmarks(getBookmarksMock(items))
        expect(result).toEqual([{}, {}])
    })
    it('should correctly handle basic scenario - one bookmarked item at root level - file', () => {
        const items: Array<any> = consumeBkMock({'some note.md': 'file'})
        const expected = new bkCacheMock()
            .add('some note.md', 1)
            .getExpected()
        const result = _unitTests.getOrderedBookmarks(getBookmarksMock(items))
        expect(result).toEqual(expected)
    })
    it('should correctly handle basic scenario - one bookmarked item at root level - file with subpath', () => {
        const items: Array<any> = consumeBkMock({'some note.md': 'file^'})
        const expected = new bkCacheMock()
            .add('some note.md', 1)
            .getExpected()
        const result = _unitTests.getOrderedBookmarks(getBookmarksMock(items))
        expect(result).toEqual(expected)
    })
    it('should correctly handle basic scenario - one bookmarked item at root level - folder', () => {
        const items: Array<any> = consumeBkMock({'some folder': 'folder'})
        const expected = new bkCacheMock()
            .add('some folder', 1)
            .getExpected()
        const result = _unitTests.getOrderedBookmarks(getBookmarksMock(items))
        expect(result).toEqual(expected)
    })
    it('should correctly handle basic scenario - one bookmarked item at root level - group', () => {
        const items: Array<any> = consumeBkMock({'sortspec': {}})
        const expected = new bkCacheMock()
            .add('sortspec', 1)
            .getExpected()
        const result = _unitTests.getOrderedBookmarks(getBookmarksMock(items))
        expect(result).toEqual(expected)
    })
    it('should correctly handle basic scenario - only the group with expected name - the container', () => {
        const items: Array<any> = consumeBkMock({'sortspec': {}})
        const result = _unitTests.getOrderedBookmarks(getBookmarksMock(items), 'sortspec')
        expect(result).toEqual([{}, {}])
    })
    it('should correctly handle basic scenario - one bookmarked item in the group of expected name', () => {
        const items: [] = []
        const result = _unitTests.getOrderedBookmarks(getBookmarksMock(items))
        expect(result).toEqual([{}, {}])
    })
})

describe('getOrderedBookmarks edge cases', () => {
    it('should correctly handle bookmarks plugin not returning collection (a number)', () => {
        const result = _unitTests.getOrderedBookmarks(getBrokenBookmarksMock1())
        expect(result).toEqual([undefined, undefined])
    })
    it('should correctly handle bookmarks plugin not returning collection (a function)', () => {
        const result = _unitTests.getOrderedBookmarks(getBrokenBookmarksMock1())
        expect(result).toEqual([undefined, undefined])
    })
    it('edge case - group vs group', () => {
        const items = consumeBkMock({
            "sortspec": {
                "\\\\folder l1": {}, // order 1
                "folder l1": {}
            }
        })

        const expected = new bkCacheMock()
            .add("folder l1", 1)
            .getExpected()
        const result = _unitTests.getOrderedBookmarks(getBookmarksMock(items), DEFAULT_BKMRK_FOLDER)
        expect(result).toEqual(expected)
    })
    it('edge case - folder vs group', () => {
        const items = consumeBkMock({
            "sortspec": {
                "1:folder l1": "folder", // order 1
                "folder l1": {} // order 2
            }
        })

        const expected = new bkCacheMock()
            .add("folder l1", 2)
            .getExpected()
        const result = _unitTests.getOrderedBookmarks(getBookmarksMock(items), DEFAULT_BKMRK_FOLDER)
        expect(result).toEqual(expected)
    })
    it('edge case - file w/ and w/o indicator vs group - group overwrites w/o indicator, regardless of matching (or not) path of file', () => {
        const items = consumeBkMock({
            "sortspec": {
                "1:artificial": "file", // order 1
                "artificial": {}, // order 2
                "subf": { // order 3
                    "subf/item in subf": "file", // order 4
                    "item in subf": {} // order 5
                }
            }
        })

        const expected = new bkCacheMock()
            .add("artificial", 2)
            .add("subf", 3)
            .add("    /item in subf", 5)
            .getExpected()
        const result = _unitTests.getOrderedBookmarks(getBookmarksMock(items), DEFAULT_BKMRK_FOLDER)
        expect(result).toEqual(expected)
    })
    it('edge case - file w/ and w/o indicator vs group - group is not overwritten by w/o indicator', () => {
        const items = consumeBkMock({
            "sortspec": {
                "artificial": {}, // order 1
                "1:artificial": "file",
                "\\\\subf": {
                    "item in subf": {}, // order 2
                    "subf/item in subf": "file",
                }
            }
        })

        const expected = new bkCacheMock()
            .add("artificial", 1)
            .add("subf/item in subf", 2)
            .getExpected()
        const result = _unitTests.getOrderedBookmarks(getBookmarksMock(items), DEFAULT_BKMRK_FOLDER)
        expect(result).toEqual(expected)
    })
    it('edge case - file w/ and w/o indicator vs group - group doesn`t overwrite w/ indicator', () => {
        const items = consumeBkMock({
            "sortspec": {
                "1:artificial": "file", // order 1
                "2:artificial": "file^", // order 2
                "artificial": {} // order 3
            }
        })

        const expected = new bkCacheMock()
            .add("artificial", 2)
            .getExpected()
        const result = _unitTests.getOrderedBookmarks(getBookmarksMock(items), DEFAULT_BKMRK_FOLDER)
        expect(result).toEqual(expected)
    })
    it('edge case - file w/ and w/o indicator vs group - w/ indicator overwrites group', () => {
        const items = consumeBkMock({
            "sortspec": {
                "1:artificial": "file", // order 1
                "artificial": {}, // order 2
                "2:artificial": "file^", // order 3
            }
        })

        const expected = new bkCacheMock()
            .add("artificial", 3)
            .getExpected()
        const result = _unitTests.getOrderedBookmarks(getBookmarksMock(items), DEFAULT_BKMRK_FOLDER)
        expect(result).toEqual(expected)
    })
    it('edge case - folder is treated as a file w/o indicator - scenario 1', () => {
        const items = consumeBkMock({
            "sortspec": {
                "\\\\group": {
                    "1:group/artificial": "folder", // order 1
                    "2:group/artificial": "file", // order 2
                }
            }
        })

        const expected = new bkCacheMock()
            .add("group/artificial", 1)
            .getExpected()
        const result = _unitTests.getOrderedBookmarks(getBookmarksMock(items), DEFAULT_BKMRK_FOLDER)
        expect(result).toEqual(expected)
    })
    it('edge case - folder is treated as a file w/o indicator - scenario 2', () => {
        const items = consumeBkMock({
            "sortspec": {
                "\\\\group": {
                    "1:group/artificial": "folder", // order 1
                    "2:group/artificial": "file^", // order 2
                }
            }
        })

        const expected = new bkCacheMock()
            .add("group/artificial", 2)
            .getExpected()
        const result = _unitTests.getOrderedBookmarks(getBookmarksMock(items), DEFAULT_BKMRK_FOLDER)
        expect(result).toEqual(expected)
    })
})

const DEFAULT_BKMRK_FOLDER = 'sortspec'

describe('getOrderedBookmarks', () => {
    describe('files', () => {
        it('case 1 - both w/ indicator and not matching path. Ignore the latter.', () => {
            const items = consumeBkMock({
                "sortspec": {
                    "folder l1/not relevant for test.md": "file^", // order 1
                    "1:folder l1/folder l2/file 1 at level 2.md": "file^", // order 2
                    "2:folder l1/folder l2/file 1 at level 2.md": "file^"  // order 3 -> reject, a duplicate
                }
            })
            const expected = new bkCacheMock()
                .add('folder l1/not relevant for test.md', 1)
                .add('         /folder l2/file 1 at level 2.md', 2)
                .getExpected()
            const result = _unitTests.getOrderedBookmarks(getBookmarksMock(items), DEFAULT_BKMRK_FOLDER)
            expect(result).toEqual(expected)
        })
        it('case 2 - both w/ indicator, matching path wins.', () => {
            const items = consumeBkMock({
                "sortspec": {
                    "\\\\folder l1": {
                        "folder l1/folder l2/file 1 at level 2.md": "file^",   // ignore => invalid location
                        "\\\\folder l2": {
                            "folder l1/folder l2/not relevant for test.md": "file^", // order 1
                            "\\\\folder l3": {
                                "folder l1/folder l2/folder l3/file 1 at level 3.md": "file^", // order 2, to be taken -> location match
                            },
                            "1:folder l1/folder l2/folder l3/file 1 at level 3.md": "file^",
                            "2:folder l1/folder l2/folder l3/file 1 at level 3.md": "folder",
                        }
                    },
                    "folder l1/folder l2/folder l3/file 1 at level 3.md": "file^", // reject => already found in correct location
                }
            })

            const expected = new bkCacheMock()
                .add('folder l1/folder l2/not relevant for test.md', 1)
                .add("                   /folder l3/file 1 at level 3.md", 2)
                .getExpected()
            const result = _unitTests.getOrderedBookmarks(getBookmarksMock(items), DEFAULT_BKMRK_FOLDER)
            expect(result).toEqual(expected)
        })
        it('case 3 - w/ indicator wins', () => {
            const items = consumeBkMock({
                "sortspec": {
                    "folder l1/folder l2/folder l3/file 1 at level 3.md": "file", // order 1 -> overwritten by w/ indicator
                    "folder l1/folder l2/not relevant for test.md": "file^", // order 2
                    "1:folder l1/folder l2/folder l3/file 1 at level 3.md": "file^", // order 3 -> taken, overwrites item w/o indicator
                }
            })

            const expected = new bkCacheMock()
                .add('folder l1/folder l2/not relevant for test.md', 2)
                .add("                   /folder l3/file 1 at level 3.md", 3)
                .getExpected()
            const result = _unitTests.getOrderedBookmarks(getBookmarksMock(items), DEFAULT_BKMRK_FOLDER)
            expect(result).toEqual(expected)
        })
        it('case 4 - w/ indicator wins', () => {
            const items = consumeBkMock({
                "sortspec": {
                    "folder l1/folder l2/not relevant for test.md": "file^", // order 1
                    "folder l1": { // order 2
                        "\\\\folder l2": {
                            "\\\\folder l3": {
                                "folder l1/folder l2/folder l3/file 1 at level 3.md": "file", // order 3 -> overwritten by w/ indicator
                            }
                        }
                    },
                    "folder l1/folder l2/folder l3/file 1 at level 3.md": "file^", // order 4 -> taken, overwrites item w/o indicator
                }
            })

            const expected = new bkCacheMock()
                .add("folder l1", 2)
                .add("folder l1/folder l2/not relevant for test.md", 1)
                .add("                   /folder l3/file 1 at level 3.md", 4)
                .getExpected()
            const result = _unitTests.getOrderedBookmarks(getBookmarksMock(items), DEFAULT_BKMRK_FOLDER)
            expect(result).toEqual(expected)
        })
        it('case 5 - both w/ indicator, matching path wins', () => {
            const items = consumeBkMock({
                "sortspec": {
                    "folder l1/folder l2/not relevant for test.md": "file^", // order 1
                    "folder l1/folder l2/folder l3/file 1 at level 3.md": "file^", // order 2 -> overwritten by matching path
                    "\\\\folder l1": {
                        "folder l2": { // order 3
                            "\\\\folder l3": {
                                "folder l1/folder l2/folder l3/file 1 at level 3.md": "file^", // order 4 -> overwrites item at root path
                            }
                        }
                    },
                }
            })

            const expected = new bkCacheMock()
                .add("folder l1/folder l2", 3)
                .add("folder l1/folder l2/not relevant for test.md", 1)
                .add("                   /folder l3/file 1 at level 3.md", 4)
                .getExpected()
            const result = _unitTests.getOrderedBookmarks(getBookmarksMock(items), DEFAULT_BKMRK_FOLDER)
            expect(result).toEqual(expected)
        })
        it('case 6 - both w/ indicator and matching path. Ignore the latter', () => {
            const items = consumeBkMock({
                "sortspec": {
                    "\\\\folder l1": {
                        "folder l2": { // order 1
                            "\\\\folder l3": {
                                "1:folder l1/folder l2/folder l3/file 1 at level 3.md": "file^", // order 2 -> taken
                                "2:folder l1/folder l2/folder l3/file 1 at level 3.md": "file^", // rejected as duplicate
                            },
                            "folder l1/folder l2/not relevant for test.md": "file", // order 3
                        }
                    },
                }
            })

            const expected = new bkCacheMock()
                .add("folder l1/folder l2", 1)
                .add("folder l1/folder l2/not relevant for test.md", 3)
                .add("                   /folder l3/file 1 at level 3.md", 2)
                .getExpected()
            const result = _unitTests.getOrderedBookmarks(getBookmarksMock(items), DEFAULT_BKMRK_FOLDER)
            expect(result).toEqual(expected)
        })
        it('case 7 - w/ indicator wins', () => {
            const items = consumeBkMock({
                "sortspec": {
                    "folder l1/folder l2/folder l3/file 1 at level 3.md": "file", // order 1 -> overwritten by w/ indicator
                    "folder l1": { // order 2
                        "\\\\folder l2": {
                            "folder l3": { // order 3
                                "1:folder l1/folder l2/folder l3/file 1 at level 3.md": "file^", // order 4 -> taken, overwrites w/o indicator
                            },
                            "folder l1/folder l2/not relevant for test.md": "file", // order 5
                        }
                    },
                }
            })

            const expected = new bkCacheMock()
                .add("folder l1", 2)
                .add("folder l1/folder l2/folder l3", 3)
                .add("folder l1/folder l2/not relevant for test.md", 5)
                .add("                   /folder l3/file 1 at level 3.md", 4)
                .getExpected()
            const result = _unitTests.getOrderedBookmarks(getBookmarksMock(items), DEFAULT_BKMRK_FOLDER)
            expect(result).toEqual(expected)
        })
        it('case 8 - w/ indicator wins', () => {
            const items = consumeBkMock({
                "sortspec": {
                    "folder l1": { // order 1
                        "\\\\folder l2": {
                            "folder l3": { // order 2
                                "folder l1/folder l2/folder l3/file 1 at level 3.md": "file", // order 3 -> overwritten by w/ indicator
                                "1:folder l1/folder l2/folder l3/file 1 at level 3.md": "file^", // order 4 -> taken, overwrites w/o indicator
                            },
                            "folder l1/folder l2/not relevant for test.md": "file", // order 5
                        }
                    },
                }
            })

            const expected = new bkCacheMock()
                .add("folder l1", 1)
                .add("folder l1/folder l2/folder l3", 2)
                .add("folder l1/folder l2/not relevant for test.md", 5)
                .add("                   /folder l3/file 1 at level 3.md", 4)
                .getExpected()
            const result = _unitTests.getOrderedBookmarks(getBookmarksMock(items), DEFAULT_BKMRK_FOLDER)
            expect(result).toEqual(expected)
        })
        it('case 9 - Item w/o indicator never overwrites the one with the indicator', () => {
            const items = consumeBkMock({
                "sortspec": {
                    "folder l1": { // order 1
                        "\\\\folder l2": {
                            "folder l3": { // order 2
                            },
                            "folder l1/folder l2/not relevant for test.md": "file", // order 3
                        }
                    },
                    "1:folder l1/folder l2/folder l3/file 1 at level 3.md": "file^", // order 4 -> taken,
                    "2:folder l1/folder l2/folder l3/file 1 at level 3.md": "file", // ignored as duplicate w/o indicator
                }
            })

            const expected = new bkCacheMock()
                .add("folder l1", 1)
                .add("folder l1/folder l2/folder l3", 2)
                .add("folder l1/folder l2/not relevant for test.md", 3)
                .add("                   /folder l3/file 1 at level 3.md", 4)
                .getExpected()
            const result = _unitTests.getOrderedBookmarks(getBookmarksMock(items), DEFAULT_BKMRK_FOLDER)
            expect(result).toEqual(expected)
        })
        it('case 10 - Item w/o indicator never overwrites the one with the indicator', () => {
            const items = consumeBkMock({
                "sortspec": {
                    "folder l1": { // order 1
                        "\\\\folder l2": {
                            "folder l3": { // order 2
                                "folder l1/folder l2/folder l3/file 1 at level 3.md": "file^", // order 3 -> taken,
                            },
                            "folder l1/folder l2/not relevant for test.md": "file", // order 4
                        }
                    },
                    "folder l1/folder l2/folder l3/file 1 at level 3.md": "file", // ignored as duplicate w/o indicator and not matching path
                }
            })

            const expected = new bkCacheMock()
                .add("folder l1", 1)
                .add("folder l1/folder l2/folder l3", 2)
                .add("folder l1/folder l2/not relevant for test.md", 4)
                .add("                   /folder l3/file 1 at level 3.md", 3)
                .getExpected()
            const result = _unitTests.getOrderedBookmarks(getBookmarksMock(items), DEFAULT_BKMRK_FOLDER)
            expect(result).toEqual(expected)
        })
        it('case 11 - both w/o indicator and not matching path. Ignore the latter.', () => {
            const items = consumeBkMock({
                "sortspec": {
                    "folder l1": { // order 1
                        "\\\\folder l2": {
                            "folder l3": { // order 2
                            },
                        },
                    },
                    "1:folder l1/folder l2/folder l3/file 1 at level 3.md": "file", // order 3 -> taken
                    "2:folder l1/folder l2/folder l3/file 1 at level 3.md": "file", // ignored as duplicate w/o indicator and not matching path
                    "folder l1/folder l2/not relevant for test.md": "folder", // order 4
                }
            })

            const expected = new bkCacheMock()
                .add("folder l1", 1)
                .add("folder l1/folder l2/folder l3", 2)
                .add("                   /folder l3/file 1 at level 3.md", 3)
                .add("folder l1/folder l2/not relevant for test.md", 4)
                .getExpected()
            const result = _unitTests.getOrderedBookmarks(getBookmarksMock(items), DEFAULT_BKMRK_FOLDER)
            expect(result).toEqual(expected)
        })
        it('case 12 - both w/o indicator, matching path is not overwritten by not matching', () => {
            const items = consumeBkMock({
                "sortspec": {
                    "folder l1": { // order 1
                        "\\\\folder l2": {
                            "folder l3": { // order 2
                                "folder l1/folder l2/folder l3/file 1 at level 3.md": "file", // order 3 -> taken
                            },
                        },
                    },
                    "1:folder l1/folder l2/folder l3/file 1 at level 3.md": "file", // ignored as duplicate w/o indicator and not matching path
                    "folder l1/folder l2/not relevant for test.md": "folder", // order 4
                }
            })

            const expected = new bkCacheMock()
                .add("folder l1", 1)
                .add("folder l1/folder l2/folder l3", 2)
                .add("                   /folder l3/file 1 at level 3.md", 3)
                .add("folder l1/folder l2/not relevant for test.md", 4)
                .getExpected()
            const result = _unitTests.getOrderedBookmarks(getBookmarksMock(items), DEFAULT_BKMRK_FOLDER)
            expect(result).toEqual(expected)
        })
        it('case 13 - w/ indicator wins', () => {
            const items = consumeBkMock({
                "sortspec": {
                    "folder l1": { // order 1
                        "\\\\folder l2": {
                            "folder l3": { // order 2
                                "folder l1/folder l2/folder l3/file 1 at level 3.md": "file", // order 3 -> overwritten by w/ indicator
                            },
                        },
                    },
                    "folder l1/folder l2/folder l3/file 1 at level 3.md": "file^", // order 4 -> w/ indicator overwrites w/o indicator
                    "folder l1/folder l2/not relevant for test.md": "folder", // order 5
                }
            })

            const expected = new bkCacheMock()
                .add("folder l1", 1)
                .add("folder l1/folder l2/folder l3", 2)
                .add("                   /folder l3/file 1 at level 3.md", 4)
                .add("folder l1/folder l2/not relevant for test.md", 5)
                .getExpected()
            const result = _unitTests.getOrderedBookmarks(getBookmarksMock(items), DEFAULT_BKMRK_FOLDER)
            expect(result).toEqual(expected)
        })
        it('case 14 - w/ indicator wins', () => {
            const items = consumeBkMock({
                "sortspec": {
                    "folder l1": { // order 1
                        "\\\\folder l2": {
                            "folder l3": { // order 2
                                "1:folder l1/folder l2/folder l3/file 1 at level 3.md": "file^", // order 3
                                "2:folder l1/folder l2/folder l3/file 1 at level 3.md": "file", // duplicate, ignored regardless of w/ indicator and matching path
                            },
                        },
                    },

                    "folder l1/folder l2/not relevant for test.md": "folder", // order 5
                }
            })

            const expected = new bkCacheMock()
                .add("folder l1", 1)
                .add("         /folder l2/folder l3", 2)
                .add("                             /file 1 at level 3.md", 3)
                .add("                   /not relevant for test.md", 4)
                .getExpected()
            const result = _unitTests.getOrderedBookmarks(getBookmarksMock(items), DEFAULT_BKMRK_FOLDER)
            expect(result).toEqual(expected)
        })
        it('case 15 - both w/o indicator, matching path wins', () => {
            const items = consumeBkMock({
                "sortspec": {
                    "folder l1/folder l2/folder l3/file 1 at level 3.md": "file", // order 1 -> overwritten by matching path
                    "folder l1": { // order 2
                        "\\\\folder l2": {
                            "folder l3": { // order 3
                                "folder l1/folder l2/folder l3/file 1 at level 3.md": "file", // order 4 -> overwrites not matching path
                            },
                        },
                    },
                    "folder l1/folder l2/not relevant for test.md": "folder", // order 5
                }
            })

            const expected = new bkCacheMock()
                .add("folder l1", 2)
                .add("folder l1/folder l2/folder l3", 3)
                .add("                             /file 1 at level 3.md", 4)
                .add("                   /not relevant for test.md", 5)
                .getExpected()
            const result = _unitTests.getOrderedBookmarks(getBookmarksMock(items), DEFAULT_BKMRK_FOLDER)
            expect(result).toEqual(expected)
        })
        it('case 15 - both w/o indicator and matching path. Ignore the latter.', () => {
            const items = consumeBkMock({
                "sortspec": {
                    "folder l1": { // order 1
                        "folder l2": { // order 2
                            "folder l3": { // order 3
                            },
                            "1:folder l1/folder l2/file 1 at level 2.md": "file", // order 4 -> overwrites not matching path
                            "2:folder l1/folder l2/file 1 at level 2.md": "file", // ignored as duplicate
                        },
                    },
                    "folder l1/folder l2/not relevant for test.md": "folder", // order 5
                }
            })

            const expected = new bkCacheMock()
                .add("folder l1", 1)
                .add("         /folder l2", 2)
                .add("                   /folder l3", 3)
                .add("                   /file 1 at level 2.md", 4)
                .add("                   /not relevant for test.md", 5)
                .getExpected()
            const result = _unitTests.getOrderedBookmarks(getBookmarksMock(items), DEFAULT_BKMRK_FOLDER)
            expect(result).toEqual(expected)
        })
        it('case 16 and 17 - ignore invalid locations', () => {
            const items = consumeBkMock({
                "sortspec": {
                    "folder l1": { // order 1
                        "folder l1/folder l2/file 1 at level 2.md": "file^",
                        "folder l2": { // order 2
                            "folder l3": { // order 3
                                "folder l1/folder l2/file 1 at level 2.md": "file^",
                            },
                            "folder l1/file 1 at level 1.md": "file",
                        },
                    },
                    "folder l1/folder l2/not relevant for test.md": "folder", // order 4
                }
            })

            const expected = new bkCacheMock()
                .add("folder l1", 1)
                .add("         /folder l2", 2)
                .add("                   /folder l3", 3)
                .add("                   /not relevant for test.md", 4)
                .getExpected()
            const result = _unitTests.getOrderedBookmarks(getBookmarksMock(items), DEFAULT_BKMRK_FOLDER)
            expect(result).toEqual(expected)
        })
    })
})

/*
Duplicate elimination logic matrix

Originally table created in Excel, then copied & pasted toObsidian, which creates a good md format
Then converted from md to reStructuredText grid format via https://tableconvert.com/markdown-to-restructuredtext
(a great tables generator/converter in various formats)

+---------+--------+---------------------+---------------------+----------------+--+---------------------+---------------------+--------+--+-------------+----------------------------------------------------------------------+
| Case id |        | alreadyConsumed     |                     |                |  | new                 |                     |        |  | reject new? | Comment / scenario                                                   |
|         | Object | hasSortingIndicator | bookmarkPathMatches | path=/         |  | hasSortingIndicator | bookmarkPathMatches | path=/ |  |             |                                                                      |
+=========+========+=====================+=====================+================+==+=====================+=====================+========+==+=============+======================================================================+
| 1       | file   | yes                 | no                  | yes            |  | yes                 | no                  | yes    |  | reject      | both w/ indicator and not matching path. Ignore the latter.          |
| 2       | file   | yes                 | yes                 | N/R            |  | yes                 | no                  | yes    |  | reject      | both w/ indicator, matching path wins                                |
| 3       | file   | no                  | no                  | yes            |  | yes                 | no                  | yes    |  | take        | w/ indicator wins                                                    |
| 4       | file   | no                  | yes                 | N/R            |  | yes                 | no                  | yes    |  | take        | w/ indicator wins                                                    |
| 5       | file   | yes                 | no                  | yes            |  | yes                 | yes                 | N/R    |  | take        | both w/ indicator, matching path wins                                |
| 6       | file   | yes                 | yes                 | N/R            |  | yes                 | yes                 | N/R    |  | reject      | both w/ indicator and matching path. Ignore the latter               |
| 7       | file   | no                  | no                  | yes            |  | yes                 | yes                 | N/R    |  | take        | w/ indicator wins                                                    |
| 8       | file   | no                  | yes                 | N/R            |  | yes                 | yes                 | N/R    |  | take        | w/ indicator wins                                                    |
| 9       | file   | yes                 | no                  | yes            |  | no                  | no                  | yes    |  | reject      | Item w/o indicator never overwrites the one with the indicator       |
| 10      | file   | yes                 | yes                 | N/R            |  | no                  | no                  | yes    |  | reject      | Item w/o indicator never overwrites the one with the indicator       |
| 11      | file   | no                  | no                  | yes            |  | no                  | no                  | yes    |  | reject      | both w/o indicator and not matching path. Ignore the latter.         |
| 12      | file   | no                  | yes                 | N/R            |  | no                  | no                  | yes    |  | reject      | both w/o indicator, matching path is not overwritten by not matching |
| 13      | file   | yes                 | no                  | yes            |  | no                  | yes                 | N/R    |  | reject      | w/ indicator wins                                                    |
| 14      | file   | yes                 | yes                 | N/R            |  | no                  | yes                 | N/R    |  | reject      | w/ indicator wins                                                    |
| 15      | file   | no                  | no                  | yes            |  | no                  | yes                 | N/R    |  | take        | both w/o indicator, matching path wins                               |
| 16      | file   | no                  | yes                 | N/R            |  | no                  | yes                 | N/R    |  | reject      | both w/o indicator and matching path. Ignore the latter.             |
|         |        |                     |                     |                |  |                     |                     |        |  |             |                                                                      |
| 17      | file   | Doesn't matter      | Doesn't matter      | Doesn't matter |  | no                  | no                  | no     |  | reject      | An item in neither of correct bookmarks locations.                   |
| 18      | file   | Doesn't matter      | Doesn't matter      | Doesn't matter |  | yes                 | no                  | no     |  | reject      | An item in neither of correct bookmarks locations.                   |
+---------+--------+---------------------+---------------------+----------------+--+---------------------+---------------------+--------+--+-------------+----------------------------------------------------------------------+


- N/R = Not Relevant
- file and folder bookmark of the same path ==> not distinguished. Folders are a subset of the above matrix.

edge cases when path of group or folder or file overlaps
	- group vs group - the first one wins, to have consistent rules (should never occur, defensive programming)
	- group always wins over folder or a file w/o indicator
	- group vs file w/ indicator - w/ indicator always wins
	- folder vs file - not distinguished, folder treated as a file w/o indicator

Group name with double backslash prefix: \\groupName represent a bookmark not used for sorting, only used for the structure
 */

describe('bookmarkedGroupEmptyOrOnlyTransparentForSortingDescendants', () => {
    it('empty (undefined)', () => {
        const sortspecGroup = {
            type: 'group',
            title: 'sortspec'
        }

        const result = _unitTests.bookmarkedGroupEmptyOrOnlyTransparentForSortingDescendants(sortspecGroup as any)
        expect(result).toBeTruthy()
    })
    it('empty (zero length array)', () => {
        const items = consumeBkMock({
            "sortspec": {
            }
        })

        const result = _unitTests.bookmarkedGroupEmptyOrOnlyTransparentForSortingDescendants(items[0])
        expect(result).toBeTruthy()
    })
    it('complex empty structure', () => {
        const items = consumeBkMock({
            "sortspec": {
                "\\\\group l1.1": {
                    "\\\\group l2.1": {
                        "\\\\group l3.1": {}
                    },
                    "\\\\group l2.2": {}
                },
                "\\\\group l1.2": {
                    "\\\\group l2.1": {}
                }
            }
        })

        const result = _unitTests.bookmarkedGroupEmptyOrOnlyTransparentForSortingDescendants(items[0])
        expect(result).toBeTruthy()
    })
    it('complex structure - one nested not transparent group', () => {
        const items = consumeBkMock({
            "sortspec": {
                "\\\\group l1.1": {
                    "\\\\group l2.1": {
                        "group l3.1": {}
                    },
                    "\\\\group l2.2": {}
                },
                "\\\\group l1.2": {
                    "\\\\group l2.1": {}
                }
            }
        })

        const result = _unitTests.bookmarkedGroupEmptyOrOnlyTransparentForSortingDescendants(items[0])
        expect(result).toBeFalsy()
    })
    it('complex structure - one nested file', () => {
        const items = consumeBkMock({
            "sortspec": {
                "\\\\group l1.1": {
                    "\\\\group l2.1": {
                        "\\\\group l3.1": {}
                    },
                    "\\\\group l2.2": {
                        "some file (invalid location, yet anyways a file)": "file"
                    }
                },
                "\\\\group l1.2": {
                    "\\\\group l2.1": {}
                }
            }
        })

        const result = _unitTests.bookmarkedGroupEmptyOrOnlyTransparentForSortingDescendants(items[0])
        expect(result).toBeFalsy()
    })
    it('complex structure - one not nested folder', () => {
        const items = consumeBkMock({
            "sortspec": {
                "\\\\group l1.1": {
                    "\\\\group l2.1": {
                        "\\\\group l3.1": {}
                    },
                    "\\\\group l2.2": {}
                },
                "\\\\group l1.2": {
                    "\\\\group l2.1": {}
                },
                "a folder (must be manual)": "folder"
            }
        })

        const result = _unitTests.bookmarkedGroupEmptyOrOnlyTransparentForSortingDescendants(items[0])
        expect(result).toBeFalsy()
    })
})

describe('cleanupBookmarkTreeFromTransparentEmptyGroups', () => {
    it('should delete the structure up to the bookmark container group (starting point deep in hierarchy)', () => {
        const items = consumeBkMock({
            "sortspec": {
                "\\\\group l1.1": {
                    "\\\\group l2.1": {
                        "\\\\group l3.1": {
                            "\\\\deepest": {}
                        }
                    },
                    "\\\\group l2.2": {}
                },
                "\\\\group l1.2": {
                    "\\\\group l2.1": {}
                }
            }
        })
        const plugin = getBookmarksMock(items)
        const parentFolder: BookmarkedParentFolder|undefined = _unitTests.findGroupForItemPathInBookmarks(
            'group l1.1/group l2.1/group l3.1/deepest',
            false,
            plugin,
            'sortspec'
        )
        _unitTests.cleanupBookmarkTreeFromTransparentEmptyGroups(
            parentFolder,
            plugin,
            'sortspec'
            )
        expect(JSON.parse(JSON.stringify(items))).toEqual(JSON.parse(JSON.stringify(consumeBkMock({
            "sortspec": {}
        }))))
    })
    it('should delete 1st level group and not delete the bookmark container group (starting point flat)', () => {
        const items = consumeBkMock({
            "sortspec": {
                "\\\\group l1.2": {}
            }
        })
        const plugin = getBookmarksMock(items)
        const parentFolder: BookmarkedParentFolder|undefined = _unitTests.findGroupForItemPathInBookmarks(
            'group l1.2',
            false,
            plugin,
            'sortspec'
        )
        _unitTests.cleanupBookmarkTreeFromTransparentEmptyGroups(
            parentFolder,
            plugin,
            'sortspec'
            )
        expect(JSON.parse(JSON.stringify(items))).toEqual(JSON.parse(JSON.stringify(consumeBkMock({
            "sortspec": {}
        }))))
    })
    it('should delete the structure up to the non-empty group', () => {
        const items = consumeBkMock({
            "sortspec": {
                "\\\\group l1.1": {
                    "\\\\group l2.1": {
                        "\\\\group l3.1": {
                            "\\\\deepest": {}
                        }
                    },
                    "\\\\group l2.2": {}
                },
                "\\\\group l1.2": {
                    "\\\\group l2.1": {},
                    "group l2.2": {}
                }
            }
        })
        const plugin = getBookmarksMock(items)
        const parentFolder: BookmarkedParentFolder|undefined = _unitTests.findGroupForItemPathInBookmarks(
            'group l1.1/group l2.1/group l3.1/deepest',
            false,
            plugin,
            'sortspec'
        )
        _unitTests.cleanupBookmarkTreeFromTransparentEmptyGroups(
            parentFolder,
            plugin,
            'sortspec'
        )
        expect(JSON.parse(JSON.stringify(items))).toEqual(JSON.parse(JSON.stringify(consumeBkMock({
            "sortspec": {
                "\\\\group l1.2": {
                    "\\\\group l2.1": {},
                    "group l2.2": {}
                }
            }
        }))))
    })
    it('should not delete the structure because of sibling', () => {
        const items = consumeBkMock({
            "sortspec": {
                "\\\\group l1.1": {
                    "\\\\group l2.1": {
                        "\\\\group l3.1": {
                            "\\\\deepest 1": {},
                            "deepest 2": "file^"

                        }
                    },
                    "\\\\group l2.2": {
                        "\\\\deepest 1": {}
                    }
                },
                "\\\\group l1.2": {
                    "\\\\group l2.1": {
                        "\\\\deepest 1": {}
                    }
                }
            }
        })
        const plugin = getBookmarksMock(items)
        const parentFolder: BookmarkedParentFolder|undefined = _unitTests.findGroupForItemPathInBookmarks(
            'group l1.1/group l2.1/group l3.1/deepest',
            false,
            plugin,
            'sortspec'
        )
        _unitTests.cleanupBookmarkTreeFromTransparentEmptyGroups(
            parentFolder,
            plugin,
            'sortspec'
        )
        expect(JSON.parse(JSON.stringify(items))).toEqual(JSON.parse(JSON.stringify(consumeBkMock({
            "sortspec": {
                "\\\\group l1.1": {
                    "\\\\group l2.1": {
                        "\\\\group l3.1": {
                            "\\\\deepest 1": {},
                            "deepest 2": "file^"

                        }
                    },
                    "\\\\group l2.2": {
                        "\\\\deepest 1": {}
                    }
                },
                "\\\\group l1.2": {
                    "\\\\group l2.1": {
                        "\\\\deepest 1": {}
                    }
                }
            }
        }))))
    })
    it('should delete the structure after multi-clean invocation', () => {
        const items = consumeBkMock({
            "sortspec": {
                "\\\\group l1.1": {
                    "\\\\group l2.1": {
                        "\\\\group l3.1": {
                            "\\\\deepest 1": {}
                        }
                    },
                    "\\\\group l2.2": {
                        "\\\\deepest 2": {}
                    }
                },
                "\\\\group l1.2": {
                    "\\\\group l2.1": {
                        "\\\\deepest 3": {}
                    }
                }
            }
        })
        const plugin = getBookmarksMock(items)
        const parentFolder1: BookmarkedParentFolder|undefined = _unitTests.findGroupForItemPathInBookmarks(
            'group l1.1/group l2.1/group l3.1/deepest 1',
            false,
            plugin,
            'sortspec'
        )
        _unitTests.cleanupBookmarkTreeFromTransparentEmptyGroups(
            parentFolder1,
            plugin,
            'sortspec'
        )
        const parentFolder2: BookmarkedParentFolder|undefined = _unitTests.findGroupForItemPathInBookmarks(
            'group l1.2/group l2.1/deepest 3',
            false,
            plugin,
            'sortspec'
        )
        _unitTests.cleanupBookmarkTreeFromTransparentEmptyGroups(
            parentFolder2,
            plugin,
            'sortspec'
        )
        expect(JSON.parse(JSON.stringify(items))).toEqual(JSON.parse(JSON.stringify(consumeBkMock({
            "sortspec": {}
        }))))
    })
})
