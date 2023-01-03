> Document is partial, creation in progress
> Please refer to [README.md](../README.md) for more usage examples
> Check also [syntax-reference.md](./syntax-reference.md)

---
Some sections added ad-hoc, to be integrated later

# Advanced features

## Priorities of sorting groups

At run-time, when the custom sorting is triggered (explicitly or automatically) each folder item (a file or a sub-folder) is evaluated against the sorting groups.
The evaluation (matching) is done in the order in which the sorting groups are defined in `sorting-spec: |` for the folder.

That means, for example, that the sorting group `/:files ...` will match _all_ files - in turn, none of files has a chance to match further rule

Consider the below example:
```yaml
---
sorting-spec: |
  target-folder: Some folder
       // The below sorting group captures (matches) all files
  /:files ...
       // The below sorting group should (theoretically) capture files with names starting with 'Archive' word
       //   yet none of files will have a chance to reach the rule, because the previous sorting group will match all files
       //   Hence, the below sorting group is void
  /:files Archive...
---
```

The resulting order of notes would be:

![Order of notes w/o priorites](./svg/priorities-example-a.svg)

However, a group can be assigned a higher priority in the sorting spec. In result, folder items will be matched against them _before_ any other rules. To impose a priority on a group use the prefix `/!` or `/!!` or `/!!!`

The modified example would be:
```yaml
---
sorting-spec: |
  target-folder: Some folder
       // The below sorting group captures (matches) all files
  /:files ...
       // The below sorting group captures files with names starting with 'Archive' word
       //   and thanks to the priority indicator prefix '/!' folder items are matched against it
       //   before matching the previous sorting group
  /! /:files Archive...
---
```

and it would result in the expected order of items:

![Order of notes with group priorites](./svg/priorities-example-b.svg)

For clarity: the three available prefixes `/!` and `/!!` and `/!!!` allow for futher finetuning of sorting groups matching order, the `/!!!` representing the highest priority value

> A SIDE NOTE
> 
> In the above simplistic example, correct grouping of items can also be achieved in a different way:
> instead of using priorities, the first sorting group could be expressed differently as `/:files` (no following `...` wildcard):
> ```yaml
> ---
> sorting-spec: |
>   target-folder: Some folder
>   /:files
>   /:files Archive...
> ---
> ```
> The sorting group expressed as `/:files` alone acts as a sorting group 'catch-all-files, which don't match any other sorting rule for the folder' 

## Simple wildcards

Currently, the below simple wildcard syntax is supported:

### A single digit (exactly one)

An expression like `\d` or `\[0-9]` matches a single digit (exactly one)

**Example 1**:

A group specification of `/:files Section \d\d`\
matches notes with names `Section 23` or `Section 01`, yet not a note like `Section 5`

An opposite example:

A group specification of `/:files Section \d`\
matches the note with name `Section 5` and doesn't match notes `Section 23` or `Section 01`

However, be careful if used in connection with a wildcard `...` - the behavior could be surprising:

A group specification of `/:files Section \d...`\
matches all notes like `Section 5`, `Section 23` or `Section 015`

**Example 2**:

As described above, the `\d` is equivalent to `\[0-9]` and can be used interchangeably\
A group specification of `/folders Notes of \[0-9]\[0-9]\[0-9]\[0-9]`\
matches the notes with titles like `Notes of 2022` or `Notes of 1999`

## Combining sorting groups

A prefix of `/+` used in sorting group specification tells the sorting engine
to combine the group with adjanced groups also prefixed with `/+`

**Example:**

The below sorting spec:
```yaml
---
sorting-spec: |
  Notes \d\d\d\d
   > advanced modified
  Notes \d\d\d\d-\d\d
   > advanced modified
---
```
defines two sorting groups:
- first go the notes or folders with title like `Notes 2022` or `Notes 1999`
- then go notes or folders like `Notes 2022-12` or `Notes 1999-11`

Both groups sorted by recent modification date, the newest go first\
Implicitly, all other files or folders go below these two groups

Using the `/+` prefix you can combine the two groups into a logical one:
```yaml
---
sorting-spec: |
  /+ Notes \d\d\d\d
  /+ Notes \d\d\d\d-\d\d
   > advanced modified
---
```
the result is that:
- notes or folders with title like `Notes 2022` or `Notes 1999`
- **AND**
- notes or folders like `Notes 2022-12` or `Notes 1999-11`

will be pushed to the top in File Explorer, sorted by most recent modification date

> NOTE: the sorting order is specified only once after the last of combined groups
> and it applies to the whole superset of items of all combined groups

### An edge case: two adjacent combined sorting groups

If you want to define two combined groups one after another
you should add a separator line with some artificial value not matching
any of your folders or files. The text `---+---` was used in the below example:

```yaml
---
sorting-spec: |
  /+ Zeta
  /+ % Gamma
  /+ /:files Beta
  /+ Alpha
    < a-z
  ---+--- 
  /+ Notes \d\d\d\d
  /+ Notes \d\d\d\d-\d\d
    > advanced modified
---
```

The artificial separator `---+---` defines a sorting group, which will not match any folders or files
and is used here to logically separate the series of combined groups into to logical sets

## Matching starred items

The Obsidian core plugin `Starred` allows the user to 'star' files
The keyword `starred:` allows matching such items. A folder is considered _starred_ if at least one immediate child file is starred

**Example:**

Consider the below sorting spec:
```yaml
---
sorting-spec: |
  //       Example sorting configuration showing
    //     how to push the starred items to the top
    //
    // the line below applies the sorting specification
    //  to all folders in the vault
  target-folder: /*
    // the sorting order specification for the target folder(s)
  > advanced created 
    // the first group of items captures the files and folders which
    // are 'starred' in Obsidian core 'Starred' plugin.
    // Items in this group inherit the sorting order of target folder
  starred:
    // No further groups specified, which means all other items follow the
    // starred items, also in the order specified
---
```

The above sorting specification pushes the _starred_ items to the top
To achieve the opposite effect and push the starred items to the bottom, use the below sorting spec:

```yaml
---
sorting-spec: |
  //       Example sorting configuration showing
    //     how to push the starred items to the bottom
    //
    // the line below applies the sorting specification
    //  to all folders in the vault
  target-folder: /*
    // the sorting order specification for the target folder(s)
  > a-z
    // the first group of items captures all of the files and folders which don't match any other sorting rule
    // Items in this group inherit the sorting order of target folder
  /folders:files
    // the second group of items captures the files and folders which
    // are 'starred' in Obsidian core 'Starred' plugin.
    // Items in this group also inherit the sorting order of target folder
  starred:
---
```

For a broader view, the same effect (as in previous example) can be achieved using the priorities
of sorting rules:

```yaml
---
sorting-spec: |
  //       Example sorting configuration showing
    //     how to push the starred items to the bottom
    //
    // the line below applies the sorting specification
    //  to all folders in the vault
  target-folder: /*
    // the sorting order specification for the target folder(s)
  > a-z
    // the first group of items captures all of the files and folders
    // Items in this group inherit the sorting order of target folder
  ...
    // the second group of items captures the files and folders which
    // are 'starred' in Obsidian core 'Starred' plugin.
    // Items in this group also inherit the sorting order of target folder
    // The priority '/!' indicator tells to evaluate this sorting rule before other rules
    // If it were not used, the prevoius rule '...' would eat all of the folders and items
    // and the starred items wouldn't be pushed to the bottom
  /! starred:
---
```
