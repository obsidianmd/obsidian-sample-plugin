# Column Width and Direction Configuration

Status: IN_PROGRESS

## Summary

This spec defines configurable column width and flow direction for the kanban board.

**Key Design Principle (Corrected)**:
- The width setting **always** controls the horizontal width of task cards (200-600px)
- Card height is **always** auto-calculated based on content (preserving current behavior)
- In vertical flows (top-to-bottom, bottom-to-top), columns maintain horizontal width but stack vertically
- This matches physical kanban board behavior and ensures cards remain readable in all orientations

**Initial Assumption (Incorrect)**: Originally assumed "width" would reinterpret as "height" in vertical flows. This was corrected based on verification that cards have auto-calculated height and should maintain readable horizontal width in all flows.

## Feature Request Summary

Add configuration options to customize the kanban board layout:
1. **Column Width**: Allow users to configure column widths (currently fixed at 300px)
2. **Flow Direction**: Support multiple column flow directions beyond the current left-to-right layout

This addresses user needs for:
- Better screen space utilization on ultrawide monitors
- Support for right-to-left languages and reading preferences
- Alternative vertical workflows (top-to-bottom, bottom-to-top)
- Improved accessibility and user preference accommodation

## User Requirements

1. Users shall be able to configure the width of task cards (currently fixed at 300px by column width)
2. Users shall be able to choose from multiple column flow directions:
   - Left-to-right (current default)
   - Right-to-left
   - Top-to-bottom
   - Bottom-to-top
3. Card width setting shall persist across sessions
4. Flow direction setting shall persist across sessions
5. Card width shall always control horizontal width regardless of flow direction
6. Card height shall remain auto-calculated based on content (current behavior)
7. Drag-and-drop functionality shall work correctly in all flow directions
8. The sidebar filter panel shall coexist properly with all flow directions
9. Configuration shall be accessible through the existing settings modal
10. Changes to width/direction shall apply immediately (no page refresh required)
11. Settings shall have sensible defaults and constraints to prevent unusable layouts

## High-Level Design

### Current State Analysis

**Column Layout** (`src/ui/components/column.svelte:315-320`):
```scss
.column {
  display: flex;
  flex-direction: column;
  width: 300px;           // Fixed width
  flex-shrink: 0;
  align-self: flex-start; // Height based on content
}
```

**Task Cards** (`src/ui/components/task.svelte`):
- **Width**: Fills column (currently 300px minus padding)
- **Height**: Auto-calculated based on content
  - `min-height: 1.5rem` on content preview (line 365)
  - `max-height: 160px` on embedded images (line 559)
  - Textarea dynamically resizes: `style.height = ${scrollHeight}px` (lines 195-196)

**Columns Container** (`src/ui/main.svelte:1009-1020`):
```scss
.columns {
  overflow-x: scroll;     // Horizontal scrolling
  > div {
    display: flex;        // Horizontal flexbox
    gap: var(--size-4-3);
  }
}
```

### Proposed Architecture

#### 1. Settings Store Extensions

Add new settings to `src/ui/settings/settings_store.ts`:

```typescript
export type FlowDirection = 'ltr' | 'rtl' | 'ttb' | 'btt';

export interface SettingValues {
  // ... existing settings
  columnWidth: number;              // default: 300, range: 200-600
  flowDirection: FlowDirection;     // default: 'ltr'
}
```

#### 2. Card Width Semantics (Corrected)

**Critical Design Principle**: The "width" setting **always** controls the horizontal width of task cards, regardless of flow direction.

| Flow Direction | Card width | Card height | Column arrangement | Scroll axis |
|----------------|-----------|-------------|-------------------|-------------|
| Left-to-right (ltr) | Configured (200-600px) | Auto (content) | Horizontal | X |
| Right-to-left (rtl) | Configured (200-600px) | Auto (content) | Horizontal (reversed) | X |
| Top-to-bottom (ttb) | Configured (200-600px) | Auto (content) | Vertical | Y |
| Bottom-to-top (btt) | Configured (200-600px) | Auto (content) | Vertical (reversed) | Y |

