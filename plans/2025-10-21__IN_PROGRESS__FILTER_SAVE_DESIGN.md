# Saved Filters Feature Design
State: IN PROGRESS

## Feature Request Summary
Users want to save their filter configurations (both content and tag filters) so they persist across kanban board reopening. Currently, filters reset every time a board is closed and reopened.

**Issue:** [#51](https://github.com/ErikaRS/task-list-kanban/issues/51)

## User Requirements
1. Filters should be saveable but not auto-saved
2. Saved filters should appear in a dropdown menu in the same input boxes
3. Input boxes should remain directly editable (hybrid input/dropdown approach)
4. The last used saved filter should persist on restart
5. Editing a saved filter should not auto-update it
6. Saving an edited filter creates a new saved filter (non-destructive)
7. Users can delete saved filters they no longer need

---

## High-Level Design

### UI Changes

#### Content Filter Box
```
┌─────────────────────────────────────────┐
│ Filter by content:                      │
│                                         │
│ > Saved filters                         │  ← Collapsible section
│   • "frontend"                      [×] │  ← Active filter shown in bold + accent color
│   • "bug report"                    [×] │
│   • "review"                        [×] │
│                                         │
│   [Add]                                 │  ← Add button (always visible, disabled when empty/exists)
│ ┌─────────────────────────────────────┐ │
│ │ Type to search...                   │ │  ← Native input with datalist autocomplete
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Content Filter Behavior:**
- **UI order**: Saved filters → Add button → Input (prevents datalist dropdown from covering buttons)
- **Prefix typing autocomplete**: While typing, native `<datalist>` dropdown shows saved filters matching the current prefix
  - Datalist is read-only (no delete buttons in autocomplete dropdown)
  - Selecting from datalist populates the input immediately
- **Saved filters section**: Collapsible `<details>` section above the input shows ALL saved filters
  - Each filter is a clickable button that populates the input
  - Active filter (currently in use) shown in **bold + accent color**
  - Each filter has a [×] delete button
- **Add button**: Always visible but disabled (grayed out) when input is empty or filter already exists

#### Tag Filter Box
```
┌─────────────────────────────────────────┐
│ Filter by tag:                          │
│                                         │
│ > Saved filters                         │  ← Collapsible section
│   • frontend, ui                    [×] │  ← Active filter shown in bold + accent color
│   • bug, urgent                     [×] │
│   • docs                            [×] │
│                                         │
│   [Add]                                 │  ← Add button (always visible, disabled when empty/exists)
│ ┌─────────────────────────────────────┐ │
│ │ [frontend] [x]  [bug] [x]        ▼  │ │  ← Multi-select dropdown (svelte-select)
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Tag Filter Behavior:**
- **UI order**: Saved filters → Add button → Select (matches content filter layout)
- **Multi-select dropdown**: Uses `svelte-select` component for selecting multiple tags
- **Saved filters section**: Collapsible `<details>` section above the select
  - Each filter is a clickable button that loads those tags
  - Active filter (currently in use) shown in **bold + accent color**
  - Each filter has a [×] delete button
- **Add button**: Always visible but disabled (grayed out) when no tags selected or filter already exists

### Data Model

```typescript
interface ContentValue {
  text: string;
}

interface TagValue {
  tags: string[];
}

interface SavedFilter {
  id: string;                    // UUID for saved filter
  content?: ContentValue;        // Content filter (optional)
  tag?: TagValue;                // Tag filter (optional)
}

interface FilterState {
  savedFilters: SavedFilter[];
  activeContentFilter: {
    savedFilterId?: string;      // ID if loaded from saved
    currentValue: string;        // Current filter text
  };
  activeTagFilter: {
    savedFilterId?: string;      // ID if loaded from saved
    currentValue: string[];      // Current selected tags
  };
}
```

**Design notes:**
- `SavedFilter` has separate `content` and `tag` fields to support future combined filters
- Both fields are optional, but at least one must be set
- Separate `ContentValue` and `TagValue` types allow future metadata extensions
- Display text is auto-generated from filter values (no user-provided names)

**Storage and limits:**
- Stored in the kanban board's frontmatter alongside existing `kanban_plugin` settings
- **No hard limit on number of saved filters**
- Expected typical usage: <10 filters per board
- JSON is compact, so even 50+ filters shouldn't cause issues
- If frontmatter size becomes problematic in practice, can migrate to separate storage file
- Alternative considered: Hard limit of 50 filters with warning - rejected as premature optimization

---

## Detailed Behavior

### 1. Using Saved Filters

**When user selects a saved filter from list or types exact match:**
- Filter is applied immediately
- Input box shows the saved filter's value
- The saved filter ID is tracked internally
- Active filter shown in **bold + accent color** in the saved filters list

**State tracking:**
- Auto-detects when current filter values exactly match any saved filter
- Works whether filter is clicked from list OR typed/selected manually
- Active filter visually highlighted in saved filters list (when expanded)

### 2. Saving Filters

**Add Button Behavior:**
- Always visible (provides stable layout)
- Disabled (grayed out) when:
  - Content filter: input is empty OR filter already exists
  - Tag filter: no tags selected OR filter already exists
- Enabled when there's a new filter to save

**Add Flow:**
1. User clicks "Add" button (when enabled)
2. Filter is immediately saved (no modal)
3. System creates new `SavedFilter` with:
   - Unique ID (UUID)
   - Current filter value(s)
4. Filter appears in saved filters list immediately
5. Current filter is auto-detected as active and highlighted
6. Persisted to frontmatter automatically

**Display in Dropdown:**
- Content filters: Show the search text in quotes (e.g., `"frontend"`)
- Tag filters: Show comma-separated tag list (e.g., `frontend, ui, bug`)
- Sorted alphabetically by filter text

**Duplicate Handling:**
- If exact same filter already exists, do not create a duplicate
- No duplicate filters with identical values

### 3. Editing Saved Filters

**Note:** Phase 4 feature - not yet implemented. Current behavior:
- Modifying a saved filter clears its active state
- User can save the modified filter as a new saved filter using Add button
- Replace functionality to update existing filters planned for Phase 4

### 4. Deleting Saved Filters

**Location:**
- Delete functionality ONLY available in the "Saved filters" collapsible section
- NOT available in the datalist autocomplete dropdown (content filter)
- Each saved filter in the collapsible section has a [×] button on the right

**Delete behavior:**
- Clicking [×] opens a confirmation modal
- Confirmation required because delete is destructive

**Delete confirmation modal:**
```
┌──────────────────────────────────────┐
│ Delete saved filter?                 │
├──────────────────────────────────────┤
│ "frontend"                           │
│                                      │
│     [Cancel]  [Delete]               │
└──────────────────────────────────────┘
```

Or for tag filters:
```
┌──────────────────────────────────────┐
│ Delete saved filter?                 │
├──────────────────────────────────────┤
│ frontend, ui                         │
│                                      │
│     [Cancel]  [Delete]               │
└──────────────────────────────────────┘
```

**Behavior after deletion:**
- Filter is removed from saved filters list immediately
- If the deleted filter was currently active:
  - Filtering continues with current values
  - "Using saved" indicator is removed
  - Filter is now treated as unsaved (shows [Add] button)
- Collapsible section remains open after deletion

### 5. Persistence

**On board close/save:**
- Persist all `savedFilters` to frontmatter
- Do NOT persist current filter values if they differ from saved

**On board open/load:**
- Load `savedFilters` from frontmatter
- Start with empty filters

**Storage location:**
```yaml
---
kanban_plugin: '{"columns":["todo","in-progress","done"],...,"savedFilters":[{"id":"uuid-1","tag":{"tags":["frontend","ui"]}},{"id":"uuid-2","content":{"text":"bug report"}}]}'
---
```

---

## Implementation Plan

**Strategy:** Build end-to-end vertical slices, getting basic functionality working before adding complexity.

### Phase 1: Basic Add & Load (Content Filters Only)
**Goal:** User can save a content filter and reload it from dropdown

1. Add `SavedFilter`, `ContentValue`, `TagValue` types to settings store
2. Update `parseSettingsString` and `toSettingsString` to handle `savedFilters` array
3. Add state to track saved filters in main.svelte
4. Add simple [Add] button below content filter input (visible when text entered)
5. Implement Add logic: create new SavedFilter, add to list, persist to frontmatter
6. Modify content filter dropdown to show saved filters (just text, no [×] yet)
7. Implement selection: clicking saved filter loads it into input
8. Test: Add filter, close/reopen board, verify it persists

**Deliverable:** Working save/load for content filters

### Phase 2: Extend to Tag Filters
**Goal:** Same Add & Load functionality for tag filters

1. Add [Add] button below tag filter input
2. Wire up Add logic for tag filters (create SavedFilter with TagValue)
3. Show saved tag filters in tag filter dropdown
4. Implement selection for tag filters
5. Test: Add tag filter, close/reopen board, verify it persists

**Deliverable:** Working save/load for both content and tag filters

### Phase 3: Track Active Filter State
**Goal:** Show "Using saved" indicator when filter is loaded

1. Add `activeContentFilter` and `activeTagFilter` state (track savedFilterId)
2. When filter selected from dropdown, track its ID
3. Show "Using saved" text when active filter matches saved filter
4. Test: Load filter, see "Using saved" indicator

**Deliverable:** User knows when they're using a saved filter

### Phase 4: Modified Filter Detection & Replace
**Goal:** Detect modifications and add Replace button

1. Detect when active filter values differ from saved filter values
2. Show "Modified from: {values} \*" status text
3. Add [Replace] button (alongside [Add]) when filter is modified
4. Implement Replace logic: update existing SavedFilter, persist
5. Test: Load filter, modify it, Replace, verify saved filter updated

**Deliverable:** Replace functionality working

### Phase 5: Delete Functionality
**Goal:** User can delete saved filters

1. Add [×] icon to each saved filter in dropdown
2. Create delete confirmation modal component
3. Wire up delete click → show modal → delete SavedFilter
4. Handle edge case: if deleted filter is active, clear "Using saved" indicator
5. Test: Delete active and inactive filters

**Deliverable:** Full CRUD operations on saved filters

### Phase 6: Polish
**Goal:** Refinements and UX improvements

1. Sort saved filters alphabetically
2. Handle duplicate detection (do not create duplicate)
3. Truncate long filter text in dropdown with ellipsis

**Deliverable:** Polished, production-ready feature

---

## Future Enhancements (Out of Scope)

1. **Filter Combinations**: Save content + tag + column filters together
2. **Filter History**: Recent filters (not just saved ones)
3. **Keyboard Shortcuts**: Quick keys for saving/loading filters (if users request)
4. **Filter Import/Export**: Export/import filters between boards
