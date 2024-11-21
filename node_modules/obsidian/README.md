## Obsidian API

Type definitions for the latest [Obsidian](https://obsidian.md) API.

### Documentation

You can browse our Plugin API documentation at https://docs.obsidian.md/

For an example on how to create Obsidian plugins, use the template at https://github.com/obsidianmd/obsidian-sample-plugin

### Issues and API requests

For issues with the API, or to make requests for new APIs, please go to our forum: https://forum.obsidian.md/c/developers-api/14

### Plugin structure

`manifest.json`

- `id` the ID of your plugin.
- `name` the display name of your plugin.
- `author` the plugin author's name.
- `version` the version of your plugin.
- `minAppVersion` the minimum required Obsidian version for your plugin.
- `description` the long description of your plugin.
- `isDesktopOnly` whether your plugin uses NodeJS or Electron APIs.
- `authorUrl` (optional) a URL to your own website.
- `fundingUrl` (optional) a link for users to donation to show appreciation and support plugin development.

`main.js`

- This is the main entry point of your plugin.
- Import any Obsidian API using `require('obsidian')`
- Import NodeJS or Electron API using `require('fs')` or `require('electron')`
- Must export a default class which extends `Plugin`
- Must bundle all external dependencies into this file, using Rollup, Webpack, or another javascript bundler.

### App Architecture

##### The app is organized into a few major modules:

- `App`, the global object that owns everything else. You can access this via `this.app` inside your plugin. The `App` interface provides accessors for the following interfaces.
- `Vault`, the interface that lets you interact with files and folders in the vault.
- `Workspace`, the interface that lets you interact with panes on the screen.
- `MetadataCache`, the interface that contains cached metadata about each markdown file, including headings, links, embeds, tags, and blocks.

##### Additionally, by inheriting `Plugin`, you can:
- Add a ribbon icon using `this.addRibbonIcon`.
- Add a status bar (bottom) element using `this.addStatusBarItem`.
- Add a global command, optionally with a default hotkey, using `this.addCommand`.
- Add a plugin settings tab using `this.addSettingTab`.
- Register a new kind of view using `this.registerView`.
- Save and load plugin data using `this.loadData` and `this.saveData`.

##### Registering events

For registering events from any event interfaces, such as `App` and `Workspace`, please use `this.registerEvent`, which will automatically detach your event handler when your plugin unloads:
```
this.registerEvent(app.on('event-name', callback));
```

If you register DOM events for elements that persist on the page after your plugin unloads, such as `window` or `document` events, please use `this.registerDomEvent`:
```
this.registerDomEvent(element, 'click', callback);
```

If you use `setInterval`, please use `this.registerInterval`:
```
this.registerInterval(setInterval(callback, 1000));
```