**Rationale**:
- Cards always need readable horizontal width (not stretched full-screen)
- Card height is always auto-calculated based on content (current behavior, preserved)
- In vertical flows, columns become horizontal "rows" that stack vertically
- Each column/row's height is determined by its tallest card + header controls
- This matches how physical kanban boards work when oriented vertically

#### 3. CSS Architecture (Corrected)

Use CSS custom properties and dynamic classes:

```scss
// main.svelte
.columns {
  &.flow-ltr > div {
    flex-direction: row;
    overflow-x: scroll;
    overflow-y: hidden;
  }

  &.flow-rtl > div {
    flex-direction: row-reverse;
    overflow-x: scroll;
    overflow-y: hidden;
  }

  &.flow-ttb > div {
    flex-direction: column;
    overflow-y: scroll;
    overflow-x: hidden;
  }

  &.flow-btt > div {
    flex-direction: column-reverse;
    overflow-y: scroll;
    overflow-x: hidden;
  }
}

// column.svelte
.column {
  width: var(--column-width);  // Always horizontal width
  align-self: flex-start;      // Height based on content

  // In vertical flows, columns stack but maintain horizontal width
  // No special height rules needed - align-self: flex-start ensures
  // column height auto-sizes to content (header + tasks + controls)
}
```

**Key difference from original design**: Column width is ALWAYS the horizontal dimension. In vertical flows, columns still have the configured horizontal width but auto-height (based on tallest card), not the reverse.

#### 4. Settings UI

Add to the settings modal (likely in the component that renders settings):

```
┌─────────────────────────────────────┐
│ Layout                              │
├─────────────────────────────────────┤
│ Column width: [300] (200-600)       │
│                                      │
│ Flow direction:                     │
│ ○ Left to right                     │
│ ○ Right to left                     │
│ ○ Top to bottom                     │
│ ○ Bottom to top                     │
└─────────────────────────────────────┘
```

## Detailed Behavior

### Corner Cases and Edge Conditions

#### 1. Vertical Flow with Narrow/Wide Cards
**Problem**: When columns flow top-to-bottom or bottom-to-top, what happens to column dimensions?

**Solution (Corrected)**:
- Card width setting (200-600px) controls horizontal width in ALL flow directions
- In vertical flows, columns maintain this horizontal width
- Column height is auto-calculated based on content (header + tallest task card + controls)
- The existing `align-self: flex-start` on columns ensures height auto-sizes correctly
- No special min-height rules needed - content naturally determines height
- Setting label can remain "Column width" or be clarified as "Card width"

#### 2. RTL Flow with Sidebar
**Problem**: Should the sidebar stay on the left in RTL mode, or move to the right?

**Solution**:
- **Keep sidebar on left** - The sidebar is a UI chrome element, not content
- Only reverse the column flow direction
- Users reading RTL languages typically expect UI controls to remain left-aligned in western-style applications
- If future user research shows different preference, make sidebar position separately configurable

#### 3. Drag and Drop in Reversed Flows
**Problem**: Drag-and-drop logic may assume left-to-right ordering when determining drop targets.

**Solution**:
- Current drag-and-drop uses column IDs, not positional logic (good!)
- Verify drop zones work correctly in all directions
- Test drop target highlighting in RTL and vertical flows
- Ensure visual feedback (opacity, borders) works in all orientations

#### 4. Very Wide or Very Tall Columns
**Problem**: Users might configure unusable dimensions.

**Constraints**:
- Minimum: 200px (maintains task card readability)
- Maximum: 600px (prevents single column dominating viewport)
- Default: 300px (current behavior)

#### 5. Keyboard Navigation
**Problem**: Arrow key navigation expectations change with flow direction.

**Solution (Verified)**:
- **Not an issue**: No arrow key navigation between columns is currently implemented
- Only keyboard handlers are Enter/Space for activating buttons/toggles
- If keyboard column navigation is added in the future, it should adapt to flow direction:
  - LTR/RTL: ← → keys move between columns
  - TTB/BTB: ↑ ↓ keys move between columns
