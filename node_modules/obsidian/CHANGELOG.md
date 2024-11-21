# Changelog

This CHANGELOG details any breaking changes to the API or new additions that require additional context. The versions listed below correspond to the versions of the Obsidian app. There may not be a corresponding package version for the version listed below.

## v1.7.2 (Insider)

### Workspace changes

- New function `Plugin#onUserEnable` gives you a place to performance one-time initialize after the user installs and enables your plugin. If your plugin has a custom view, this is a good place to initialize it rather than recreating the view in `Plugin#onload`.
- `Workspace#ensureSideLeaf` is now public. This function is a shorthand way to create a leaf in the sidebar if one does not already exist.
- Added `WorkspaceLeaf#isDeferred` and `WorkspaceLeaf#loadIfDeferred`. As of Obsidian v1.7.2, Obsidian will now defer tabs by default. We are publishing a guide on how to handle deferred views in the developer docs.

### Housekeeping

- Removed `prepareQuery`, `fuzzySearch`, and `PreparedQuery` from the API. If your plugin is using one of these functions, you should migrate to `prepareFuzzySearch`.
- We've updated the API to prefer `unknown` to `any`. Using `any` causes Typescript to disable typechecking entirely on the returned value, so this change could uncover some hidden typing issues.

### Misc

- New `Plugin#removeCommand` is now available if your plugin needs to dynamically remove commands (for example, if your plugin allows for user-created commands).
- `SuggestModal#selectActiveSuggestion` is now public. This is useful to provide an alternative hotkey to your SuggestModal that still triggers the selected item.

## v1.7.0 (Insider)

- Fixed `FileSystemAdapter#rmdir(dirPath, false)` always throwing an error when attempting to delete an empty directory.
- Added a `data-type` to the Markdown embed container using subpath type.

## v1.5.11

- Fixed `revealLeaf` failing to focus the correct window.
- If you are using the `SliderComponent` in your app, be aware, the behavior of the component has changed in 1.5.9. Now, instead of updating the value when the slider is dragged, it will only update the value when the slider is released. If your plugin was relying on the old behavior, you will need to update your plugin code to call `.setInstant(true)` on the slider.
  **Note:** Because `setInstant` is a new function, you'll also need to check to see if the function exists before calling it. This will ensure your plugin maintains backwards compatibility when being run on older versions of Obsidian.

## v1.5.7

### `Plugin#onExternalSettingsChange`

There's a new callback function for plugins to react to when plugin settings (`data.json`) get changed on disk. This callback can be used to reload settings when they are updated by an external application or when the settings get synced using a file syncing service like Obsidian Sync.

### New `Vault#getFileByPath` and `Vault#getFolderByPath` utility functions

The `getAbstractFileByPath` has long been a point of confusion with plugin developers. More often than not,
you are looking for either a file or a folder. And you know which you want at call-time. Instead of using
`getAbstractFileByPath` then checking if the result is an instance of `TFile` or `TFolder`, now you can just
use `getFileByPath` or `getFolderByPath` to automatically do this check.

### `View.scope` is now public

Finally `scope` is made public on the `View` class. This means you can assign hotkeys for when your view is
active and focused.

### New `getFrontMatterInfo` utility

There is now a canonical way to find the offsets of where the frontmatter ends and where the content starts in a file.

### `FileManager#getAvailablePathForAttachment`

If your plugin saves attachments to the vault, you should be using `getAvailablePathForAttachment`. It will generate a safe path for you to use that respects the user's settings for file attachments.


## v1.4.4

We've exposed our helper function for setting tooltips on elements (`setTooltip`) as well as added a new progress bar component.

The `FileManager#processFrontMatter` function now also exposes the DataWriteOptions argument to be consistent with the other `process` and `write` functions.

## v1.4.0

We've made some changes to `CachedMetadata` to support **Properties**. `FrontMatterCache` is now no longer a `CacheItem`—meaning that it doesn't have a position. Instead, is it a _Reference_.

Another big change in v.1.4 is that frontmatter now supports wikilinks. If a value in the frontmatter can be interpreted as a link, it will be cached inside `CachedMetadata.frontmatterLinks`.

## v1.1.3

