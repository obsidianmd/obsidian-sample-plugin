# Filter Styling Improvements
Status: IN_PROGRESS
Started: 2025-10

## Summary
Polish the filter controls UI. Currently functional but visually flat - needs better hierarchy, spacing, and interactive feedback. Add collapsible section to reduce screen space usage.

## Key Changes

### Collapsible Filters Section
- Wrap entire filters area in `<details>` element with "Filters" summary
- Default state: open
- State persists across board reopen (stored in `filtersExpanded` setting)
- Inline design: summary and controls share same background container
- Triangle indicators: ▸ (closed) / ▾ (open) positioned left of "Filters" text
- Hover state: text color changes to `var(--text-muted)`
- Vertical position of "Filters" text remains consistent when toggling
- When closed: compact padding, shows only summary
- When open: full padding with all filter controls visible

### Structure & Containers
- Single background/border on `.filters-section` (details element) containing entire collapsible area
- **Remove** individual backgrounds/borders from filter boxes - unified appearance
- **Vertical stacking**: Traditional filter panel layout (sidebar-style)
- Compact spacing between filter sections
- Use `var(--background-secondary)` for outer container only
- Add border-radius and consistent padding throughout

### Saved Filters Section
- Style `<details>` summary with subtle background
- Add inset appearance to expanded list
- Enhance active filter: pill/badge style with `var(--interactive-accent)` background (0.1 opacity) + border
- Improve spacing between filter buttons

### Action Buttons
- **Save**: Keep solid accent background (current style)
- **Clear**: Change to ghost/outline style
  - Transparent background
  - Border: `1px solid var(--background-modifier-border)`
  - Text: `var(--text-muted)`
  - Hover: `var(--background-modifier-hover)` background

### Input Focus States
- Add box-shadow on focus: `0 0 0 2px var(--background-modifier-border-focus)`
- Fix tag filter placeholder overflow ("Please selec" → "Please select...")
- Smooth transitions: `150ms ease`

## Implementation Plan

### Phase 1: Structure, Containers & Spacing ✅ COMPLETE
**Goal:** Establish visual hierarchy and proper spacing, add collapsible section

1. ✅ Wrap filters in `<details>` element with collapsible functionality
2. ✅ Add `filtersExpanded` to settings for persistence
3. ✅ Move background/border/padding to `.filters-section` (details element)
4. ✅ Add individual backgrounds and borders to each filter type box
5. ✅ Increase grid gap from 120px to 140px
6. ✅ Style filters summary with triangle indicators (▸/▾) and hover state
7. ✅ Adjust padding for consistent "Filters" text position when toggling
8. ✅ Implement different padding states for open/closed
9. ✅ Adjust label spacing and padding inside filter boxes
10. ✅ Ensure consistent spacing in saved filters sections
11. ✅ Fix toggle handler to prevent reactive loop
12. ✅ Test with longer filter names/text for overflow
13. ✅ Test in light and dark themes
14. ✅ Verify responsive layout

**Deliverable:** Clear visual separation with proper spacing and collapsible filters section

**Implemented by:** [commit-hash](link)

---

### Phase 2: Vertical Panel Layout 🚧 IN_PROGRESS
**Goal:** Create sidebar-style filter panel in current position (vertical stacking, narrower width)

**Scope:** Option A - Keep filters above board, make narrower with vertical stacking
(Option B - literal sidebar moved to viewport edge - deferred for potential future work)

**Current Layout (Phase 1):**
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ▾ Filters                                                                       │
│                                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐            │
│  │ Filter by content│  │ Filter by tag:   │  │ Filter by file:  │            │
│  │ ▸ Saved filters  │  │ ▸ Saved filters  │  │ ▸ Saved filters  │            │
│  │                  │  │                  │  │                  │            │
│  │ [input_______]   │  │ [tag] [tag] ...  │  │ [input_______]   │            │
│  │ [Save] [Clear]   │  │ [Save] [Clear]   │  │ [Save] [Clear]   │            │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘            │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**New Layout (Phase 2):**
```
┌───────────────────────────────────────┐
│ ▾ Filters                             │
│                                       │
│  Filter by content:                   │
│  ▸ Saved filters                      │
│  [input________________]              │
│  [Save] [Clear]                       │
│                                       │
│  Filter by tag:                       │
│  ▸ Saved filters                      │
│  [tag] [tag] [...________]            │
│  [Save] [Clear]                       │
│                                       │
│  Filter by file:                      │
│  ▸ Saved filters                      │
│  [input________________]              │
│  [Save] [Clear]                       │
└───────────────────────────────────────┘
```

