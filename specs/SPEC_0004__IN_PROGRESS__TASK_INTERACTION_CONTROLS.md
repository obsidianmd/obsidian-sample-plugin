# Task Interaction Controls Design
Status: IN_PROGRESS

## Feature Request Summary
Users need quick access to common task actions directly from the kanban card view. This consolidates multiple feature requests into a cohesive interaction model:

**Issues:**
- [#62](https://github.com/ErikaRS/task-list-kanban/issues/62) - Move task to Done with checkbox
- [#64](https://github.com/ErikaRS/task-list-kanban/issues/64) - Bulk movement of tasks between columns
- [#12](https://github.com/ErikaRS/task-list-kanban/issues/12) - Quick move to Done without using menu
- [#7](https://github.com/ErikaRS/task-list-kanban/issues/7) - Click to navigate to task in file

## User Requirements
1. Move tasks to Done without using the menu (quick checkbox action)
2. Navigate to task location in file with single click
3. Select multiple tasks for bulk operations
4. Move selected tasks to different columns in bulk
5. Move multiple tasks to Done in bulk
6. Keep card design clean and not make entire card clickable
7. Maintain streamlined UX consistent with existing plugin design

---

## High-Level Design

### UI Changes

#### Task Card with Action Bar
```
┌─────────────────────────────────────────────┐
│                                         ⋮   │ ← Quick actions bar: menu
│ ─────────────────────────────────────────── │
│ ☑ Test                    #gtd             │ ← Task row: checkbox (mode-dependent), title, tags
│ ─────────────────────────────────────────── │
│ ↗ periodic/2025-05-01.md                   │ ← File path with go-to-file
└─────────────────────────────────────────────┘
```

**Card Structure:**
- **Top row (Quick actions bar)**: Three-dot menu (right)
- **Second row (Task row)**: Mode-dependent checkbox (left) + task title/tags (right)
- **Bottom row**: Go-to-file arrow + file path (clickable)

**Mode-Dependent Checkbox:**

The checkbox on each task changes based on the column's current mode:

1. **Mark-Done Mode (Default):**
   - **Icon Shape**: Circle (`lucide-circle` / `lucide-circle-check`)
   - **Function**: Marks task as complete and moves to Done column
   - **Visual**: Accent color on hover, opacity 0.5 default
   - **Size**: 18px

2. **Selection Mode (When Enabled):**
   - **Icon Shape**: Square (`lucide-square` / `lucide-check-square`)
   - **Function**: Selects task for bulk operations
   - **Visual**: Matches mark-done circle outline color and weight
   - **Size**: 18px (same as mark-done for visual consistency)

**Visual Reinforcement:**
- Shape change (circle → square) makes mode switch obvious
- Only one checkbox visible at a time reduces clutter
- Mode toggle at column level makes intent clear

**Icon Design Notes:**
- Icons should be subtle but discoverable (light gray, darken on hover)
- Icons use Obsidian's built-in icon library (lucide icons)
- Adequate touch target size (24px minimum for touch targets, even if icon is smaller)
- Spacing between icons for easy clicking

#### Column Header with Mode Toggle
```
┌─────────────────────────────────────────────┐
│ Today                                       │
│ [Select]                                    │ ← Mode toggle (off by default), left-aligned
└─────────────────────────────────────────────┘

When selection mode is ON:
┌─────────────────────────────────────────────┐
│ Today                                       │
│ [Select]                                    │ ← Mode toggle (on), left-aligned
│ 2 selected                                  │ ← Count of selected tasks
│ [Move to...▼] [Done]                       │ ← Bulk action buttons
└─────────────────────────────────────────────┘
```

**Mode Toggle:**
- Located under column name, left-aligned
- Toggle button with "Select" label
- Flat design (no shadows, gradients, or 3D effects)
- **Off (Default)**: Light background, subtle border, text in muted color
- **On**: Accent background color, white text, no border
- Toggle state is per-column (each column can be in different mode)
- Rounded rectangle shape (consistent with kanban card styling)

**Visual Style:**
- Uses rounded rectangles (moderate border-radius, not overly round)
- Follows existing task list kanban button conventions
- Flat, modern appearance
- Clear visual distinction between on/off states

**Bulk Actions Visibility:**
- Hidden when selection mode is off
- Appears when selection mode is on AND tasks are selected
- Shows count of selected tasks
- Actions apply only to selected tasks in that column

**Bulk Action Buttons:**
- **Move to...** - Dropdown menu listing all columns (excluding current column)
- **Done** - Moves all selected tasks to Done column (quick action)

**Per-Column State:**
- Each column has its own mode toggle
- Each column tracks its own selection state
- Bulk actions only affect tasks selected within that specific column

### Data Model

No new data model changes required. Uses existing:
- Task model for completion status
- Settings model for column configuration
- Obsidian API for file navigation

### Interaction Flows

#### 1. Move Task to Done
**User Action:** Click checkmark icon on task card

**Behavior:**
- Task is marked complete in file (checkbox updated to `[x]`)
- Current column label tag is removed from task (good hygiene)
- Task will display in Done column automatically
- No confirmation needed (quick action)

#### 2. Navigate to Task
**User Action:** Click arrow icon on task card

**Behavior:**
- Opens the file containing the task
- Scrolls to and highlights the task line
- Uses Obsidian's `workspace.openLinkText()` API
- Opens in existing pane or new pane based on Obsidian settings

#### 3. Bulk Task Selection
**User Action:** Click checkbox on task card

**Behavior:**
- Checkbox toggles between unchecked ☐ and checked ☑
- Selected state persists until:
  - User manually deselects
  - Bulk action is performed
  - Column filter changes (clears selection)
  - Board is closed/reopened (selection is ephemeral, not persisted)
- Bulk action bar appears at top of column
- Count updates to show number of selected tasks

#### 4. Bulk Move Tasks
**User Action:** Click "Move to..." dropdown and select column

**Behavior:**
- All selected tasks in that column move to target column
- Tasks updated in their respective files (checkbox state preserved)
- Selection automatically cleared after move
- Bulk action bar disappears
- Brief success indicator (e.g., toast notification)

#### 5. Bulk Move to Done
**User Action:** Click "Done" button

**Behavior:**
- All selected tasks marked complete in files (checkbox updated to `[x]`)
- Current column label tags removed from all selected tasks
- Tasks will display in Done column automatically
- Selection automatically cleared after action
- Bulk action bar disappears
- Brief success indicator (e.g., toast notification)

---

## Detailed Behavior

### Icon Specifications

**Lucide Icons to Use:**
- Bulk-select checkbox: `lucide-square` (unchecked), `lucide-check-square` (checked)
- Mark done: `lucide-circle` (unchecked), `lucide-circle-check` (checked)
- Go to file: `lucide-external-link` or `lucide-arrow-up-right`
- Three-dot menu: `lucide-more-vertical` (existing)

**Icon Styling:**
- **Bulk-select checkbox:**
  - Size: 14px
  - Default opacity: 0.4
  - Hover state: `opacity: 0.7`
  - Touch target: 24px (padding around icon)
- **Mark-done checkbox:**
  - Size: 16-18px
  - Default opacity: 0.5
  - Hover state: `opacity: 1` + accent color
  - Touch target: 24px
- **Go-to-file icon:**
  - Size: 16-18px
  - Default opacity: 0.5
  - Hover state: `opacity: 1` + accent color
  - Touch target: 24px

### Accessibility

**Keyboard Navigation:**
- Tab through cards and action buttons
- Space/Enter to activate buttons
- Arrow keys to navigate between cards
- Shift+Space to multi-select cards

**Screen Readers:**
- ARIA labels on all icon buttons with descriptive tooltips
- `aria-label="Select for bulk actions"` on bulk-select checkbox
- `aria-label="Move to Done"` on mark-done checkbox
- `aria-label="Go to file"` on navigation icon
- `aria-live="polite"` region for selection count
- `role="toolbar"` on bulk action bar
- Visual tooltips match ARIA labels for consistency

### Edge Cases

**1. Move to Done - Task Already Complete:**
- If task is already marked complete (`[x]`), no action taken
- Optional: Could toggle back to incomplete if clicked again (requires discussion)

**2. Bulk Move - Target Column Doesn't Exist:**
- Shouldn't happen (dropdown only shows existing columns)
- If column deleted mid-operation, show error and don't move tasks

**3. Selection Persistence:**
- Selection is NOT persisted to settings (ephemeral state)
- Cleared on filter change, board close, or after bulk action
- Prevents confusion from stale selections

**4. Bulk Action on Filtered View:**
- Bulk actions only affect visible, selected tasks
- Hidden tasks (by filter) are never affected even if previously selected

---

## Implementation Plan

**Strategy:** Build individual actions first, then add bulk selection. Each phase delivers testable functionality.

### Phase 1: Card Layout Restructure ✅ COMPLETE
**Goal:** Prepare card layout to accommodate new action controls

1. ✅ Examine current card component structure (TaskCard.svelte or similar)
2. ✅ Add quick actions bar at top of card layout
3. ✅ Restructure task row to accommodate mark-done checkbox
4. ✅ Style both bars with proper spacing and icon sizing
5. ✅ Add icon rendering utilities for lucide icons
6. ✅ Test: Verify layout works with various task content lengths

**Deliverable:** Card layout ready for action buttons

**Implemented by:** [1c3cb40](https://github.com/ErikaRS/task-list-kanban/commit/1c3cb40)

### Phase 2: Move to Done Action ✅ COMPLETE
**Goal:** Users can click checkmark to move tasks to Done

1. ✅ Add mark-done icon button to task row
2. ✅ Implement click handler that updates task checkbox in file to `[x]`
3. ✅ Remove current column label tag from task
4. ✅ Verify task appears in Done column after update
5. ✅ Test: Click checkmark, verify file updated and task displays in Done column

**Deliverable:** Working quick move-to-done functionality with toggle support

**Implemented by:** [2d40c23](https://github.com/ErikaRS/task-list-kanban/commit/2d40c23)

**Additional features implemented:**
- Toggle functionality: clicking done tasks unchecks them and moves back to original column
- Fixed bug preventing tasks from being dragged from done column
- Flat hover effect with accent color (no 3D styling)

### Phase 3: Navigate to File Action ✅ COMPLETE
**Goal:** Users can click arrow or file name to navigate to task in file

1. ✅ Add go-to-file icon button to bottom section (next to file name)
2. ✅ Reuse existing taskActions.viewFile() functionality from menu
3. ✅ Make both icon and file name text clickable
4. ✅ Test: Click arrow and file name, verify file opens and scrolls to task

**Deliverable:** Working navigation from card to file

**Implemented by:** [ad3e145](https://github.com/ErikaRS/task-list-kanban/commit/ad3e145)

**Design Change:** Icon placed in footer section next to file name (not in quick actions bar) for better UX

### Phase 4: Selection Mode Toggle ✅ COMPLETE
**Goal:** Users can toggle columns into selection mode

1. ✅ Add mode toggle button to column header (under column name, right-aligned)
2. ✅ Create selection mode state store (Map<columnTag, boolean>)
3. ✅ Implement toggle handler to switch between mark-done and selection modes
4. ✅ Update task checkbox to change shape based on column mode (circle vs square)
5. ✅ Test: Toggle mode, verify checkboxes change from circles to squares

**Deliverable:** Column mode toggle working with visual checkbox feedback

**Implemented by:** [10be9dc](https://github.com/ErikaRS/task-list-kanban/commit/10be9dc)

### Phase 5: Task Selection in Selection Mode
**Goal:** Users can select individual tasks when in selection mode

1. ⬜ Create task selection state store (Map<taskId, boolean>)
2. ⬜ Update checkbox click handler to select/deselect when in selection mode
3. ⬜ Add visual selected state to task card (checkmark in square)
4. ⬜ Display selection count in column header when tasks selected
5. ⬜ Test: Toggle to selection mode, select tasks, verify state and count

**Deliverable:** Tasks can be selected in selection mode with visual feedback

### Phase 6: Bulk Action Buttons
**Goal:** Display and wire up bulk action controls

1. ⬜ Add bulk action bar component to column header (below mode toggle)
2. ⬜ Show/hide bar based on selection mode AND selection count
3. ⬜ Add Move to... dropdown with available columns (excluding current column)
4. ⬜ Add Done button
5. ⬜ Test: Select tasks, verify buttons appear and are clickable

**Deliverable:** Bulk action UI appears when in selection mode with tasks selected

### Phase 7: Bulk Operations Implementation
**Goal:** Implement bulk move and bulk done functionality

1. ⬜ Implement bulk move logic (Move to... dropdown)
2. ⬜ Update all selected task files (preserve checkbox state)
3. ⬜ Implement bulk move to Done handler (Done button)
4. ⬜ Update all selected task files (mark checkboxes as `[x]`)
5. ⬜ Clear selection and exit selection mode after action
6. ⬜ Add success notification
7. ⬜ Test: Select multiple tasks, use both Move to... and Done buttons

**Deliverable:** Complete bulk operations functionality

### Phase 8: Polish & Accessibility
**Goal:** Refinements, edge cases, and accessibility

1. ⬜ Add ARIA labels to all interactive elements
2. ⬜ Implement keyboard navigation (Tab, Space, Enter)
3. ⬜ Add focus indicators
4. ⬜ Test with screen reader
5. ⬜ Handle all edge cases (missing columns, filtered views, etc.)
6. ⬜ Add hover states and animations
7. ⬜ Test: Full accessibility audit

**Deliverable:** Production-ready, accessible task interaction controls

---

## Alternative Designs Considered

### Alternative 1: Floating Action Bar (Rejected)
Actions appear in a floating bar on hover over card.

**Rejected because:**
- Hover states don't work on touch devices
- Reduces discoverability
- Can be disruptive to scrolling

### Alternative 2: Entire Card Clickable for Navigation (Rejected)
Clicking anywhere on card navigates to file.

**Rejected because:**
- Prevents other interactions (selection, completion)
- User feedback explicitly requested non-clickable cards
- Reduces flexibility for future features

### Alternative 3: Global Bulk Actions (Rejected)
Single bulk action bar applies to all selected tasks across all columns.

**Rejected because:**
- Confusing UX when tasks selected in multiple columns
- Difficult to communicate which tasks will be affected
- Per-column actions are more intuitive

---

## Future Enhancements (Out of Scope)

1. **Keyboard Shortcuts**: Quick keys for common actions (e.g., `Cmd+D` to move to Done)
2. **Drag to Select**: Click and drag to select multiple tasks
3. **Select All**: Button to select all tasks in column
4. **Custom Quick Actions**: User-configurable action buttons per board
5. **Undo**: Undo last bulk action
6. **Task Preview**: Hover tooltip showing full task content
7. **Bulk Archive/Delete**: If users request it, could add these as bulk actions with appropriate safeguards
