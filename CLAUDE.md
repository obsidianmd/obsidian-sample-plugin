# MOC System Plugin

## Overview

This is a custom Obsidian plugin designed to automate and streamline a MOC (Map of Content) based note-taking system. The plugin focuses on efficiency by providing context-aware commands and automatic organization of notes into a hierarchical structure.

## Goals

The primary goal of this plugin is to automate the user's MOC-based system for organizing notes in Obsidian, with these specific objectives:

1. **Single-command note creation** - One keyboard shortcut handles all note creation needs based on context
2. **Dynamic content organization** - MOCs only show sections that contain content, maintaining clean and minimal structure
3. **Efficient prompt management** - Specialized system for managing LLM prompts with versioning and multi-chat link support
4. **Automated maintenance** - Auto-cleanup of broken links and automatic folder structure creation

## System Design

### File Organization Structure

- **Top-level MOCs**: Created in vault root directory
- **Sub-MOCs**: Stored in `MOCs/` folder
- **Notes**: Stored in `Notes/` folder  
- **Resources**: Stored in `Resources/` folder
- **Prompts**: Stored in `Prompts/` folder (includes both hubs and iterations)

### MOC Structure

MOCs are identified by the `#moc` tag in their frontmatter. They start empty and dynamically display only the sections that contain content, in this fixed order:

1. MOCs (sub-MOCs)
2. Notes
3. Resources  
4. Prompts

### Prompt System

The prompt system is designed for iterative LLM conversations:

- **Prompt Hub**: Main note for a prompt topic (e.g., `AI Assistant.md`)
  - Contains links to all iterations
  - Includes `llm-links` code block for storing chat URLs
- **Iterations**: Individual versions (e.g., `AI Assistant v1.md`, `AI Assistant v2 - Added error handling.md`)
  - Can be duplicated from any version
  - Automatically increments to next available version number
  - Optional description can be added to title

## Features

### 1. Context-Aware Creation Command
**Command**: "Create MOC or add content"

- When not in a MOC: Creates a new top-level MOC
- When in a MOC: Shows modal with options to create:
  - Sub-MOC
  - Note
  - Resource
  - Prompt

### 2. Prompt Iteration Duplication
**Command**: "Duplicate prompt iteration"

- Works when viewing any prompt iteration file
- Creates copy with next version number
- Shows modal for optional description
- Updates the prompt hub automatically

### 3. Multi-Link Opening
**Command**: "Open all LLM links"

- Works when viewing a prompt hub
- Parses `llm-links` code block
- Opens all URLs in new browser tabs

### 4. Automatic Features

- **Folder Structure**: Creates required folders on plugin load
- **Section Management**: Adds sections to MOCs only when first item is created
- **Link Cleanup**: Removes broken links when files are deleted

## Implementation Details

### Core Architecture

The plugin extends Obsidian's Plugin class with these key components:

```typescript
export default class MOCSystemPlugin extends Plugin {
    // Main plugin class
}
```

### Key Methods

#### Content Creation Methods
- `createMOC()`: Creates top-level MOC with frontmatter tags
- `createSubMOC()`: Creates MOC in MOCs/ folder and links from parent
- `createNote()`: Creates note in Notes/ folder and links from parent MOC
- `createResource()`: Creates resource in Resources/ folder and links from parent
- `createPrompt()`: Creates prompt hub with first iteration and LLM links block

#### Section Management
- `addToMOCSection()`: Intelligently adds links to MOC sections
  - Creates section if it doesn't exist
  - Maintains proper section ordering
  - Inserts links at appropriate position

#### Prompt System
- `duplicatePromptIteration()`: 
  - Parses filename to extract base name and version
  - Finds highest existing version number
  - Creates new file with incremented version
  - Updates prompt hub with new iteration link
- `updatePromptHub()`: Adds new iteration links to hub file
- `openLLMLinks()`: Extracts URLs from code block and opens in browser

#### Maintenance
- `cleanupBrokenLinks()`: Removes references to deleted files
- `ensureFolderStructure()`: Creates required folders if missing

### File Detection Methods
- `isMOC()`: Checks for `#moc` tag in frontmatter
- `isPromptIteration()`: Detects files with version pattern (v1, v2, etc.)
- `isPromptHub()`: Identifies prompt files that aren't iterations

### Modal Dialogs

The plugin includes several custom modals for user input:

1. **CreateMOCModal**: For creating new top-level MOCs
2. **AddToMOCModal**: Shows options when adding content to existing MOC
3. **CreateItemModal**: Generic input for creating notes/resources/etc.
4. **PromptDescriptionModal**: Optional description when duplicating prompts

### Event Handling

- Registers file deletion event to trigger automatic link cleanup
- Uses command callbacks to check active file context
- Implements keyboard shortcuts (Enter key) in all modals

## Technical Decisions

1. **Frontend-only approach**: All logic in main.ts, no settings or complex state management
2. **Tag-based MOC identification**: Uses frontmatter tags instead of naming conventions for flexibility
3. **Dynamic sections**: Sections only appear when needed, keeping MOCs clean
4. **Regex-based parsing**: For version detection and link patterns
5. **Batch link opening**: Uses window.open() in a loop for multi-link functionality

## Current Status

The plugin has been fully implemented with all requested features:
- ✅ Context-aware creation command
- ✅ Prompt iteration system with versioning
- ✅ Multi-link opening for LLM chats
- ✅ Dynamic section management
- ✅ Automatic link cleanup
- ✅ Folder structure creation

The plugin has been built and is ready for testing in Obsidian.

## History

*Initial implementation completed in first session - no previous history*