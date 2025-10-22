# Saved Filters Feature Design
State: IN PROGRESS

## Feature Request Summary
Users want to save their filter configurations (both content and tag filters) so they persist across kanban board reopening. Currently, filters reset every time a board is closed and reopened.

**Issue:** [#51](https://github.com/ErikaRS/task-list-kanban/issues/51)

## User Requirements
1. Filters should be saveable but not auto-saved
2. Saved filters should appear in a collapsible section above the input
3. Input boxes should remain directly editable with autocomplete from saved filters
4. The last used filter values should persist on restart (whether saved or not)
5. Users can save new filter configurations
6. Users can delete saved filters they no longer need

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

interface SettingValues {
  // ... existing fields ...
  savedFilters?: SavedFilter[];
  lastContentFilter?: string;    // Last used content filter text
  lastTagFilter?: string[];      // Last used tag filter values
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

### 3. Editing Filters

**Current behavior:**
- Users can manually edit filter values at any time
- The active filter indicator updates if the new values match a different saved filter
- If values don't match any saved filter, no filter is highlighted as active
- Users can save the current filter values as a new saved filter using the Add button

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
- Persist current filter values (content text and selected tags) to frontmatter

**On board open/load:**
- Load `savedFilters` from frontmatter
- Load and restore last used filter values (both content and tags)
- Auto-detect if restored values match any saved filter (highlight if so)

**Storage location:**
```yaml
---
kanban_plugin: '{"columns":["todo","in-progress","done"],...,"savedFilters":[{"id":"uuid-1","tag":{"tags":["frontend","ui"]}},{"id":"uuid-2","content":{"text":"bug report"}}],"lastContentFilter":"bug","lastTagFilter":["frontend","ui"]}'
---
```

---

## Implementation Plan

**Strategy:** Build end-to-end vertical slices, getting basic functionality working before adding complexity.

### Phase 1: Basic Add & Load (Content Filters Only) ✅ COMPLETE
**Goal:** User can save a content filter and reload it from dropdown

1. ✅ Add `SavedFilter`, `ContentValue`, `TagValue` types to settings store
2. ✅ Update `parseSettingsString` and `toSettingsString` to handle `savedFilters` array
3. ✅ Add state to track saved filters in main.svelte
4. ✅ Add simple [Add] button below content filter input (visible when text entered)
5. ✅ Implement Add logic: create new SavedFilter, add to list, persist to frontmatter
6. ✅ Modify content filter dropdown to show saved filters (just text, no [×] yet)
7. ✅ Implement selection: clicking saved filter loads it into input
8. ✅ Test: Add filter, close/reopen board, verify it persists

**Deliverable:** Working save/load for content filters

**Implemented by:** [99a67b6](https://github.com/ErikaRS/task-list-kanban/commit/99a67b6)

### Phase 2: Extend to Tag Filters ✅ COMPLETE
**Goal:** Same Add & Load functionality for tag filters

1. ✅ Add [Add] button below tag filter input
2. ✅ Wire up Add logic for tag filters (create SavedFilter with TagValue)
3. ✅ Show saved tag filters in tag filter dropdown
4. ✅ Implement selection for tag filters
5. ✅ Test: Add tag filter, close/reopen board, verify it persists

**Deliverable:** Working save/load for both content and tag filters

**Implemented by:** [99a67b6](https://github.com/ErikaRS/task-list-kanban/commit/99a67b6)

### Phase 3: Track Active Filter State ✅ COMPLETE
**Goal:** Highlight active filter when current values match a saved filter

1. ✅ Add `activeContentFilterId` and `activeTagFilterId` state
2. ✅ Auto-detect when current filter values match any saved filter
3. ✅ Highlight matching saved filter in the saved filters list (bold + accent color)
4. ✅ Test: Load filter, verify it's highlighted; manually type matching values, verify highlight

**Deliverable:** User can see which saved filter (if any) matches current values

**Implemented by:** [1bebe7d](https://github.com/ErikaRS/task-list-kanban/commit/1bebe7d), [4eb05ba](https://github.com/ErikaRS/task-list-kanban/commit/4eb05ba)

### Phase 4: Filter Persistence on Reload ✅ COMPLETE
**Goal:** Remember last used filter values across board close/reopen

1. ✅ Add `lastContentFilter` and `lastTagFilter` fields to settings
2. ✅ Update `toSettingsString` to persist current filter values on save
3. ✅ Update `parseSettingsString` to load persisted filter values
4. ✅ On mount, restore filter values from settings
5. ✅ Test: Set filters, close board, reopen, verify filters restored

**Deliverable:** Filters persist across board reloads

**Implemented by:** [8cd2091](https://github.com/ErikaRS/task-list-kanban/commit/8cd2091)

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