**Key Visual Changes:**
- Single background container (no nested boxes)
- **Vertical stacking**: Traditional sidebar-style filter panel
- Compact spacing between filter sections
- Narrower overall width
- Each filter flows top-to-bottom

1. ☐ Remove individual backgrounds/borders from `.text-filter`, `.tag-filter`, `.file-filter`
2. ☐ Convert layout from grid to vertical stack (flexbox column or block)
3. ☐ Reduce overall container width for sidebar proportions
4. ☐ Adjust spacing between filter sections (reduce from current grid gap)
5. ☐ Ensure inputs stretch to full width within container
6. ☐ Keep labels above inputs (current behavior)
7. ☐ Maintain saved filters dropdown functionality
8. ☐ Test with various combinations of active filters
9. ☐ Verify all three filter types have consistent spacing
10. ☐ Test overflow behavior with many tags/long text
11. ☐ Test in light and dark themes

**Deliverable:** Clean vertical filter panel with traditional sidebar layout

**Implemented by:** [commit-hash](link)

---

### Phase 3: Interactive Elements & Polish ☐ TODO
**Goal:** Improve all interactive states and visual feedback

1. ☐ Style saved filters `<details>` summary with subtle background and hover state
2. ☐ Add inset styling to expanded saved filters list
3. ☐ Enhance active filter indication (pill/badge style)
4. ☐ Update Clear button to ghost/outline style (transparent background, border, muted text)
5. ☐ Add focus box-shadow to text inputs: `0 0 0 2px var(--background-modifier-border-focus)`
6. ☐ Update multi-select focus styling (tag filter)
7. ☐ Fix tag filter placeholder text overflow
8. ☐ Ensure consistent button sizing across all filter types
9. ☐ Improve disabled state opacity on all buttons
10. ☐ Add smooth transitions: `150ms ease` to all interactive elements
11. ☐ Test all interactive states: hover, focus, active, disabled
12. ☐ Test keyboard navigation (Tab, Enter, Escape)
13. ☐ Verify focus indicators meet accessibility standards
14. ☐ Final cross-theme testing (light, dark, high contrast)
15. ☐ Verify saved filter [×] delete buttons remain aligned in horizontal layout

**Deliverable:** Polished interactive elements with clear feedback

**Implemented by:** [commit-hash](link)

---

## Future Enhancements (Out of Scope)

- **Filter count indicator**: "Showing 12 of 45 tasks"
- **Sticky filters**: Keep controls visible on scroll
- **Filter chips**: Active filters as removable pills below controls
- **Keyboard shortcuts**: `/` for content filter, `Ctrl+Shift+F` for file filter
- **Icons**: Add to buttons and filter type labels
- **Named filter presets**: Save combined content + tag + file filters with custom names

---

## Technical Notes

**CSS Variables to use:**
- `--background-primary`, `--background-secondary`
- `--background-modifier-border`, `--background-modifier-border-focus`
- `--background-modifier-hover`, `--background-modifier-error-hover`
- `--interactive-accent`, `--interactive-accent-hover`
- `--text-normal`, `--text-muted`, `--text-on-accent`

**Accessibility:**
- Maintain keyboard navigation (Tab, Enter, Escape)
- Keep ARIA labels (already in place)
- Use `:focus-visible` for keyboard-only focus indicators
- Ensure WCAG AA contrast ratios
- Test with screen readers

**Testing:**
- Light and dark themes
- Keyboard navigation
- Long filter names/text overflow
- Responsive layout at different widths
