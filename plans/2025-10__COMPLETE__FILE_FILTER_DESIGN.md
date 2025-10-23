# File Filter Feature Design
Status: COMPLETE

## Feature Request Summary
Users want to filter tasks by which file they're sourced from. The kanban aggregates tasks from multiple files across the vault, and users need a way to show only tasks from specific source files. For example, a user might want to see only tasks from "periodic/2025-05-02.md" or "meeting-notes.md".

**Issue:** [#54](https://github.com/ErikaRS/task-list-kanban/issues/54)

## User Requirements
1. Filter tasks by the source file they're defined in (stored in `task.path`)
2. Autocomplete on available source file paths as user types
3. File filter should work in conjunction with existing content and tag filters (AND logic)
4. Act consitently with other filters
    1. File filter values should persist across board reopen 
    2. Support saving file filters (same as other filters)
    3. Clear button to remove the file filter 

---

## High-Level Design

### UI Changes

#### File Filter Box
```
┌─────────────────────────────────────────┐
│ Filter by file:                         │
│                                         │
│ > Saved filters                         │  ← Collapsible section
│   • "meeting-notes"                 [×] │  ← Active filter shown in bold + accent color
│   • "project-tasks"                 [×] │
│   • "daily-log"                     [×] │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Type to search files... [Save][Clear]│ │  ← Native input with inline action buttons
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**File Filter Behavior:**
- **UI Layout**: Matches content filter (saved filters → input with inline buttons)
- **Autocomplete**: Native `<datalist>` dropdown shows file paths matching the current prefix
  - Autocomplete sources: All unique source file paths from all tasks on the board (from `task.path`)
  - Sorted alphabetically by file path (e.g., ["a.md", "b.md", "a/b.md"] not ["a.md", "a/b.md", "b.md"])
  - Shows full path (e.g., "periodic/2025-05-02.md" or "meeting-notes.md")
- **Saved filters section**: Collapsible `<details>` section showing saved file filters
  - Each filter is clickable to load that file filter
  - Active filter (currently in use) shown in **bold + accent color**
  - Each filter has a [×] delete button with confirmation
- **Inline action buttons**: [Save] and [Clear] buttons positioned on the right inside the input box
  - **Save button**: Disabled when input is empty or filter already exists
  - **Clear button**: Disabled when filter is empty
- **Single file only**: Only one file can be filtered at a time (simplified UX)

### Data Model

```typescript
interface FileValue {
  filepaths: string[];  // Full paths to source files (e.g., ["periodic/2025-05-02.md"])
                        // NOTE: Currently only one file at a time, but array supports future multi-file OR logic
}

interface SavedFilter {
  id: string;                    // UUID for saved filter
  content?: ContentValue;        // Content filter (optional)
  tag?: TagValue;                // Tag filter (optional)
  file?: FileValue;              // File filter (optional) - NEW
}

interface SettingValues {
  // ... existing fields ...
  savedFilters?: SavedFilter[];
  lastContentFilter?: string;
  lastTagFilter?: string[];
  lastFileFilter?: string[];     // Last used file filter paths - NEW (currently always length 1)
}
```

**Design notes:**
- Follows same pattern as `ContentValue` and `TagValue`
- Stores full paths as shown in UI (e.g., ["periodic/2025-05-02.md"])
- Array structure supports future multi-file filtering without data migration
- **Current implementation**: UI only allows one file at a time (array length always 1)
- Separate `FileValue` type allows future metadata extensions

**File Source:**
- Files are the source files where tasks are defined (stored in `task.path`)
- Each task has a `path` property containing the full file path
- Collected from ALL tasks on the board, regardless of filter state
- File matching is case-insensitive and substring-based (allows partial matches)

---

## Detailed Behavior

### 1. File Filter Logic

**Filtering:**
- Filter operates on `task.path` (the source file path where the task is defined)
- Matches if `task.path` contains the filter string (case-insensitive)
- File filter ANDs with content and tag filters (all must match)

**Example:**
- Task defined in file: `periodic/2025-05-02.md`
- Task content: `- [ ] Review meeting notes`
- `task.path` = "periodic/2025-05-02.md"
- Filter "periodic" → Match ✓
- Filter "2025-05" → Match ✓
- Filter "meeting-notes" → No match ✗ (not in the path)

### 2. Autocomplete File Collection

**Available files:**
- Collected from ALL tasks on the board using `task.path`
- Files collected regardless of current filter state (not just visible tasks)
- Deduplicated and sorted alphabetically by file path
- Shown in autocomplete dropdown 

**Why all tasks:** More predictable UX - autocomplete options don't change based on other filters

**Example board:**
```
Todo:
- [ ] Task 1 (from periodic/2025-05-02.md)
- [ ] Task 2 (from meeting-notes.md)
- [ ] Task 3 (from periodic/2025-05-02.md)  <- duplicate, shown once

Available files: ["meeting-notes.md", "periodic/2025-05-02.md"]
```

### 3. Using Saved File Filters

**Selection behavior:**
- Clicking saved filter loads the filename into the input
- Filter is applied immediately
- Active filter shown in **bold + accent color**
- Autocomplete datalist still works for editing

**State tracking:**
- Auto-detects when current file filter exactly matches a saved filter
- Highlights the matching saved filter in the list

### 4. Saving File Filters

**Save Button Behavior:**
- Always visible (stable layout)
- Disabled when:
  - Input is empty
  - Filter already exists (exact basename match)
- Enabled when there's a new file filter to save

**Save Flow:**
1. User types filename in input (with autocomplete assistance)
2. User clicks "Save" button
3. Filter saved immediately with UUID
4. Appears in saved filters list
5. Current filter auto-detected as active
6. Persisted to frontmatter

### 5. Deleting Saved File Filters

**Delete behavior:**
- Same as content/tag filters
- [×] button in saved filters section
- Confirmation modal required
- If active filter is deleted, filtering continues but "Using saved" indicator removed

### 6. Clear Button

**Clear behavior:**
- Clears the file filter input
- Removes file filtering (shows all tasks, subject to other filters)
- Button disabled when filter already empty
- Positioned inline next to Save button

### 7. Persistence

**On board close/save:**
- Persist all `savedFilters` (including file filters) to frontmatter
- Persist current file filter value to `lastFileFilter`

**On board open/load:**
- Load `savedFilters` from frontmatter
- Restore `lastFileFilter` value into input
- Auto-detect if restored value matches any saved filter

**Storage location:**
```yaml
---
kanban_plugin: '{"columns":[...],"savedFilters":[{"id":"uuid-1","file":{"filepaths":["meeting-notes.md"]}},{"id":"uuid-2","content":{"text":"review"},"file":{"filepaths":["periodic/2025-05-02.md"]}}],"lastFileFilter":["periodic/2025-05-02.md"]}'
---
```

**Note:** Array always contains exactly one element in current implementation.

---

## Implementation Plan

**Strategy:** Implement as testable vertical slices - each phase delivers a working, testable feature increment.

### Phase 1: Basic File Filtering (Manual Input) ✅ COMPLETE
**Goal:** User can type a file path and filter tasks by it - working end-to-end

1. ✅ Add `fileFilter` state variable (string)
2. ✅ Add basic file filter UI (text input + [Clear] button)
3. ✅ Implement file filtering logic in `applyFilters` (substring match on `task.path`)
4. ✅ Wire up Clear button
5. ✅ Test: Type "periodic", verify only tasks from periodic folder are shown
6. ✅ Test: Clear filter, verify all tasks return

**Deliverable:** Working file filter that accepts manual text input and filters tasks

**Implemented by:** [67f37e6](https://github.com/ErikaRS/task-list-kanban/commit/67f37e6)

---

### Phase 2: Autocomplete Support ✅ COMPLETE
**Goal:** User gets autocomplete suggestions for available file paths

1. ✅ Add logic to collect available files from ALL tasks using `task.path`
2. ✅ Deduplicate and sort files alphabetically by file path
3. ✅ Add `<datalist>` to file filter input with available files
4. ✅ Wire up datalist to state
5. ✅ Test: Type partial path, verify autocomplete dropdown shows matching files
6. ✅ Test: Select from autocomplete, verify filter applies correctly

**Deliverable:** File filter with autocomplete assistance

**Implemented by:** [34608c7](https://github.com/ErikaRS/task-list-kanban/commit/34608c7)

---

### Phase 3: Persistence ✅ COMPLETE
**Goal:** File filter value persists across board close/reopen

1. ✅ Add `lastFileFilter?: string[]` to `SettingValues` type
2. ✅ Update `parseSettingsString` to handle `lastFileFilter`
3. ✅ Update `toSettingsString` to persist `lastFileFilter`
4. ✅ Persist `lastFileFilter` to frontmatter on board save
5. ✅ Load `lastFileFilter` from frontmatter on board open
6. ✅ Restore file filter input on board open
7. ✅ Test: Set file filter, close/reopen board, verify filter persists

**Deliverable:** File filter value survives board reopen

**Implemented by:** [5b6230d](https://github.com/ErikaRS/task-list-kanban/commit/5b6230d)

---

### Phase 4: Save & Load Filters ✅ COMPLETE
**Goal:** User can save file filters and load them from saved list

1. ✅ Add `FileValue` interface with `filepaths: string[]` to settings types
2. ✅ Add `file?: FileValue` to `SavedFilter` interface
3. ✅ Update `parseSettingsString` and `toSettingsString` to handle `SavedFilter.file`
4. ✅ Add [Save] button to file filter input
5. ✅ Wire up Save button to create new `SavedFilter` with `FileValue` (single-element array)
6. ✅ Add saved filters collapsible section above input
7. ✅ Display saved file filters in section (show file path as button text)
8. ✅ Implement click to load saved filter
9. ✅ Add `activeFileFilterId` state and auto-detect/highlight active filter
10. ✅ Update disabled state logic for Save button (when empty or exists)
11. ✅ Test: Add filter, verify it appears in saved section
12. ✅ Test: Click saved filter, verify it loads into input and applies
13. ✅ Test: Close/reopen board, verify saved filters persist

**Deliverable:** Working save/load for file filters

**Implemented by:** [59d5272](https://github.com/ErikaRS/task-list-kanban/commit/59d5272)

---

### Phase 5: Delete Filters & Polish ✅ COMPLETE
**Goal:** Complete feature with delete functionality and UX refinements

1. ✅ Add [×] button to each saved file filter
2. ✅ Reuse existing delete confirmation modal
3. ✅ Wire up delete logic for file filters
4. ✅ Handle edge case: deleting active filter (clears active ID, filtering continues with current input)
5. ✅ Add proper ARIA labels for accessibility (`aria-label` on all buttons and inputs)
6. ✅ Polish styling to match content/tag filters (inline buttons, active highlighting with bold + accent color)
7. ✅ Fix TypeScript type errors in file sorting and delete logic
8. ✅ Test: Delete saved filter, verify it's removed
9. ✅ Test: Delete active filter, verify filtering continues but active indicator removed
10. ✅ Test: Full workflow from adding to deleting filters

**Deliverable:** Production-ready file filter feature with delete functionality

**Implemented by:** 
- [59d5272](https://github.com/ErikaRS/task-list-kanban/commit/59d5272) - Initial delete functionality
- Type safety improvements and polish in current session

---

## Future Enhancements (Out of Scope)

1. **Multiple File Filters (OR logic)**: Allow filtering by multiple files at once
   - UI: Multi-select dropdown or tag-style input (like tag filter)
   - Logic: Match if `task.path` matches ANY selected file
   - Data model: Already supports arrays - just update UI and filtering logic to handle multiple values

2. **Exact Path Matching**: Toggle between substring and exact match
   - Currently substring matching allows filtering by folder or partial path
   - Exact match would require full path match
   - UI: Checkbox or toggle for "Exact match only"

3. **Combined Filters**: Save content + tag + file filters together
   - Already supported by data model (all three can exist on one `SavedFilter`)
   - Needs UI updates to show combined filters in saved section
   - Display format: "content: 'review' | tags: frontend, ui | file: periodic/2025-05-02.md"

4. **Folder-only Filtering**: Dedicated UI for filtering by folder
   - UI: Folder selector/autocomplete separate from file filter
   - Logic: Match if `task.path.startsWith(folderPath + '/')`
   - More intuitive than substring matching for folder filtering

5. **Exclude File Filter**: Inverse filter to hide tasks from specific files
   - UI: Toggle between "Include" and "Exclude" mode
   - Logic: Invert the match condition

---

## Technical Notes

### Source File Tracking
The plugin tracks which file each task comes from:
- **Location**: `src/ui/tasks/task.ts` (line 310-312)
- Each Task object has a `path` property: `readonly _path: string`
- Path is set during task construction from `fileHandle.path` parameter
- Path is the full file path relative to the vault (e.g., "periodic/2025-05-02.md")
- Path is displayed in the UI when `showFilepath` setting is enabled

### Task Structure
```typescript
class Task {
  private readonly _path: string;
  
  get path(): string {
    return this._path;
  }
  
  // Task is displayed with path in footer when showFilepath is true
}
```

### Matching Strategy
- **Substring matching**: "periodic" matches "periodic/2025-05-02.md"
- **Case-insensitive**: "PERIODIC" matches "periodic/2025-05-02.md"
- **Full path**: Match against complete `task.path` string
- **Supports folder paths**: Can filter by folder (e.g., "periodic" matches all files in periodic folder)

### Performance Considerations
- File collection is memoized (runs on board data change)
- Filtering uses Set for O(1) lookup
- Autocomplete datalist is native browser feature (fast)
- Expected number of files: <100 per board (small dataset)

### Edge Cases
1. **All tasks have source files**: Every task has a `task.path` (required during construction)
2. **Deleted source files**: Tasks from deleted files still show with their original path until task is removed
3. **Renamed source files**: Tasks from renamed files will update automatically when file monitoring picks up changes
4. **Case sensitivity**: All matching is case-insensitive
5. **Folder filtering**: Filtering by "periodic" will match all files in the periodic folder

### Accessibility
- ARIA labels on all buttons and inputs
- Keyboard navigation support (Tab, Enter, Escape)
- Clear focus indicators
- Screen reader announcements for filter changes
