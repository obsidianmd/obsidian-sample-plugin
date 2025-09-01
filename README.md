# Task List Kanban

The Task List Kanban is a free and open source Obsidian plugin that automatically imports all your 'tasks' within Obsidian files into a kanban view. This plugin was created to reduce duplication of effort when managing and prioritising tasks. Simply note down tasks using the 'task' format in any Obsidian file, and they will automatically appear in your Task List Kanban.

By adding tags to your tasks using '#', you can allocate tasks to specific columns in your kanban, as well as add additional tags for filtering. From the kanban view, you can easily move tasks between columns, archive tasks, apply or change filters, and even jump straight to the file where the task sits. Any change made to a task from the kanban view will also update the task in its file, and vice versa.

![Task List Kanban Screenshot](https://github.com/ErikaRS/task-list-kanban/assets/80379257/ddde01aa-3098-4cfc-8860-6af34f0ece57)

## Getting Started

### Creating Your First Kanban

Right click on the folder in which you want your Task List Kanban to appear. Choose 'New kanban'. Your new Task List Kanban file has been created!

![Creating a new kanban](https://github.com/ErikaRS/task-list-kanban/assets/80379257/fbe25c3f-824f-4feb-b1b3-5acbdf1c8901)

### Adding Tasks

Create a 'task' in any Obsidian file. Tasks will automatically appear in your kanban under the 'Uncategorised' column. To assign a task to a specific column:

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

**Filtering**: Use the filter bar at the top of the kanban to show only tasks with specific tags. You can select multiple tags.

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