- Current implementation verified: No Arrow key handlers exist in codebase

#### 6. Filter Sidebar in Vertical Flows
**Problem**: Vertical column flow with left sidebar creates complex layout.

**Current Layout**:
```
┌────────┬──────────────────────┐
│Sidebar │ Columns (→ scroll)   │
│        │                      │
└────────┴──────────────────────┘
```

**Vertical Flow Layout**:
```
┌────────┬──────────────────────┐
│Sidebar │ Columns              │
│        │    ↓                 │
│        │  scroll              │
│        │                      │
└────────┴──────────────────────┘
```

**Solution**: Works naturally - sidebar remains left, columns flow vertically in right panel.

#### 7. Task Card Layout in Vertical Flows
**Problem**: Task cards might look strange in vertical flow.

**Solution (Verified)**:
- Task cards work identically in all flow directions
- Card width is always controlled by column width (200-600px setting)
- Card height is always auto-calculated based on content (current behavior)
  - `min-height: 1.5rem` on content preview
  - `max-height: 160px` on embedded images
  - Textarea dynamically resizes to content
- No changes needed to task card layout

#### 8. Column Header and Controls in Vertical Flows
**Problem**: Column headers (title, mode toggle, actions) might need different layout in very tall columns.

**Solution**:
- Keep current header layout - it works well in any column dimension
- Mode toggle and count already use flexbox that adapts naturally

#### 9. "Add New" Button Positioning
**Problem**: "Add new" button position in different flows.

**Current Behavior (Verified)**:
- Button is at the **bottom of the task list** (after all tasks in the column)
- Located in column.svelte lines 297-308
- Appears after the `{#each sortedTasks}` loop

**Considerations**:
- In all flows, button remains at end of task list (consistent behavior)
- In vertical flows, columns are shorter (only as tall as tallest card + controls)
- No issue with button being off-screen since columns auto-size to content
- Keep current behavior - works well in all flow directions

#### 10. Empty Columns in Different Flows
**Problem**: Empty column appearance might differ across flow directions.

**Solution (Verified)**:
- Current `.tasks-wrapper` has `min-height: 50px` (column.svelte line 433)
- This ensures empty columns have visible drop zones
- Works in all flow directions:
  - Horizontal flows: 50px tall drop zone
  - Vertical flows: 50px tall drop zone (column width controlled by setting)
- Empty drop zones remain visible and usable in all directions

### Settings Persistence

Store in the kanban file's frontmatter (like existing settings):

```yaml
---
kanban-plugin: {"columnWidth": 300, "flowDirection": "ltr", ...}
---
```

### Validation Rules

1. **Column Width**:
   - Type: number
   - Range: 200-600 (inclusive)
   - Default: 300
   - Invalid values → fallback to default

2. **Flow Direction**:
   - Type: enum ('ltr' | 'rtl' | 'ttb' | 'btt')
   - Default: 'ltr'
   - Invalid values → fallback to default

### Accessibility Considerations

1. **RTL Language Support**: Users working in RTL languages (Arabic, Hebrew, etc.) can set RTL flow for natural reading direction
2. **Vertical Reading**: Some users may prefer vertical workflows matching physical kanban boards
3. **Screen Reader**: Ensure column order is announced correctly regardless of visual flow direction
4. **Focus Management**: Tab order should follow logical column order (not visual position)

## Implementation Plan

### Phase 1: Column Width Configuration ✅ COMPLETE
**Goal**: Users can configure card/column width, persisted across sessions

1. ✅ Add `columnWidth` to SettingValues interface in settings_store.ts
2. ✅ Add default value (300) to default settings
3. ✅ Add parsing logic to handle columnWidth in settings serialization
4. ✅ Create settings UI component for width slider/input (200-600 range)
5. ✅ Update column.svelte to use CSS variable `--column-width`
6. ✅ Add reactive statement in main.svelte to set CSS variable from settings
7. ✅ Test: Change width in settings, verify columns resize immediately
8. ✅ Test: Save and reload kanban, verify width persists
9. ✅ Test: Set invalid values, verify fallback to 300px
10. ✅ Test: Boundary values (200, 600), verify constraints work
11. ✅ Test: Verify column height remains auto-sized based on content

