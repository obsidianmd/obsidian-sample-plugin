# AutoArchive Fleeting Notes Plugin for Obsidian

A simple plugin that automatically moves notes from your Fleeting folder to Archive folder after a specified period.

## Features

- **Automatic Archiving** - Notes in your Fleeting folder will be moved to Archive folder after a set number of days
- **Configurable Paths** - Customize both source and destination folders
- **Custom Threshold** - Set how many days should pass before a note gets archived
- **Auto Run Option** - Choose whether the plugin runs automatically on Obsidian startup
- **Manual Trigger** - Use the command palette to manually archive notes when needed

## How to Use

1. Install the plugin from Obsidian's Community Plugins
2. Enable the plugin in Settings > Community Plugins
3. Configure the plugin settings:
   - Fleeting Folder - The folder containing your fleeting notes
   - Archive Folder - Where notes will be moved to
   - Days Threshold - Number of days after creation before a note is archived
   - Auto Run on Startup - Toggle automatic archiving when Obsidian starts

## Installation

### From Obsidian Community Plugins

1. Open Obsidian Settings
2. Go to Community Plugins and turn off Restricted Mode
3. Click Browse and search for "AutoArchive Fleeting Notes"
4. Install and enable the plugin

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release
2. Create a folder called `auto-archive-fleeting-notes` in your vault's `.obsidian/plugins/` directory
3. Copy the downloaded files into this folder
4. Enable the plugin in Obsidian's settings

## How It Works

The plugin checks the creation date of each note in your Fleeting folder. This date can be:
- A `created` field in the note's frontmatter
- The file's creation timestamp if no frontmatter is present

When a note is older than the specified threshold, it's moved to the Archive folder, preserving any subfolder structure.

## Development

- Clone this repository
- Run `npm i` to install dependencies
- Run `npm run dev` to start compilation in watch mode
- Copy the compiled files to your vault's `.obsidian/plugins/auto-archive-fleeting-notes/` folder

## Support

If you find this plugin useful, consider:
- Star the repository on GitHub
- Report bugs by creating issues
- Submit pull requests for improvements

## License

[MIT](LICENSE)