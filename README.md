# Task List Kanban

The Task List Kanban is a free and open source Obsidian plugin that automatically imports all your 'tasks' within Obsidian files into a kanban view. This plugin was created to reduce duplication of effort when managing and prioritising tasks. Simply note down tasks using the 'task' format in any Obsidian file, and they will automatically appear in your Task List Kanban.

By adding tags to your tasks using '#', you can allocate tasks to specific columns in your kanban, as well as add additional tags for filtering. From the kanban view, you can easily move tasks between columns, archive tasks, apply or change filters, and even jump straight to the file where the task sits. Any change made to a task from the kanban view will also update the task in its file, and vice versa.

![Task List Kanban Screenshot](https://github.com/ErikaRS/task-list-kanban/assets/80379257/ddde01aa-3098-4cfc-8860-6af34f0ece57)

## Getting Started

### Creating Your First Kanban

Right click on the folder in which you want your Task List Kanban to appear. Choose 'New kanban'. Your new Task List Kanban file has been created!

![Creating a new kanban](https://github.com/ErikaRS/task-list-kanban/assets/80379257/fbe25c3f-824f-4feb-b1b3-5acbdf1c8901)

### Adding Tasks

Create a 'task' in any Obsidian file. Tasks will automatically appear in your kanban under the 'Uncategorised' column. The plugin supports tasks standard Markdown task markers (`-`, `*`, and `+`).

To assign a task to a specific column:

1. **In the file**: Add `#[column-name]` to your task text
2. **In the kanban**: Drag and drop the task to the desired column

The `#[column-name]` text won't be visible in the kanban view, keeping your tasks clean!

### Basic Task Management

**Editing tasks**: Click any task text in the kanban view to edit it directly. Changes sync to the original file.

**Moving tasks**: Drag and drop between columns, or use the task's settings menu to select a column.

**Completing tasks**: Check the task checkbox or use the archive feature to mark tasks as done.

## Configuration

### Setting Up Columns

Access settings via the settings icon in the top right corner of your kanban.

**Basic Columns**: Add, edit, or remove columns in the 'Columns' section. Separate column names with commas.

**Column Colors**: Assign colors by adding hex codes after column names:
- `To Do(#FF5733)` - Standard hex format
- `In Progress(0x3498DB)` - Alternative hex format

⚠️ **Important**: Think carefully when naming columns. Changing a column name later will move associated tasks to 'Uncategorised' since tasks are linked to exact column names.

### Folder Scope

**This folder** (default): The kanban shows tasks from files in the same folder as the kanban file.

**Every folder**: The kanban shows tasks from your entire Obsidian vault.

Change this setting in the kanban's settings menu.

## Advanced Features

### Task Status Customization

**Done Status Markers**: Customize which characters mark tasks as completed. By default, tasks marked with 'x' or 'X' are considered done, but you can configure any combination of single character markers (including Unicode/emoji).

Examples:
- `xX` (default) - Recognizes `[x]` and `[X]` as done
- `xX✓` - Also recognizes `[✓]` as done
- `✅👍` - Use emoji markers

**Ignored Status Markers**: Configure characters that mark tasks to be completely ignored by the kanban. This is useful for cancelled or irrelevant tasks.

Examples:
- Leave empty (default) - All task-like strings are processed
- `-` - Tasks like `[−] Cancelled task` are ignored
- `-~` - Tasks with `[-]` or `[~]` are ignored
- `❌` - Tasks like `[❌] Not relevant` are ignored

### Tagging and Filtering

**Adding tags**: Add `#[tag-name]` anywhere in your task text. Tags appear in both the kanban and original files.

**Filtering**: Use the filter bar at the top of the kanban to show only tasks with specific tags or content. You can filter by:
- **Content**: Search for tasks containing specific text
- **Tags**: Select one or multiple tags to filter tasks

**Saved Filters**: Save frequently used filter combinations for quick access:
1. Set up your desired content and/or tag filters
2. Click the "Add" button next to the filter input
3. Your saved filters appear under "Saved filters" and can be activated with one click
4. Remove saved filters by clicking the ✕ button next to each one

![Saved filters feature](https://github.com/user-attachments/assets/7b57601d-9fdb-4ade-9472-881661840323)

**Tag consolidation**: Enable "Consolidate tags" in settings to move all non-column tags to the task footer for cleaner display.

### Advanced Task Management

**Archive tasks**: Use the task settings menu to archive completed tasks. This marks them as done and removes them from the active kanban while preserving them in the original file.

**Bulk operations**: The rightmost "Done" column has additional settings to quickly archive or delete all tasks in that column.

**Task formatting**: The plugin preserves original indentation and formatting when moving tasks between columns.

### Visibility Controls

**Uncategorised column**: Choose when to show tasks without column assignments:
- Hide when empty (default)
- Always show
- Never show

**Done column**: Control visibility of the completed tasks column with the same options.

## Development

### Prerequisites
- Node.js and npm
- Obsidian for testing

### Setup
1. Clone the repository
2. Run `npm install` to install dependencies
3. Run `npm run dev` to start development mode
4. Copy the built plugin to your Obsidian plugins folder for testing

For detailed Obsidian plugin development guidance, see the [official plugin development guide](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin).

### Testing
- Run `npm test` to execute the test suite
- The project includes comprehensive tests for task parsing, validation, and kanban functionality

### Deployment

When ready to make a new deployment:

1. Update the version number (using semver) in:
   - `package.json`
   - `manifest.json`
   - `versions.json`
2. Commit this change
3. Create and push a new tag:
   ```bash
   git tag -a 1.2.10 -m "1.2.10"
   git push origin 1.2.10
   ```
4. Push everything to GitHub
5. Wait for the GitHub Action to create a new Release
6. Go to the [releases page](https://github.com/ErikaRS/task-list-kanban/releases)
7. Edit the draft release to add release notes and publish

## Architecture

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

### Technology Stack

- **TypeScript**: Core language with strict type checking
- **Svelte**: Reactive UI framework for the kanban interface
- **Obsidian API**: File system integration and plugin framework
- **Vitest**: Testing framework for unit and integration tests
- **ESBuild**: Fast bundling for development and production builds
