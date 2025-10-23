# Saved Filters Feature Design
Status: COMPLETE

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
│ ┌─────────────────────────────────────┐ │
│ │ Type to search...      [Save] [Clear]│ │  ← Native input with inline action buttons
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Content Filter Behavior:**
- **UI order**: Saved filters → Input with inline action buttons
- **Prefix typing autocomplete**: While typing, native `<datalist>` dropdown shows saved filters matching the current prefix
  - Datalist is read-only (no delete buttons in autocomplete dropdown)
  - Selecting from datalist populates the input immediately
- **Saved filters section**: Collapsible `<details>` section above the input shows ALL saved filters
  - Each filter is a clickable button that populates the input
  - Active filter (currently in use) shown in **bold + accent color**
  - Each filter has a [×] delete button
- **Inline action buttons**: [Save] and [Clear] buttons positioned on the right inside the input box
- **Save button**: Disabled when input is empty or filter already exists
  - **Clear button**: Disabled when filter is empty

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
│ ┌─────────────────────────────────────┐ │
│ │ [frontend][x] [bug][x]  [Save][Clear]│ │  ← Multi-select with inline action buttons
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Tag Filter Behavior:**
- **UI order**: Saved filters → Select with inline action buttons (matches content filter layout)
- **Multi-select dropdown**: Uses `svelte-select` component for selecting multiple tags
- **Saved filters section**: Collapsible `<details>` section above the select
  - Each filter is a clickable button that loads those tags
  - Active filter (currently in use) shown in **bold + accent color**
  - Each filter has a [×] delete button
- **Inline action buttons**: [Save] and [Clear] buttons positioned on the right inside the select box
- **Save button**: Disabled when no tags selected or filter already exists
  - **Clear button**: Disabled when no tags are selected

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

**Save Button Behavior:**
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
- Users can save the current filter values as a new saved filter using the Save button

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
  - Filter is now treated as unsaved (shows [Save] button)
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
4. ✅ Add simple [Save] button below content filter input (visible when text entered)
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

### Phase 5: Delete Functionality ✅ COMPLETE
**Goal:** User can delete saved filters

1. ✅ Add [×] icon to each saved filter in dropdown
2. ✅ Create delete confirmation modal component
3. ✅ Wire up delete click → show modal → delete SavedFilter
4. ✅ Handle edge case: if deleted filter is active, clear "Using saved" indicator
5. ✅ Test: Delete active and inactive filters

**Deliverable:** Full CRUD operations on saved filters

**Implemented by:** [d206fda](https://github.com/ErikaRS/task-list-kanban/commit/d206fda)

### Phase 6: Polish ✅ COMPLETE
**Goal:** Refinements and UX improvements

1. ✅ **Clear button functionality**: Add clear button to both filter boxes
   - Content filter: Clear text input
   - Tag filter: Clear all selected tags
   - Button disabled when filter is already empty
2. ✅ **Inline action buttons**: Move Add and Clear buttons to the right side of filter input/select boxes
   - Use text buttons: "Add" and "Clear"
   - Position inside the input box border for both content and tag filters
   - Buttons should be compact with proper padding
   - Text labels for better clarity
3. ✅ **Layout improvements**:
   - Reduced filter box width to 3/4 of original (3fr 3fr 2fr grid)
   - Comfortable spacing between filter boxes (120px gap)
   - Increased padding in filter input boxes for better usability
4. ✅ **Visual refinements**:
   - Proper hover states for all interactive elements
   - Spacing and alignment of inline buttons
   - Collapsible sections have smooth transitions (0.15s ease)
5. ✅ **Accessibility**:
   - ARIA labels on all action buttons (Add, Clear, Delete, Load filter)
   - Descriptive ARIA labels that include filter names
   - `aria-pressed` state on active filter buttons
   - Proper `role` attributes on lists and dialog
   - Input properly linked to label with `id` and `for`
   - Keyboard navigation: Escape to close modal, Tab to cycle focus
   - Focus management: Modal auto-focuses delete button, traps focus within modal
   - Screen reader support: Proper semantic HTML and ARIA attributes
   - Fixed A11y build warnings by removing stopPropagation

**Deliverable:** Polished, production-ready feature with improved UX

**Implemented by:** [28c03e5](https://github.com/ErikaRS/task-list-kanban/commit/28c03e5)

---

## Future Enhancements (Out of Scope)

1. **Filter Combinations**: Save content + tag + column filters together
2. **Filter History**: Recent filters (not just saved ones)
3. **Keyboard Shortcuts**: Quick keys for saving/loading filters (if users request)
4. **Filter Import/Export**: Export/import filters between boards
