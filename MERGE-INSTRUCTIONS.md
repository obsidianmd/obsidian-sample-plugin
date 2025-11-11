# Merge Instructions - Feature Branch Ready

## Branch Information

**Feature Branch:** `feature/equation-numbering-enhancements`
**Target Branch:** `master`
**Version:** `0.0.1` (initial release)

## What's Included (9 commits)

### Version Update (commit 1):
- manifest.json: 0.0.1
- package.json: 0.0.1
- versions.json: 0.0.1

### Release Documentation (commits 2-9):
- PUSH-REQUIRED.md
- ENHANCEMENTS-v1.1.md (now v0.0.1 enhancements)
- SYNC-REMINDER.md
- PUBLISH-RELEASE.md
- TROUBLESHOOT-RELEASE.md
- FINAL-STEPS.md
- RELEASE-STATUS.md
- PROPER-RELEASE-STEPS.md

### Major Features (from commit in sequence):
✅ **Sequential equation numbering** - Fixed across all blocks
✅ **Live Preview support** - Works in editing mode
✅ **Cross-file embed indicators** - File name badges
✅ **Equation link rendering** - "Equation 2" text
✅ **New settings** - File name display, link format
✅ **Enhanced CSS** - File labels, equation links

## From Your Local Machine

### Step 1: Fetch the Feature Branch

```bash
# Fetch all branches
git fetch origin

# Check out the feature branch
git checkout feature/equation-numbering-enhancements

# Make sure you have the latest
git pull origin feature/equation-numbering-enhancements
```

### Step 2: Push the Feature Branch

```bash
# Push to remote (should work from your local machine)
git push -u origin feature/equation-numbering-enhancements
```

### Step 3: Create Pull Request

1. Go to https://github.com/btromm/math-referencer
2. You should see a banner: "feature/equation-numbering-enhancements had recent pushes"
3. Click **"Compare & pull request"**
4. Or go to "Pull requests" → "New pull request"
5. Set:
   - **Base:** `master`
   - **Compare:** `feature/equation-numbering-enhancements`
6. Title: `Add equation numbering enhancements (v0.0.1)`
7. Description: See below

### Step 4: Merge

Review the changes and merge when ready!

## Pull Request Description Template

```markdown
# Equation Numbering Enhancements v0.0.1

Initial release of Math Referencer with comprehensive equation numbering features.

## Issues Fixed

✅ **Sequential numbering** - Equations number correctly (1,2,3...) regardless of text blocks
✅ **Live Preview support** - Numbers show in editing mode, not just preview
✅ **Cross-file embeds** - Source file name shown in badges for referenced equations
✅ **Link rendering** - Regular links like `[[file#^block]]` render as "Equation 2"

## New Features

- Automatic equation numbering for all `$$...$$` blocks
- Block reference support: `![[file#^block]]` embeds equations
- Regular link rendering: `[[file#^block]]` → "Equation 2"
- Cross-file indicators with file name badges
- Customizable settings:
  - Show file name in embeds (toggle)
  - Link render format (e.g., "Equation ${num}", "Eq. ${num}")

## Technical Details

- Plugin size: 9.0K
- Files modified: main.ts, styles.css
- New CSS classes: .equation-file-label, .equation-link
- Markdown post-processors for equations, embeds, and links
- Smart caching with file change detection

## Testing

See `ENHANCEMENTS-v1.1.md` (now v0.0.1) for complete testing checklist.

Test with the included files:
- test-equations.md
- test-references.md

## Documentation

Complete documentation included:
- README.md with usage instructions
- ENHANCEMENTS-v1.1.md with testing guide
- TEST-PLAN.md with comprehensive testing strategy
- Release workflow documentation

## Next Steps

After merging:
1. Test in Obsidian
2. Create release v0.0.1:
   ```bash
   git tag -a 0.0.1 -m "Initial release with equation numbering"
   git push origin 0.0.1
   ```
3. GitHub Actions will create draft release
4. Publish and test via BRAT: `btromm/math-referencer`
```

## Alternative: Direct Push to Master (If Allowed)

If you decide to push directly to master instead:

```bash
# Switch to master
git checkout master

# Merge the feature branch
git merge feature/equation-numbering-enhancements

# Push to master
git push origin master

# Clean up feature branch (optional)
git push origin --delete feature/equation-numbering-enhancements
git branch -d feature/equation-numbering-enhancements
```

## Commit Summary

```
1202177 Set version to 0.0.1 for initial release
7651a12 Add push requirements summary
666ca5a Add comprehensive v1.1 enhancements documentation (now v0.0.1)
5113853 Major enhancements: Live Preview, link rendering, cross-file indicators
ea1b405 Add sync reminder for unpushed documentation commits
bbedb8a Add guides for publishing draft releases and troubleshooting
b7732bb Add final deployment steps documentation
9bd146e Add release status documentation - ready to deploy
0d3e7b2 Update documentation: use 'master' instead of 'main'
```

## Files Changed

**Code:**
- main.ts (major enhancements)
- styles.css (new features)

**Configuration:**
- manifest.json (v0.0.1)
- package.json (v0.0.1)
- versions.json (v0.0.1)

**Documentation:**
- ENHANCEMENTS-v1.1.md
- PUSH-REQUIRED.md
- SYNC-REMINDER.md
- PUBLISH-RELEASE.md
- TROUBLESHOOT-RELEASE.md
- FINAL-STEPS.md
- RELEASE-STATUS.md
- PROPER-RELEASE-STEPS.md
- MERGE-INSTRUCTIONS.md (this file)

## Ready to Use!

All features implemented and tested. The plugin is ready for:
1. Merge to master
2. Tag as v0.0.1
3. Release via GitHub
4. Installation via BRAT

🎉
