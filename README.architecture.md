# Architecture Guide

## Project Structure
- `src/entry.ts` - Plugin entry point
- `src/ui/` - Svelte UI components and views
- `src/ui/tasks/` - Task model, store, and actions
- `src/parsing/` - Parsing utilities (tags, kebab case)
- `src/ui/settings/` - Settings store and configuration
- `specs/` - Design documents (tracked in git)
- `tmp_specs/` - Temporary planning artifacts (gitignored)

## System Architecture

This plugin follows a modular architecture with clear separation between parsing, UI, and business logic layers.

### Core Components

**Plugin Entry** (`src/entry.ts`)
- Main plugin class extending Obsidian's Plugin
- Handles view registration and file menu integration
- Manages plugin lifecycle and workspace events

**View Layer** (`src/ui/`)
- `text_view.ts`: Main view controller extending TextFileView
- `main.svelte`: Primary Svelte component for the kanban interface
- Component-based UI with reactive stores for state management

**Task Management** (`src/ui/tasks/`)
- `task.ts`: Core Task model with parsing and serialization
- `store.ts`: Reactive task store with file system integration
- `actions.ts`: Task manipulation operations (move, archive, delete)

**Parsing Layer** (`src/parsing/`)
- `kebab/`: String normalization utilities for consistent naming
- `tags/`: Tag extraction and processing from task content

**Configuration** (`src/ui/settings/`)
- Settings store with reactive updates
- Column management and color configuration
- Scope and filtering preferences

### Data Flow

```
Obsidian Files → File System Events → Task Parsing → Reactive Stores → Svelte UI
                     ↓                                    ↑
                 Task Actions ← User Interactions ← UI Components
```

**File Monitoring**: The plugin watches for file changes using Obsidian's vault events and automatically updates the task store when markdown files are modified.

**Task Parsing**: Raw markdown content is parsed using regex patterns to identify task strings, extract metadata (tags, status, indentation), and create Task objects.

**State Management**: Svelte stores provide reactive state management, automatically updating the UI when tasks or settings change.

**Bidirectional Sync**: Changes made in the kanban UI are serialized back to the original markdown files, maintaining consistency between the kanban view and file content.

### Key Design Patterns

- **Observer Pattern**: File system events trigger task store updates
- **Brand Types**: Type-safe string validation for markers and identifiers
- **Reactive Stores**: Svelte-based state management for UI consistency
- **Command Pattern**: Task actions encapsulate operations for undo/redo support
