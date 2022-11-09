## Freely arrange notes and folders in File Explorer (https://obsidian.md plugin)

Take full control of the order of your notes and folders:

- treat folders and files equally or distinctively, you decide
- fine-grained folder-level or even notes-group-level specification
- support for fully manual order
  - list notes and folders names explicitly, or use prefixes or suffixes only
  - wildcard names matching supported
- group and sort notes and folders by notes custom metadata
- support for automatic sorting by standard and non-standard rules
- mixing manual and automatic ordering also supported
- order by compound numbers in prefix, in suffix (e.g date in suffix) or inbetween 
- Roman numbers support, also compound Roman numbers
- grouping by prefix or suffix or prefix and suffix
  - different sorting rules per group even inside the same folder
- simple to use yet versatile configuration options
- order configuration stored directly in your note(s) front matter
  - use a dedicated `sorting-spec:` key in YAML
- folders not set up for the custom order remain on the standard Obsidian sorting
- support for imposing inheritance of order specifications with flexible exclusion and overriding logic

## Table of contents

- [TL;DR Usage](#tldr-usage)
  - [Simple case 1: in root folder sort entries alphabetically treating folders and files equally](#simple-case-1-in-root-folder-sort-entries-alphabetically-treating-folders-and-files-equally)
  -	[Simple case 2: impose manual order of some items in root folder](#simple-case-2-impose-manual-order-of-some-items-in-root-folder)
  - [Example 3: In root folder, let files go first and folders get pushed to the bottom](#example-3-in-root-folder-let-files-go-first-and-folders-get-pushed-to-the-bottom)
  - [Example 4: In root folder, pin a focus note, then Inbox folder, and push archive to the bottom](#example-4-in-root-folder-pin-a-focus-note-then-inbox-folder-and-push-archive-to-the-bottom)
  - [Example 5: P.A.R.A. method example](#example-5-para-method-example)
  - [Example 6: P.A.R.A. example with smart syntax](#example-6-para-example-with-smart-syntax)
  - [Example 7: Apply the same sorting rules to two folders](#example-7-apply-the-same-sorting-rules-to-two-folders)
  - [Example 8: Specify rules for multiple folders](#example-8-specify-rules-for-multiple-folders)
  - [Example 9: Sort by numerical suffix](#example-9-sort-by-numerical-suffix)
  - [Example 10: Sample book structure with Roman numbered chapters](#example-10-sample-book-structure-with-roman-numbered-chapters)
  - [Example 11: Sample book structure with compound Roman number suffixes](#example-11-sample-book-structure-with-compound-roman-number-suffixes)
  - [Example 12: Apply same sorting to all folders in the vault](#example-12-apply-same-sorting-to-all-folders-in-the-vault)
  - [Example 13: Sorting rules inheritance by subfolders](#example-13-sorting-rules-inheritance-by-subfolders)
  - [Example 14: Grouping and sorting by metadata value](#example-14-grouping-and-sorting-by-metadata-value)
- [Location of sorting specification YAML entry](#location-of-sorting-specification-yaml-entry) 
- [Ribbon icon](#ribbon-icon)
- [Installing the plugin](#installing-the-plugin)
  - [From the official Obsidian Community Plugins page](#from-the-official-obsidian-community-plugins-page) 
  - [Installing the plugin using BRAT](#installing-the-plugin-using-brat)
  - [Manually installing the plugin](#manually-installing-the-plugin)
- [Credits](#credits)

## TL;DR Usage

For full version of the manual go to [manual](./docs/manual.md) and [syntax-reference](./docs/syntax-reference.md)

> **Quickstart**
> 
> 1. Download the [sortspec.md](./docs/examples/quickstart/sortspec.md?plain=1) file and put it in any folder of your vault,
can be the root folder. That file contains a basic custom sorting specification.
>
> 2. Enable the plugin in obsidian.
>
> 3. Click the ribbon button (![Inactive](./docs/icons/icon-inactive.png)) to tell the plugin to read the sorting
specification from `sortspec` note (the `sortspec.md` file which you downloaded a second ago). 
>   - The observable effect should be the change of appearance of the ribbon button to
(![Active](./docs/icons/icon-active.png)) and reordering
of items in root vault folder to reverse alphabetical with folders and files treated equally.
>   - The notification balloon should confirm success: ![Success](./docs/icons/parsing-succeeded.png)
> 4. Click the ribbon button again to suspend the plugin. The ribbon button should toggle its appearance again
and the order of files and folders in the root folder of your vault should get back to the order selected in
Obsidian UI
> 5. Happy custom sorting !!! Remember to click the ribbon button twice each time after sorting specification
change. This will suspend and re-enable the custom sorting, plus parse and apply the updated specification
> 
> - If you don't have any
subfolder in the root folder, create one to observe the plugin at work.
>
> NOTE: the appearances of ribbon button also includes ![Not applied](./docs/icons/icon-not-applied.png)
and ![Error](./docs/icons/icon-error.png). For the meaning of them please refer to [ribbon icon](#ribbon_icon) section below

Below go examples of (some of) the key features, ready to copy & paste to your vault.

For simplicity (if you are examining the plugin for the first time) copy and paste the below YAML snippets to the front
matter of the `sortspec` note (which is `sortspec.md` file under the hood). Create such note at any location in your
vault if you don't have one.

Each time after creating or updating the sorting specification click the [ribbon icon](#ribbon_icon) to parse the
specification and actually apply the custom sorting in File Explorer

Click the [ribbon icon](#ribbon_icon) again to disable custom sorting and switch back to the standard Obsidian sorting.

The [ribbon icon](#ribbon_icon) acts also as the visual indicator of the current state of the plugin - see
the [ribbon icon](#ribbon_icon) section for details

### Simple case 1: in root folder sort entries alphabetically treating folders and files equally

The specified rule is to sort items alphabetically in the root folder of the vault 

The line `target-folder: /` specifies to which folder apply the sorting rules which follow.

The `/` indicates the root folder of the vault in File Explorer

And `< a-z` sets the order to alphabetical ascending

> IMPORTANT: indentation matters in all the examples

```yaml
---
sorting-spec: |
    target-folder: /
    < a-z
---
```
(View or download the [sortspec.md](./docs/examples/1/sortspec.md?plain=1) file of this example)

which can result in:

![Simplest example](./docs/svg/simplest-example.svg)

### Simple case 2: impose manual order of some items in root folder

The specification here lists items (files and folders) by name in the desired order

Notice, that only a subset of items was listed. Unlisted items go after the specified ones, if the specification
doesn't say otherwise

```yaml
---
sorting-spec: |
    target-folder: /
    Note 1
    Z Archive
    Some note
    Some folder
---
```

produces:

![Simplest example](./docs/svg/simplest-example-2.svg)

### Example 3: In root folder, let files go first and folders get pushed to the bottom

Files go first, sorted by modification date descending (newest note in the top)

Then go folders, sorted in reverse alphabetical order

> IMPORTANT: Again, indentation matters in all of the examples. Notice that the order specification `< modified` for
> the `/:files` and the order `> a-z` for `/folders` are indented by one more space. The indentation says the order
> applies
> to the group and not to the 'target-folder' directly.
>
> And yes, each group can have a different order in the same parent folder

```yaml
---
sorting-spec: |
    target-folder: /
    /:files
     < modified
    /folders
     > a-z
---
```

will order items as:

![Files go first example](./docs/svg/files-go-first.svg)

### Example 4: In root folder, pin a focus note, then Inbox folder, and push archive to the bottom

The specification below says:

- first go items which name starts with 'Focus' (e.g. the notes to pin to the top)
	- notice the usage of '...' wildcard
- then goes an item named 'Inbox' (my Inbox folder)
- then go all items not matching any of the above or below rules/names/patterns
	- the special symbol `%` has that meaning
- then, second to the bottom goes the 'Archive' (a folder which doesn't need focus)
- and finally, in the very bottom, the `sortspec.md` file, which probably contains this sorting specification ;-)

```yaml
---
sorting-spec: |
    target-folder: .
    Focus...
    Inbox
    %
    Archive
    sortspec
---
```

and the result will be:

![Result of the example](./docs/svg/pin-focus-note.svg)

> Remarks for the `target-folder:`
>
> In this example the dot '.' symbol was used `target-folder: .` which means _apply the sorting specification to the
folder which contains the note with the specification_.
>
> If the `target-folder:` line is omitted, the specification will be applied to the parent folder of the note, which has
> the same effect as `target-folder: .`

### Example 5: P.A.R.A. method example

The P.A.R.A. system for organizing digital information is based on the four specifically named folders ordered as in the
acronym: Projects — Areas — Resources — Archives

To put folders in the desired order you can simply list them by name in the needed sequence:

```yaml
---
sorting-spec: |
    target-folder: /
    Projects
    Areas
    Responsibilities
    Archive
---
```

(View or download the [sortspec.md](./docs/examples/5/sortspec.md?plain=1) file of this example)

which will have the effect of:

![Result of the example](./docs/svg/p_a_r_a.svg)

### Example 6: P.A.R.A. example with smart syntax

Instead of listing full names of folders or notes, you can use the prefix or suffix of prefix+suffix notation with the
special syntax of '...' which acts as a wildcard here, matching any sequence of characters:

```yaml
---
sorting-spec: |
    target-folder: /
    Pro...
    A...s
    Res...es
    ...ive
---
```

It will give exactly the same order as in previous example:

![Result of the example](./docs/svg/p_a_r_a.svg)

```
REMARK: the wildcard expression '...' can be used only once per line
```

### Example 7: Apply the same sorting rules to two folders

Let's tell a few folders to sort their child notes and child folders by created date reverse order (newer go first)

```yaml
---
sorting-spec: |
    target-folder: Some subfolder
    target-folder: Archive
    target-folder: Archive/2021/Completed projects
    > created
---
```

No visualization for this example needed

### Example 8: Specify rules for multiple folders

The specification can contain rules and orders for more than one folder

Personally I find convenient to keep sorting specification of all folders in a vault in a single place, e.g. in a
dedicated note Inbox/Inbox.md

```yaml
---
sorting-spec: |
    target-folder: /
    Pro...
    Archive

    target-folder: Projects
    Top Secret

    target-folder: Archive
    > a-z
---
```

will have the effect of:

![Result of the example](./docs/svg/multi-folder.svg)

### Example 9: Sort by numerical suffix

This is interesting.

Sorting by numerical prefix is easy and doesn't require any additional plugin in Obsidian.
At the same time sorting by numerical suffix is not feasible without a plugin like this one.

Use the specification like below to order notes in 'Inbox' subfolder of 'Data' folder by the numerical suffix indicated
by the 'part' token (an arbitrary example)

```yaml
---
sorting-spec: |
    target-folder: Data/Inbox
    ... part \d+
     < a-z
---
```

the line `... part \d+` says: group all notes and folders with name ending with 'part' followed by a number. Then order
them by the number. And for clarity the subsequent (indented) line is added ` < a-z` which sets the order to
alphanumerical ascending.

The effect is:

![Order by numerical suffix](./docs/svg/by-suffix.svg)

### Example 10: Sample book structure with Roman numbered chapters

Roman numbers are also supported. This example uses the `\R+` token in connection with the wildcard `...`

The line `Chapter \.R+ ...` says: notes (or folders) with a name starting with 'Chapter ' followed by a Roman number (e.g. I, or iii or x) should be grouped.
Then ` < a-z` (the leading space indentation is important) tells to use ascending order by that number (alphabetical is equivalent to ascending for numbers)

```yaml
---
sorting-spec: |
    target-folder: Book
    Preface
    Chapter \R+ ...
     < a-z
    Epi...
---
```

it gives:

![Book - Roman chapters](./docs/svg/roman-chapters.svg)

### Example 11: Sample book structure with compound Roman number suffixes

Roman compound numbers are also supported. This example uses the `\.R+` token (a Roman compound number with '.' as separator) in connection with the wildcard `...` (and the important SPACE inbetween).

The line `... \.R+` says: notes (or folders) with a name ending with a compound Roman number (e.g. I, or i.iii or iv.vii.x) should be grouped with ascending order by that compound number (no additional specification of sorting defaults to alphabetical or ascending for numbers)

```yaml
---
sorting-spec: |
    target-folder: Research pub
    Summ...
    ... \.R+
    Final...
---
```

the result is:

![Book - Roman compound suffixes](./docs/svg/roman-suffix.svg)

### Example 12: Apply same sorting to all folders in the vault

Apply the same advanced modified date sorting to all folders in the Vault. The advanced modified sorting treats the folders 
 and files equally (which is different from the standard Obsidian sort, which groups folders in the top of File Explorer)
 The modified date for a folder is derived from its newest direct child file (if any), otherwise a folder is considered old

This involves the wildcard suffix syntax `*` which means _apply the sorting rule to the specified folder
and all of its subfolders, including descendants. In other words, this is imposing a deep inheritance
of sorting specification. 
Applying the wildcard suffix to root folder path `/*` actually means _apply the sorting to all folders in the vault_

```yaml
---
sorting-spec: |
    target-folder: /*
    > advanced modified
---
```

### Example 13: Sorting rules inheritance by subfolders

A more advanced example showing finetuned options of manipulating of sorting rules inheritance:

You can read the below YAML specification as:
- all items in all folders in the vault (`target-folder: /*`) should be sorted alphabetically (files and folders treated equally)
- yet, items in the `Reviews` folder and its direct subfolders (like `Reviews/daily`) should be ordered by modification date
  - the syntax `Reviews/...` means: the items in `Reviews` folder and its direct subfolders (and no deeper)
    - the more nested folder like `Reviews/daily/morning` inherit the rule specified for root folder `/*`
  - Note, that a more specific (or more nested or more focused) rule overrides the more generic inherited one
- at the same time, the folder `Archive` and `Inbox` sort their items by creation date
  - this is because specifying direct name in `target-folder: Archive` has always the highest priority and overrides any inheritance
- and finally, the folders `Reviews/Attachments` and `TODOs` are explicitly excluded from the control of the custom sort 
  plugin and use the standard Obsidian UI sorting, as selected in the UI
  - the special syntax `sorting: standard` tells the plugin to refrain from ordering items in specified folders
  - again, specifying the folder by name in `target-folder: TODOs` overrides any inherited sorting rules

```yaml
---
sorting-spec: |
    target-folder: /*
    < a-z
	
    target-folder: Reviews/...
    < modified

    target-folder: Archive
    target-folder: Inbox
    < created

    target-folder: Reviews/Attachments
    target-folder: TODOs
    sorting: standard
---
```

### Example 14: Grouping and sorting by metadata value

Notes can contain metadata, let me use the example inspired by the [Feature Request #23](https://github.com/SebastianMC/obsidian-custom-sort/issues/23).
Namely, someone can create notes when reading a book and use the `Pages` metadata field. In that field s/he enters page(s) number(s) of the book, for reference.

For example:

```yaml
---
Pages: 6
...
---
```

or

```yaml
---
Pages: 7,8
...
---
```

or 

```yaml
---
Pages: 12-15
...
---
```

Using this plugin you can sort notes by the value of the specific metadata, for example:

```yaml
---
sorting-spec: |
    target-folder: Remarks from 'The Little Prince' book
    < a-z by-metadata: Pages
---
```

In that approach, the notes containing the metadata `Pages` will go first, sorted alphabetically by the value of that metadata.
The remaining notes (not having the metadata) will go below, sorted alphabetically by default. 

In the above example the syntax `by-metadata: Pages` was used to tell the plugin about the metadata field name for sorting.
The specified sorting `< a-z` is obviously alphabetical, and in this specific context it tells to sort by the value of the specified metadata (and not by the note or folder name).

In a more advanced fine-tuned approach you can explicitly group notes having some metadata and sort by that (or other) metadata:

```yaml
---
sorting-spec: |
    target-folder: Remarks from 'The Little Prince' book
    with-metadata: Pages
     < a-z by-metadata: Pages
	...
	 > modified
---
```

In the above example the syntax `with-metadata: Pages` was used to tell the plugin about the metadata field name for grouping.
The specified sorting `< a-z` is obviously alphabetical, and in this specific context it tells to sort by the value of the specified metadata (and not by the note or folder name).
Then the remaining notes (not having the `Pages` metadata) are sorted by modification date descending.

> NOTE
> 
> The grouping and sorting by metadata is not refreshed automatically after change of the metadata in note(s) to avoid impact on Obsidian performance.
> After editing of metadata of some note(s) you have to explicitly click the plugin ribbon button to refresh the sorting. Or close and reopen the vault. Or restart Obsidian.
> This behavior is intentionally different from other grouping and sorting rules, which stay active and up-to-date once enabled.

> NOTE
> 
> For folders, metadata of their 'folder note' is scanned (if present)
 
> NOTE
> 
> The `with-metadata:` keyword can be used with other specifiers like `/:files with-metadata: Pages` or `/folders with-metadata: Pages`
> If the metadata name is omitted, the default `sort-index-value` metadata name is assumed.

## Location of sorting specification YAML entry

You can keep the custom sorting specifications in any of the following locations (or in all of them):

- in the front matter of the `sortspec` note (which is the `sortspec.md` file under the hood)
	- you can keep one global `sortspec` note or one `sortspec` in each folder for which you set up a custom sorting
	- YAML in front matter of all existing `sortspec` notes is scanned, so feel free to choose your preferred approach
- in the front matter of the - so called - _folder note_. For instance '/References/References.md'
	- the 'folder note' is a concept of note named exactly as its parent folder, e.g. `references` note (
	  actually `references.md` file) residing inside the `/references/` folder
	- there are popular Obsidian plugins which allow convenient access and editing of folder note, plus hiding it in the
	  notes list
- in the front matter of a **designated note** configured in setting
	- in settings page of the plugin in obsidian you can set the exact path to the designated note
	- by default, it is `Inbox/Inbox.md`
	- feel free to adjust it to your preferences
	- primary intention is to use this setting as the reminder note to yourself, to easily locate the note containing
	  sorting specifications for the vault

A sorting specification for a folder has to reside in a single YAML entry in one of the listed locations.
At the same time, you can put specifications for different target folders into different notes, according to your
preference.
My personal approach is to keep the sorting specification for all desired folders in a single note (
e.g. `Inbox/Inbox.md`). And for clarity, I keep the name of that designated note in the plugin settings, for easy
reference.

<a name="ribbon_icon"></a>

## Ribbon icon

Click the ribbon icon to toggle the plugin between enabled and suspended states.

States of the ribbon icon:

- ![Inactive](./docs/icons/icon-inactive.png) Plugin suspended. Custom sorting NOT applied.
	- Click to enable and apply custom sorting.
	- Note: parsing of the custom sorting specification happens after clicking the icon. If the specification contains
	  errors, they will show up in the notice baloon and also in developer console.
- ![Active](./docs/icons/icon-active.png) Plugin active, custom sorting applied.
	- Click to suspend and return to the standard Obsidian sorting in File Explorer.
- ![Error](./docs/icons/icon-error.png) Syntax error in custom sorting configuration.
	- Fix the problem in specification and click the ribbon icon to re-enable custom sorting.
	- If syntax error is not fixed, the notice baloon with show error details. Syntax error details are also visible in
	  the developer console
- ![Sorting not applied](./docs/icons/icon-not-applied.png) Plugin enabled but the custom sorting was not applied.
	- This can happen when reinstalling the plugin and in similar cases
	- Click the ribbon icon twice to re-enable the custom sorting.

## Installing the plugin

### From the official Obsidian Community Plugins page

The plugin could and should be installed from the official Obsidian Community Plugins list at https://obsidian.md/plugins
or directly in the Obsidian app itself.
Search the plugin by its name 'CUSTOM FILE EXPLORER SORTING'

### Installing the plugin using BRAT

> NOTE
> 
> BRAT installation is supported yet no longer needed since reaching the official list at https://obsidian.md/plugins

1. Install the BRAT plugin
	1. Open `Settings` -> `Community Plugins`
	2. Disable restricted (formerly 'safe') mode, if enabled
	3. *Browse*, and search for "BRAT"
	4. Install the latest version of **Obsidian 42 - BRAT**
2. Open BRAT settings (`Settings` -> `Obsidian 42 - BRAT`)
	1. Scroll to the `Beta Plugin List` section
	2. `Add Beta Plugin`
	3. Specify this repository: `SebastianMC/obsidian-custom-sort`
3. Enable the `Custom File Explorer sorting` plugin (`Settings` -> `Community Plugins`)

### Manually installing the plugin

> NOTE
> 
> Manual installation is no longer needed since reaching the official list at https://obsidian.md/plugins

1. Go to Github for releases: https://github.com/SebastianMC/obsidian-custom-sort/releases
2. Download the latest (or desired) Release from the Releases section of the GitHub Repository
3. Copy the downloaded files `main.js` and `manifest.json` over to your
   vault `VaultFolder/.obsidian/plugins/custom-sort/`.
	- you might need to manually create the `/custom-sort/` folder under `VaultFolder/.obsidian/plugins/`
4. Reload Obsidian
5. If prompted about Restricted (formerly 'Safe') Mode, you can disable restricted mode and enable the plugin.
   -Otherwise, go to `Settings` -> `Community plugins`, make sure restricted mode is off and enable the plugin from
   there.

> Note: The `.obsidian` folder may be hidden.
> On macOS, you should be able to press Command+Shift+Dot to show the folder in Finder.

## Credits

Thanks to [Nothingislost](https://github.com/nothingislost) for the monkey-patching ideas of File Explorer
in [obsidian-bartender](https://github.com/nothingislost/obsidian-bartender)