**Deliverable**: ✅ Working column width configuration with validation and persistence

**Completion Summary**:
- Implementation: settings_store.ts:76, settings.ts:39-50, column.svelte:319, main.svelte:409,637
- Tests: 8 automated tests added (validation, boundaries, serialization, persistence)
- Manual verification: All UI reactivity and persistence tests passed in Obsidian
- Commits: feat:4c4ad44, test:eb85ba1

**Implementation notes**:
- Can be deployed independently before flow direction
- Low risk, isolated change
- Immediate user value
- Width always controls horizontal dimension (card width)

### Phase 2: Flow Direction UI and Settings
**Goal**: Settings UI for flow direction, stored but not yet applied to layout

1. ☐ Add FlowDirection type definition to settings_store.ts
2. ☐ Add `flowDirection` to SettingValues interface
3. ☐ Add default value ('ltr') to default settings
4. ☐ Add parsing and serialization for flowDirection
5. ☐ Create radio button group in settings UI for direction selection
6. ☐ Add visual labels: "Left to right", "Right to left", "Top to bottom", "Bottom to top"
7. ☐ Test: Select each direction, verify setting saves
8. ☐ Test: Reload kanban, verify direction preference persists

**Deliverable**: Flow direction can be configured and saved (visual effect in next phase)

### Phase 3: Horizontal Flow Directions (LTR/RTL)
**Goal**: Left-to-right and right-to-left column flows work correctly

1. ☐ Add flow direction classes to columns container in main.svelte
2. ☐ Implement CSS for .flow-ltr (current behavior, explicit)
3. ☐ Implement CSS for .flow-rtl (flex-direction: row-reverse)
4. ☐ Add reactive class binding based on flowDirection setting
5. ☐ Test: Switch between LTR and RTL, verify column order reverses
6. ☐ Test: Drag-and-drop between columns in RTL mode
7. ☐ Test: "Add new" task in RTL columns
8. ☐ Test: Bulk actions and selection in RTL mode
9. ☐ Test: Sidebar remains on left in RTL mode
10. ☐ Test: Horizontal scrolling works correctly in both directions

**Deliverable**: LTR and RTL column flows fully functional

### Phase 4: Vertical Flow Directions (TTB/BTT)
**Goal**: Top-to-bottom and bottom-to-top column flows work correctly

1. ☐ Implement CSS for .flow-ttb (flex-direction: column, overflow-y)
2. ☐ Implement CSS for .flow-btt (flex-direction: column-reverse, overflow-y)
3. ☐ Verify `align-self: flex-start` on columns enables auto-height
4. ☐ Test: Switch to TTB, verify columns stack vertically
5. ☐ Test: Switch to BTT, verify columns stack in reverse
6. ☐ Test: Adjust column width setting, verify it controls horizontal width in vertical modes
7. ☐ Test: Verify column heights auto-size based on content
8. ☐ Test: Drag-and-drop between vertically stacked columns
9. ☐ Test: Scrolling behavior in vertical layouts
10. ☐ Test: Empty columns have 50px min-height drop zone
11. ☐ Test: Task cards render correctly (same width as horizontal flows)
12. ☐ Test: Very wide (600px) and very narrow (200px) cards in vertical flow

**Deliverable**: All four flow directions fully functional

**Note**: No special width→height conversion needed. Column width always controls horizontal dimension; column height always auto-sizes to content (current behavior preserved).

### Phase 5: Edge Case Handling and Polish
**Goal**: Handle corner cases, improve UX, ensure robustness

