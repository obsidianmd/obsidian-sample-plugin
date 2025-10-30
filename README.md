# Summarize This - Obsidian Plugin

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Obsidian](https://img.shields.io/badge/Obsidian-Plugin-purple.svg)](https://obsidian.md/)

**Summarize This** is a powerful Obsidian plugin that generates AI-powered summaries of your notes using a local Ollama LLM server. Keep your data private while leveraging the power of large language models for intelligent note summarization.

## ✨ Features

- **🤖 AI-Powered Summarization**: Generate intelligent summaries using state-of-the-art local LLM models
- **🎨 Customizable Prompts**: Full control over how summaries are generated with a beautiful, modern UI
- **📝 Preset Templates**: Quick-start templates for common tasks:
  - Default Summary - Comprehensive overview with key points
  - Extract Tasks - Pull out all action items and todos
  - Key Points - Bullet-point highlights
  - Simplify - Make complex content easy to understand
- **⚡ Real-time Streaming**: Watch summaries appear in your notes as they're generated
- **🎯 Model Selection**: Choose from any installed Ollama model
- **🔒 Privacy-First**: All processing happens locally on your machine - your notes never leave your computer
- **🎛️ Easy Configuration**: Simple settings interface with connection testing
- **⏸️ Cancel Anytime**: Stop generation mid-stream if needed

## 📋 Prerequisites

Before using this plugin, you need to have Ollama installed and running on your system:

1. **Install Ollama**: Download from [ollama.ai](https://ollama.ai)
2. **Pull a Model**: Run `ollama pull gpt-oss:latest` (or your preferred model)
3. **Start Ollama**: The server should be running at `http://localhost:11434`

### Recommended Models

- **gpt-oss:latest** - Great balance of speed and quality (default)
- **llama3.2:latest** - Excellent for summarization
- **mistral:latest** - Fast and efficient

## 🚀 Installation

### From the Community Plugin List (Coming Soon)
1. Open Obsidian and navigate to `Settings > Community Plugins`
2. Search for "Summarize This" and click `Install`
3. Enable the plugin in the `Installed Plugins` section

### Manual Installation
1. Download the latest release from [GitHub Releases](https://github.com/agileresearchservices/obsidian-sample-plugin/releases)
2. Extract the files to your vault's `.obsidian/plugins/summarize-this/` folder
3. Reload Obsidian and enable the plugin in `Settings > Community Plugins`

## 📖 Usage

### Basic Usage

1. **Open a note** in Obsidian
2. **Trigger the command** in one of three ways:
   - Command palette: `Cmd/Ctrl + P` → "Summarize This Note"
   - Right-click in the editor → "Summarize This Note"
   - Use a custom hotkey (configure in Settings)
3. **Customize the prompt** or select a preset template
4. **Click "Generate Summary"** and watch the summary appear in real-time

### Using Preset Templates

The plugin includes four preset templates to get you started:

- **📝 Default Summary**: Comprehensive overview with key themes and conclusions
- **✅ Extract Tasks**: Automatically pulls out all action items and todos
- **🔑 Key Points**: Quick bullet-point highlights of important information
- **✨ Simplify**: Rewrites complex content in plain, easy-to-understand language

### Custom Prompts

Click on the prompt text area to write your own custom instructions. Examples:

- "Create a timeline of events mentioned in this document"
- "Extract all the names and dates mentioned"
- "Summarize this in 3 sentences or less"
- "List all the questions that need to be answered"

### Canceling Generation

If you need to stop the summary generation:

1. Click the "Cancel" link in the notification
2. The partial summary will be saved with a cancellation note

## ⚙️ Configuration

### Settings

Access plugin settings via `Settings > Summarize This`:

1. **Local Server URL**: The URL where Ollama is running (default: `http://localhost:11434`)
2. **Default Model**: The Ollama model to use (default: `gpt-oss:latest`)
3. **Available Models**: Click "Refresh Models" to see all installed models

### Testing Your Connection

1. Go to plugin settings
2. Click the checkmark button next to the Server URL field
3. You'll see a success message with the Ollama version if connected properly

## 🛠️ Development

### Prerequisites

- Node.js v20 or higher
- npm or yarn
- Ollama installed and running

### Setup

```bash
# Clone the repository
git clone https://github.com/agileresearchservices/obsidian-sample-plugin.git
cd obsidian-sample-plugin

# Install dependencies
npm install

# Start development mode (watches for changes)
npm run dev

# Run linter
npm run lint

# Fix linting issues automatically
npm run lint:fix
```

### Project Structure

```
obsidian-sample-plugin/
├── main.ts              # Main plugin code
├── styles.css           # Plugin styles
├── manifest.json        # Plugin metadata
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
├── .eslintrc            # ESLint configuration
├── esbuild.config.mjs   # Build configuration
└── README.md            # This file
```

### Building for Production

```bash
npm run build
```

This creates an optimized `main.js` file ready for distribution.

### Code Quality

The project uses:

- **TypeScript 5.3** with strict mode enabled
- **ESLint** with TypeScript-specific rules
- **Comprehensive JSDoc** comments throughout
- **Type safety** with explicit return types

## 🐛 Troubleshooting

### Common Issues

**"No active file to summarize"**
- Make sure you have a note open in the editor before running the command

**"Connection failed"**
- Verify Ollama is running: `ollama serve`
- Check the server URL in plugin settings
- Test the connection using the checkmark button

**"No models found"**
- Install a model: `ollama pull gpt-oss:latest`
- Click "Refresh Models" in plugin settings

**Summary is slow or incomplete**
- Try a smaller/faster model
- Check your system resources
- Ensure Ollama has access to GPU (if available)

**Error messages in console**
- Enable Developer Tools: `Cmd/Ctrl + Shift + I`
- Check the Console tab for detailed error messages
- Report issues on GitHub with the error details

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Report Bugs**: Open an issue on [GitHub](https://github.com/agileresearchservices/obsidian-sample-plugin/issues)
2. **Suggest Features**: Share your ideas in the discussions
3. **Submit PRs**: Fork the repo, make your changes, and submit a pull request
4. **Improve Documentation**: Help make the docs clearer and more comprehensive

### Development Guidelines

- Follow the existing code style
- Add JSDoc comments to new functions
- Test your changes thoroughly
- Update the CHANGELOG.md

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- Built with the [Obsidian API](https://github.com/obsidianmd/obsidian-api)
- Powered by [Ollama](https://ollama.ai)
- Inspired by the amazing Obsidian community

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/agileresearchservices/obsidian-sample-plugin/issues)
- **Discussions**: [GitHub Discussions](https://github.com/agileresearchservices/obsidian-sample-plugin/discussions)
- **Author**: Kevin M. Butler

---

Made with ❤️ for the Obsidian community
