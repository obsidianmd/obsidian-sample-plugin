> Document is partial, creation in progress
> Please refer to [README.md](../../README.md) for usage examples
> Check [manual.md](), maybe that file has already some content?

### Supported sorting methods

#### At folder level only

- `sorting: standard` - gives back the control on order of items in hands of standard Obsidian mechanisms (UI driven).
 Typical (and intended) use: exclude a folder (or folders subtree) from a custom sorting resulting from wilcard-based target folder rule 

#### At folder and group level

- `< a-z` - alphabetical
- `> a-z` - alphabetical reverse, aka alphabetical descending, 'z' goes before 'a'
- `< modified` - by modified time, the long untouched item goes first (modified time of folder is assumed the beginning of the world, so folders go first and alphabetical)
- `> modified` - by modified time reverse, the most recently modified item goes first (modified time of folder is assumed the beginning of the world, so folders land in the bottom and alphabetical)
- `< created` - by created time, the oldest item goes first (modified time of folder is assumed the beginning of the world, so folders go first and alphabetical) 
- `> created` - by created time reverse, the newest item goes first (modified time of folder is assumed the beginning of the world, so folders land in the bottom and alphabetical)
- `< advanced modified` - by modified time, the long untouched item goes first. For folders, their modification date is derived from the most recently modified direct child file.
 For extremely large vaults use with caution, as the sorting needs to scan all files inside a folder to determine the folder's modified date
- `> advanced modified` - by modified time reverse, the most recently modified item goes first. For folders, their modification date is derived from the most recently modified direct child file.
 For extremely large vaults use with caution, as the sorting needs to scan all files inside a folder to determine the folder's modified date
- `< advanced created` - by created time, the oldest item goes first. For folders, their creation date is derived from the oldest direct child file.
 For extremely large vaults use with caution, as the sorting needs to scan all files inside a folder to determine the folder's created date
- `> advanced created` - by created time reverse, the newest item goes first. For folders, their creation date is derived from the newest direct child file.
 For extremely large vaults use with caution, as the sorting needs to scan all files inside a folder to determine the folder's created date

#### At group level only (aka secondary sorting rule)

> Only applicable in edge cases based on numerical symbols, when the regex-based match is equal for more than one item
 and need to apply a secondary order on same matches.

- `< a-z, created`
- `> a-z, created`
- `< a-z, created desc`
- `> a-z, created desc`
- `< a-z, modified`
- `> a-z, modified`
- `< a-z, modified desc`
- `> a-z, modified desc`
- `< a-z, advanced created`
- `> a-z, advanced created`
- `< a-z, advanced created desc`
- `> a-z, advanced created desc`
- `< a-z, advanced created`
- `> a-z, advanced created`
- `< a-z, advanced created desc`
- `> a-z, advanced created desc`

### Alternate tokens

Some tokens have shorter equivalents, which can be used interchangeably:

- `target-folder:` --> `::::` e.g `target-folder: /` is equivalent to `:::: /`
- `order-asc:` --> `<` e.g. `order-asc: modified` is equivalent to `< modified`
- `order-desc:` --> `>` e.g. `order-desc: a-z` is equivalent to `> a-z`
- `/:files` --> `/:` e.g. `/:files Chapter \.d+ ...` is equivalent to `/: Chapter \.d+ ...`
- `/:files.` --> `/:.` e.g. `/:files. ... \-D+.md` is equivalent to `/:. ... \-D+.md`
- `/folders` --> `/` e.g. `/folders Archive...` is equivalent to `/ Archive...`