1. ☐ Add validation for columnWidth range (200-600)
2. ☐ Add fallback logic for invalid flowDirection values
3. ☐ Test with very long column names in all directions
4. ☐ Test with many columns (10+) in each direction
5. ☐ Test with very few tasks (empty columns) in each direction
6. ☐ Test rapid switching between flow directions
7. ☐ Verify focus management and tab order in all directions
8. ☐ Test with sidebar collapsed and expanded in all flows
9. ☐ Test task card overflow behavior in all flows
10. ☐ Add visual feedback/transitions when changing directions
11. ☐ Consider adding setting label hint: "Column width (or height for vertical flows)"
12. ☐ Update user documentation with new settings

**Deliverable**: Production-ready column width and direction configuration

### Future Enhancements (Out of Scope)

1. **Per-Column Width**: Allow individual columns to have different widths
2. **Sidebar Position**: Make sidebar position (left/right) configurable
3. **Sticky Add Button**: Floating "Add new" button for tall columns
4. **Keyboard Navigation**: Arrow keys to navigate between columns
5. **Grid Layout**: Option for grid-based column arrangement (e.g., 2×3 grid)
6. **Auto-fit**: Automatically size columns to fit viewport without scrolling
7. **Column Wrapping**: Wrap columns to next row/column when exceeding viewport
8. **Orientation Lock**: Remember different settings per device orientation (mobile)

## Open Questions

1. **Setting UI Location**: Add to existing settings modal or create dedicated "Layout" section?
   - **Recommendation**: Add to existing modal under new "Layout" section for discoverability

2. **Transition Animation**: Should direction changes be animated or instant?
   - **Recommendation**: Instant change is simpler and clearer; animation could be disorienting

3. **Mobile Behavior**: Should flow direction be forced to a specific value on mobile?
   - **Recommendation**: Respect user preference on all devices; mobile users may want vertical flows

4. **Default for New Kanbans**: Should system locale affect default flow direction (RTL for Arabic/Hebrew)?
   - **Recommendation**: Yes, detect locale and set RTL default for RTL languages (enhancement)

## Resolved Questions

1. **~~Keyboard Arrow Navigation~~**: ✅ Not an issue
   - Verified: No arrow key navigation between columns currently exists
   - Only Enter/Space handlers for button activation
   - If added in future, should adapt to flow direction

2. **~~Width Semantics in Vertical Flows~~**: ✅ Resolved
   - Width always controls horizontal card dimension
   - Height always auto-calculates from content
   - No special conversion logic needed

## Technical Considerations

### Browser Compatibility
- `flex-direction: row-reverse` - Supported in all modern browsers
- `flex-direction: column-reverse` - Supported in all modern browsers
- CSS custom properties - Already used extensively in codebase
- No polyfills or fallbacks needed (Obsidian uses Electron with modern Chromium)

### Performance
- No expected performance impact
- CSS-based layout changes are GPU-accelerated
- No additional JavaScript computation required
- Settings stored in existing frontmatter (no additional I/O)

### Testing Strategy
1. **Unit Tests**: Settings parsing and validation
2. **Integration Tests**: Drag-and-drop in all directions
3. **Visual Tests**: Screenshot comparison of all flow directions
4. **User Testing**: Gather feedback from RTL language users

### Rollout Strategy
1. Deploy Phase 1 (column width) first as low-risk improvement
2. Collect user feedback on width ranges
3. Deploy Phases 2-4 together as "Flow Direction" feature
4. Monitor for bug reports on drag-and-drop and scrolling
5. Phase 5 polish based on real-world usage patterns

## Success Metrics

1. **Adoption**: % of users who change from default settings
2. **RTL Usage**: % of users using RTL flow (indicator of accessibility improvement)
3. **Vertical Usage**: % of users using vertical flows (indicator of workflow diversity)
4. **Support Tickets**: No increase in drag-and-drop or layout-related issues
5. **User Feedback**: Positive sentiment in reviews/discussions about layout flexibility

## References

- Current column implementation: `src/ui/components/column.svelte:315-320`
- Current columns layout: `src/ui/main.svelte:1009-1020`
- Settings store: `src/ui/settings/settings_store.ts`
- Existing spec format: `specs/SPEC_0001__COMPLETE__FILTER_SAVE_DESIGN.md`
