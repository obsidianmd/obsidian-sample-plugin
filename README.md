# Summarize This Page Plugin for Obsidian

The **Summarize This Page** plugin allows users to generate summaries of their notes using a local Ollama LLM server. Customize prompts, extract key points, and simplify content directly within Obsidian.

## Features

- **Customizable Prompts**: Tailor the summary generation process with a user-friendly prompt editor.
- **Preset Prompts**: Use pre-defined prompts for common tasks like extracting tasks or simplifying text.
- **Streaming Summaries**: Real-time updates to your notes as summaries are generated.
- **Settings Tab**: Configure the local server URL for seamless integration.

## Installation

### From the Community Plugin List
1. Open Obsidian and navigate to `Settings > Community Plugins`.
2. Search for "Summarize This Page" and click `Install`.
3. Enable the plugin in the `Installed Plugins` section.

### Manual Installation
1. Download the latest release from the [GitHub Releases](https://github.com/your-repo-link/releases).
2. Copy `main.js`, `manifest.json`, and `styles.css` to your vault's `.obsidian/plugins/summarize-this-page/` folder.
3. Reload Obsidian and enable the plugin in `Settings > Installed Plugins`.

## Usage

1. Open a note in Obsidian.
2. Use the command palette (`Cmd/Ctrl + P`) and search for "Summarize This Note".
3. Customize the prompt in the modal or use a preset.
4. Click "Generate Summary" to append the summary to your note.

## Development

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/your-repo-link.git
   cd summarize-this-page
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Make changes to `main.ts` or other files. Changes will automatically compile.

### Build for Production
Run the following command to generate an optimized `main.js`:
```bash
npm run build
```

## Releasing a New Version

1. Update `manifest.json` with the new version number and minimum Obsidian version.
2. Update `versions.json` with the new version and its compatibility.
3. Run the version bump script:
   ```bash
   npm version patch
   ```
4. Push changes and create a new release on GitHub.

## Troubleshooting

- **Error: No active file to summarize**: Ensure a note is open before running the command.
- **Connection issues**: Verify the local server URL in the plugin settings.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request on [GitHub](https://github.com/your-repo-link).

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.

## Support

If you find this plugin useful, consider supporting its development:
- [Buy Me a Coffee](https://buymeacoffee.com)
- [GitHub Sponsors](https://github.com/sponsors)

## API Documentation

For more details on the Obsidian API, visit the [official documentation](https://github.com/obsidianmd/obsidian-api).
