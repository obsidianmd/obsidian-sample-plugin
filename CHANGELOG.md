# Changelog

All notable changes to the Summarize This plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive JSDoc documentation throughout the codebase
- TypeScript strict mode with enhanced type safety
- ESLint configuration with TypeScript 5 support and naming conventions
- Dedicated `styles.css` file for better style organization
- CHANGELOG.md to track version history
- Lint scripts (`npm run lint` and `npm run lint:fix`)
- Package metadata (keywords, repository info, author)

### Changed
- Updated TypeScript from 4.7.4 to 5.3.3
- Updated esbuild from 0.17.3 to 0.20.1
- Updated @types/node from 16.11.6 to 20.11.16
- Updated @typescript-eslint packages from 5.29.0 to 7.0.1
- Updated tslib from 2.4.0 to 2.6.2
- Enhanced TypeScript configuration with stricter compiler options
- Improved error handling throughout the plugin
- Updated package.json description to be more descriptive
- Improved code structure and organization

### Fixed
- Type safety issues by adding proper return type annotations
- Missing explicit function return types
- Improved null checks and error handling

## [0.1.0] - 2024-XX-XX

### Added
- Initial release of Summarize This plugin
- Integration with local Ollama LLM server
- Customizable prompt modal with preset templates
- Real-time streaming of summaries to notes
- Support for multiple Ollama models
- Settings tab for server configuration
- Editor context menu integration
- Command palette support
- Cancel generation functionality
- Preset prompt templates (Default Summary, Extract Tasks, Key Points, Simplify)
- Example prompts for user guidance

### Features
- **AI-Powered Summarization**: Generate intelligent summaries using local LLM models
- **Customizable Prompts**: Full control over how summaries are generated
- **Real-time Streaming**: Watch summaries appear in your notes as they're generated
- **Model Selection**: Choose from any installed Ollama model
- **Privacy-First**: All processing happens locally on your machine
- **User-Friendly UI**: Modern, intuitive interface with preset options

[Unreleased]: https://github.com/agileresearchservices/obsidian-sample-plugin/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/agileresearchservices/obsidian-sample-plugin/releases/tag/v0.1.0