- Updated the [Canvas spec](https://github.com/obsidianmd/obsidian-api/blob/master/canvas.d.ts) to indicate that colors can be stored in 1 or 2 formats:
  - as a hex string (i.e. "#FFFFFF")
  - as a number "1", "2", etc.

  If it's a number, this refers to the palette position. It can be themed via CSS variables.


### Theme Changes

There are some new CSS variables related to canvas and callouts in 1.1.3+. All the extended palette colors now have an RGB variant that is used for callouts and canvas colors. The hex values are primarily used for syntax highlighting.

```css
body {
    --callout-bug: var(--color-red-rgb);
    --callout-default: var(--color-blue-rgb);
    --callout-error: var(--color-red-rgb);
    --callout-example: var(--color-purple-rgb);
    --callout-fail: var(--color-red-rgb);
    --callout-important: var(--color-cyan-rgb);
    --callout-info: var(--color-blue-rgb);
    --callout-question: var(--color-yellow-rgb);
    --callout-success: var(--color-green-rgb);
    --callout-summary: var(--color-cyan-rgb);
    --callout-tip: var(--color-cyan-rgb);
    --callout-todo: var(--color-blue-rgb);
    --callout-warning: var(--color-orange-rgb);
    --callout-quote: 158, 158, 158;
}
.theme-light {
    --color-red-rgb: 228, 55, 75;
    --color-red: #E4374B;

    --color-orange-rgb: 217, 108, 0;
    --color-orange: #d96c00;

    --color-yellow-rgb: 189, 142, 55;
    --color-yellow: #BD8E37;

    --color-green-rgb: 12, 181, 79;
    --color-green: #0cb54f;

    --color-cyan-rgb: 45, 183, 181;
    --color-cyan: #2db7b5;

    --color-blue-rgb: 8, 109, 221;
    --color-blue: #086DDD;

    --color-purple-rgb: 135, 107, 224;
    --color-purple: #876be0;

    --color-pink-rgb: 195, 43, 116;
    --color-pink: #C32B74;
}
.theme-dark {
    --color-red-rgb: 251, 70, 76;
    --color-red: #fb464c;

    --color-orange-rgb: 233, 151, 63;
    --color-orange: #E9973F;

    --color-yellow-rgb: 224, 222, 113;
    --color-yellow: #E0DE71;

    --color-green-rgb: 68, 207, 110;
    --color-green: #44CF6E;

    --color-cyan-rgb: 83, 223, 221;
    --color-cyan: #53DFDD;

    --color-blue-rgb: 2, 122, 255;
    --color-blue: #027aff;

    --color-purple-rgb: 168, 130, 255;
    --color-purple: #a882ff;

    --color-pink-rgb: 250, 153, 205;
    --color-pink: #FA99CD;
}
```


## v1.1.1 (2022-12-8 — Insider build)

_[Changes since v1.0](https://github.com/obsidianmd/obsidian-api/compare/32fe4c3f...6161bf59)_

- [`file-open`](https://github.com/obsidianmd/obsidian-api/blob/ec589e9762a1d7e2faad01f894cb34c41b10ecaf/obsidian.d.ts#L4189) event is now fired when focusing a Canvas file card.
- Exposed the `activeEditor` on the Workspace. When a markdown view is active, this will point to the underlying `MarkdownEditView`. If a canvas view is active, this will be an EmbeddedEditor component.

With these two changes, plugins should be able to adapt to the new Canvas view quite easily. Custom
views that react the the currently focused views will automatically respond to the user clicking 
on file cards in the canvas. If a plugin is currently accessing the `Editor` using the following
approach:

```ts
let view = app.workspace.getActiveViewOfType(MarkdownView);

if (view) {
    let editor = view.editor;
    // or
    let file = view.file;
}
```

Instead you can access the `editor` or `file` by looking under the `activeEditor`:
```ts
let { activeEditor } = app.workspace;
if (activeEditor) {
    let editor = activeEditor.editor;
    let file = activeEditor.file;
}
```

## v1.1.0 (2022-12-05 — Insider build)

_[Changes since v1.0](https://github.com/obsidianmd/obsidian-api/compare/1b4f6e2...32fe4c3f)_

### New Metadata API

In anticipation of bigger improvements to metadata and frontmatter in Obsidian, we have introduced a new metadata API.
It is currently defined as follows:

```ts
interface FileManager {
/**
     * Atomically read, modify, and save the frontmatter of a note.
     * The frontmatter is passed in as a JS object, and should be mutated directly to achieve the desired result.
     * @param file - the file to be modified. Must be a markdown file.
     * @param fn - a callback function which mutates the frontMatter object synchronously.
     * @public
     */
    processFrontMatter(file: TFile, fn: (frontMatter: any) => void): Promise<void>
}
```

To use it:

```ts
app.fileManager.processFrontMatter(file, (frontmatter) => {
    frontmatter["key1"] = value;
    delete frontmatter["key2"];
});
```

All changes made within the callback block will be applied at once.


### Improved

- `setTooltip` now accepts an optional tooltip position.
- The `size?: number` parameter has been removed from `setIcon`. This is now configurable via CSS. You can add override the CSS var `--icon-size` on the parent class of your element to override the sizing (e.g. `.parent-element { --icon-size: var(--icon-xs) } `) The following icon sizes are available out-of-the-box: `--icon-xs`, `--icon-s`, `--icon-m`, and `--icon-l`.
- `editorCallback` no longer passes the active `view: MarkdownView`. Instead, it now provides either the MarkdownView or a MarkdownFileInfo object. This change allows for editor commands to work within a Canvas.
- `registerHoverLinkSource` is now available in the API to register your plugin's view with the Page preview core plugin.

### No longer broken

- Fixed `Editor.replaceSelection` not working when run immediately after closing a modal.

### Notable Changes

- Added support for an optional `fundingUrl` field the plugin manifest This is a link for users that want to donate to show appreciation and support plugin development. It's displayed when your plugin is selected in the list of community plugins.
- Added macOS calendar entitlements. This allow scripts run from within Obsidian to request calendar access.

## v1.0 (2022-10-13)

_[Changes since v0.15.9](https://github.com/obsidianmd/obsidian-api/compare/ff121cd...1b4f6e2)_

### New

- Added standard [color picker component](https://github.com/obsidianmd/obsidian-api/blob/902badd38ba907689f0917d7b193f7e33d1284fe/obsidian.d.ts#L493).

### Improved

- `getLeaf` can now be used to create a leaf in a new tab, a new tab group, or a new window. The preferred usage of `getLeaf` would be `getLeaf(Keymap.isModEvent(evt))` where `evt` is the user's KeyboardEvent. This allows for a consistent user experience when opening files while a modifier key is pressed.

### Notable Changes

- Workspace information is no longer saved to the `.obsidian/workspace` file. It is now saved to `workspace.json`.
- Added `.has-active-menu` class to file explorer item that received the right-click.
- Added `.list-bullet` class to HTML markup for unordered list items.
