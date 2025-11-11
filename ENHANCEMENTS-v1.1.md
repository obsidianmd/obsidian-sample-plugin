# Math Referencer v1.1 Enhancements

## Issues Fixed

### 1. ✅ Sequential Numbering Across Blocks
**Problem:** Equations weren't numbering sequentially when separated by text.
**Solution:** Fixed the equation extraction logic. Now all equations number 1, 2, 3... regardless of text between them.

**Test:** Open your RL theory file - all 7 equations should number (1) through (7).

### 2. ✅ Live Preview Support  
**Problem:** Numbering only showed in Preview mode, not in Editing (Live Preview) mode.
**Solution:** Markdown post-processors now work in both modes.

**Test:** Switch to Live Preview mode - equations should show numbers immediately.

### 3. ✅ Cross-File Embed Indicators
**Problem:** Embedded equations from other files didn't show source.
**Solution:** Added file name badge and number prefix for cross-file embeds.

**Behavior:**
- Same file embed: `![[#^block]]` → Shows equation with `(1)`
- Different file embed: `![[Basic RL theory#^ad35e2]]` → Shows "Basic RL theory" badge + "Basic RL theory (1)"

**Test:** Embed an equation from another file - you should see the source file name.

### 4. ✅ Equation Link Rendering
**Problem:** Regular links like `[[Basic RL theory#^ad35e2]]` showed as raw link text.
**Solution:** Links to equations now render as readable text.

**Default format:** "Equation 2"
**For different files:** "Basic RL theory Equation 2"

**Test:** Create a regular link (not embed) to an equation - it should show as "Equation N".

## New Settings

### Show file name in embeds (default: ON)
- Controls whether cross-file embeds show the source file name
- Toggle in Settings → Math Referencer

### Link render format (default: "Equation ${num}")
- Customize how equation links are displayed
- Placeholders:
  - `${num}` - equation number
  - `${file}` - file name
- Examples:
  - `"Equation ${num}"` → "Equation 2"
  - `"Eq. ${num}"` → "Eq. 2"  
  - `"${file} ${num}"` → "Basic RL theory 2"

## Visual Improvements

### File Label Badges
Cross-file embeds show a colored badge with the source file name in the top-left corner.

### Styled Equation Links
Links to equations have:
- Dashed underline
- Hover effect
- Distinct styling from regular links

### Mobile Responsive
- File labels reposition on mobile
- Equation numbers stack properly on narrow screens

## Testing Checklist

- [ ] Open your RL theory file
- [ ] Verify all 7 equations number sequentially (1)-(7)
- [ ] Switch to Live Preview mode - numbers should still show
- [ ] Create an embed: `![[Basic RL theory#^ad35e2]]`
  - [ ] Should show the equation
  - [ ] Should have "Basic RL theory" badge
  - [ ] Number should show as "Basic RL theory (1)"
- [ ] Create a link: `[[Basic RL theory#^ad35e2]]`
  - [ ] Should render as "Basic RL theory Equation 1"
  - [ ] Should have dashed underline
  - [ ] Clicking should navigate to the equation
- [ ] Test settings:
  - [ ] Toggle "Show file name in embeds" off - badge should disappear
  - [ ] Change link format to "Eq. ${num}" - links should update
- [ ] Test in Reading mode - everything should still work

## Comparison with Other Plugins

I reviewed the `obsidian-latex-theorem-equation-referencer` plugin for ideas.

**What we have that they had:**
- ✅ Automatic equation numbering
- ✅ Block references
- ✅ Link rendering
- ✅ Cross-file referencing

**What they had that we don't (yet):**
- ❌ Theorem/Lemma/Definition environments (LaTeX-style callouts)
- ❌ Proof environments
- ❌ "Clever" references (showing titles instead of numbers)
- ❌ Search/autocomplete for equations
- ❌ Note title prefixes (e.g., "Chapter1-Eq.2")
- ❌ Manual numbering override
- ❌ Callout block integration

**Potential future features:**
1. Theorem/Lemma/Definition callouts with auto-numbering
2. Equation labels/titles (name equations, reference by name)
3. Autocomplete suggestions when typing equation references
4. Note-based numbering (prefix with note title)
5. Chapter/section numbering (hierarchical: 1.1, 1.2, 2.1...)

## Known Limitations

1. **Live Preview may need reload:** First time enabling, you might need to reopen files
2. **Reading mode required for MathJax:** Complex equations render better in Reading mode
3. **Block IDs required for references:** Equations need `^block-id` to be referenceable
4. **Per-file numbering:** Numbers reset in each file (not global across vault)

## Technical Details

**New code:**
- `processEquationLinks()` - Handles regular link rendering
- `formatEquationLink()` - Formats link text with smart file name handling
- Enhanced `renderEquationReference()` - Adds file context to embeds
- New CSS classes: `.equation-file-label`, `.equation-link`

**Build size:** 7.4K → 9.0K (new features added)

## Next Steps

1. **Test thoroughly** with your real notes
2. **Report any issues** you find
3. **Suggest improvements** - what would make it more useful?

Potential quick wins:
- Equation labels (give equations names)
- Hover preview (show equation on link hover)
- Section numbering (1.1, 1.2, etc.)
