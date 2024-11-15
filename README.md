# Obsidian-flavor Markdown texts to LINE-flavor messages

The goal of this plugin is to convert Obsidian-flavored Markdown texts to messages based on LINE Messenger Chat message formats. 

## Simple texts conversions

Here are some supported Obsidian-flavored Markdown texts:

1. **bold**
2. *italic*
3. ~~strike~~
4. ==emphasize==
5. `quote`
6. - [ ] unchecked
7. - [x] checked
8. # heading1
9. ## heading2 

According the reference source in [Formatting chat messages](
"https://help.line.me/line/desktop/categoryId/50000280/3/pc?lang=en&contentId=20013876"), it will convert them into:

1. {*bold*}
2. {_italic_}
3. {~strike~}
4. {`emphasize`}
5. {{quote}}
6. {🟩} unchecked
7. {✅} checked
8. 【 heading1  】
9. ▋heading2

The "{xxx}" should be replaced with a space character. For example, the "{*bold}" should be the " *bold* ".

## Hierarchical Numbering List

If we have list texts like this:

%%%
1. itemA
	1. ia1
	2. ia2
2. itemB
	1. ib1
	2. ib2
3. itemC
	1. ic1
	2. ic2
		1. ic21
%%%

Or this:

%%%
- itemA
	- ia1
	- ia2
- itemB
	- ib1
	- ib2
- itemC
	- ic1
	- ic2
		- ic21
%%%

It will convert the list to hierarchical numbering list:

%%%
1. itemA
1.1 ia1
1.2 ia2
2. itemB
2.1 ib1
2.2 ib2
3. itemC
3.1 ic1
3.2 ic2
3.2.1ic21
%%%

Each item in hierarchical list should be on a new line without any indents.


## Adding your plugin to the community plugin list

- Check the [plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines).
- Publish an initial version.
- Make sure you have a `README.md` file in the root of your repo.
- Make a pull request at https://github.com/obsidianmd/obsidian-releases to add your plugin.

## Manually installing the plugin

- Copy over `main.js`, `styles.css`, `manifest.json` to your vault `VaultFolder/.obsidian/plugins/your-plugin-id/`.

## Funding URL

You can include funding URLs where people who use your plugin can financially support it.

The simple way is to set the `fundingUrl` field to your link in your `manifest.json` file:

```json
{
    "fundingUrl": "https://buymeacoffee.com"
}
```
