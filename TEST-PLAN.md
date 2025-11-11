# Math Referencer Plugin - Test Plan

This document outlines the testing strategy for the Math Referencer plugin.

## Test Files

1. **test-equations.md** - Contains various equations with and without block IDs
2. **test-references.md** - Tests block references to equations

## Manual Testing Checklist

### 1. Basic Functionality

- [ ] Open `test-equations.md` in Obsidian
- [ ] Verify all block equations are automatically numbered
- [ ] Verify equation numbers appear on the right side
- [ ] Verify the numbering format matches settings (default: "(1)", "(2)", etc.)

### 2. Block ID Handling

- [ ] Verify equations with block IDs (^block-id) are numbered
- [ ] Verify equations without block IDs are still numbered
- [ ] Verify empty equations are skipped
- [ ] Verify code blocks containing $$ are NOT numbered

### 3. Block References

- [ ] Open `test-references.md` in Obsidian
- [ ] Verify block references (![[file#^block-id]]) render the equation
- [ ] Verify referenced equations show the correct equation number
- [ ] Verify multiple references to the same equation show the same number
- [ ] Verify referenced equations have the highlighted background (equation-reference class)

### 4. Settings

- [ ] Open plugin settings
- [ ] Toggle "Enable automatic numbering" off
  - [ ] Verify equations are no longer numbered
- [ ] Toggle it back on
  - [ ] Verify equations are numbered again
- [ ] Change "Start numbering from" to 5
  - [ ] Verify equations now start from (5)
- [ ] Change "Numbering format" to "[${num}]"
  - [ ] Verify format changes to [1], [2], etc.
- [ ] Change to "Eq. ${num}"
  - [ ] Verify format changes to "Eq. 1", "Eq. 2", etc.
- [ ] Try invalid format without ${num}
  - [ ] Verify the setting reverts to previous valid value

### 5. File Operations

- [ ] Create a new file with equations
  - [ ] Verify equations are numbered
- [ ] Add a block ID to an equation
  - [ ] Reference it from another file
  - [ ] Verify the reference works
- [ ] Edit an equation
  - [ ] Verify the number updates if the count changes
- [ ] Delete an equation
  - [ ] Verify numbering of subsequent equations updates
- [ ] Rename a file with equations
  - [ ] Verify references to that file still work

### 6. Edge Cases

- [ ] Test with very long equations (multi-line LaTeX)
- [ ] Test with nested structures (matrices, aligned equations)
- [ ] Test with special characters in equations
- [ ] Test with inline math ($...$) - should NOT be numbered
- [ ] Test with equations in different files simultaneously
- [ ] Test with many files (50+) to verify performance

### 7. Cross-File References

- [ ] Create equation in File A with block ID
- [ ] Reference it in File B
  - [ ] Verify reference renders
- [ ] Edit the equation in File A
  - [ ] Verify reference in File B updates
- [ ] Delete the equation in File A
  - [ ] Verify reference in File B shows fallback (or error)

### 8. Performance Testing

- [ ] Test with vault containing 100+ markdown files
- [ ] Verify initial cache build completes in reasonable time
- [ ] Test switching between files rapidly
  - [ ] Verify no lag or freezing
- [ ] Test editing files with many equations (20+)
  - [ ] Verify updates are fast

### 9. Mobile Testing (if applicable)

- [ ] Install plugin on Obsidian mobile
- [ ] Verify all features work on mobile
- [ ] Check responsive CSS for equation numbering

### 10. Error Handling

- [ ] Test with corrupted markdown (unclosed $$)
  - [ ] Verify warning in console
  - [ ] Verify plugin doesn't crash
- [ ] Test with file read errors (permissions)
  - [ ] Verify error is logged
  - [ ] Verify plugin continues to work for other files
- [ ] Test with MathJax disabled or unavailable
  - [ ] Verify graceful degradation

## Automated Testing (Future Enhancement)

Potential areas for unit tests:
- `extractEquationsFromContent()` - equation parsing logic
- `formatEquationNumber()` - number formatting
- `contentMatches()` - content comparison
- `hashContent()` - hash generation
- Code block detection
- Block ID regex matching

## Known Limitations

1. The plugin requires Obsidian's native MathJax to be enabled
2. Only block equations ($$...$$) are numbered, not inline ($...$)
3. Equation numbering is per-file, not global across vault
4. The plugin does not handle equation labels (like \label{eq:1} in LaTeX)

## Expected Behavior Summary

✅ **Should Work:**
- Automatic numbering of all block equations
- Block references to equations with block IDs
- Dynamic numbering updates on file changes
- Cross-file equation references
- Custom numbering formats
- Cache management for performance

❌ **Should NOT Work / Not Implemented:**
- Inline math numbering
- Global equation numbering across vault
- Automatic label generation
- Equation cross-referencing without block IDs
- Export to LaTeX with preserved numbering

## Testing Environment

- **Obsidian Version:** 0.15.0+ (check compatibility)
- **Operating Systems:** Windows, macOS, Linux
- **Mobile:** iOS, Android (if applicable)

## Reporting Issues

If you find any bugs or unexpected behavior:
1. Check the console for error messages
2. Verify the issue is reproducible
3. Note the steps to reproduce
4. Document expected vs actual behavior
5. Include relevant markdown files (if possible)
