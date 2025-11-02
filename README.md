# Article Scraper for Obsidian

An Obsidian plugin that automatically extracts metadata from article URLs and creates formatted notes with comprehensive frontmatter.

## Features

-   🔗 **URL Scraping**: Paste any article URL to automatically extract metadata
-   📋 **Clipboard Support**: Quick command to scrape from clipboard
-   🎨 **Formatted Templates**: Creates notes with structured frontmatter and sections
-   🔧 **Customizable Settings**: Configure default values and folder locations
-   🌐 **Smart Extraction**: Intelligently extracts:
    -   Title
    -   Author
    -   Publication date
    -   Description
    -   Site name
    -   Word count
    -   And more!

## Usage

### Method 1: Command Palette

1. Open the Command Palette (`Cmd/Ctrl + P`)
2. Search for "Scrape article from URL"
3. Paste the article URL in the modal
4. Click "Scrape & Create Note"

### Method 2: From Clipboard

1. Copy an article URL to your clipboard
2. Open the Command Palette (`Cmd/Ctrl + P`)
3. Search for "Scrape article from clipboard URL"
4. The plugin will automatically fetch and create the note

### Method 3: Ribbon Icon

-   Click the link icon (🔗) in the left ribbon
-   Enter the URL in the modal

## Output Format

The plugin creates notes with the following structure:

```markdown
---
Published: "2025-11-02"
Title: Article Title
Author: Author Name
Rating:
Category:
    - Article
Topics:
Read_Status:
Overview: Article description
Source: Website Name
Date_Started: "2025-11-02"
Date_Finished:
URL: https://example.com/article
tags:
Note_Status: baby
Word_Count: 1500
---

#### Tags:

## Overview

Article description goes here...

## Quotes
```

## Settings

Configure the plugin in **Settings → Article Scraper**:

-   **Default Category**: Default category for scraped articles (default: "Article")
-   **Default Read Status**: Initial read status for new articles
-   **Default Note Status**: Default note status (default: "baby")
-   **Template Folder**: Folder where article notes will be created (leave empty for vault root)

## Installation

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release
2. Create a folder: `<vault>/.obsidian/plugins/obsidian-article-scraper/`
3. Copy the files into the folder
4. Reload Obsidian
5. Enable the plugin in Settings → Community Plugins

### Development Installation

1. Clone this repository into your vault's plugins folder:
    ```bash
    cd <vault>/.obsidian/plugins/
    git clone https://github.com/armanh3k/obsidian-article-scraper.git
    cd obsidian-article-scraper
    ```
2. Install dependencies:
    ```bash
    npm install
    ```
3. Build the plugin:
    ```bash
    npm run build
    ```
4. Reload Obsidian and enable the plugin

## Development

### Prerequisites

-   Node.js v16 or higher
-   npm

### Build Commands

-   `npm run dev` - Start development build with watch mode
-   `npm run build` - Production build

### Project Structure

```
src/
  settings.ts      # Settings interface and defaults
  types.ts         # TypeScript type definitions
  scraper.ts       # Article metadata extraction logic
  template.ts      # Note template generation
  modal.ts         # UI modal for URL input
  settingsTab.ts   # Plugin settings UI
main.ts            # Plugin entry point
```

## How It Works

The plugin uses Obsidian's built-in `requestUrl` API to fetch article content, then parses HTML to extract metadata from:

-   Open Graph tags (`og:title`, `og:description`, etc.)
-   Twitter Card tags
-   Standard HTML meta tags
-   Semantic HTML elements (`<article>`, `<time>`, etc.)

## Privacy & Network Usage

-   This plugin makes network requests only when you explicitly trigger article scraping
-   No data is collected or transmitted to third parties
-   All article data is fetched directly from the source URL you provide
-   The plugin works entirely offline after fetching article content

## Compatibility

-   Works on both desktop and mobile Obsidian
-   Requires Obsidian v0.15.0 or higher
-   No additional dependencies required

## Support

Found a bug or have a feature request? Please [open an issue](https://github.com/armanh3k/obsidian-article-scraper/issues) on GitHub.

## License

MIT License - see [LICENSE](LICENSE) file for details

## Credits

Built with the [Obsidian Plugin API](https://github.com/obsidianmd/obsidian-api)
