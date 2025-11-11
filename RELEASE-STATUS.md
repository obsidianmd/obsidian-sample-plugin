# Release Status - Ready to Deploy! 🚀

## Current Status: READY FOR RELEASE

✅ **Code merged to master** (PR #1)  
✅ **Tag created locally**: `1.0.0`  
✅ **All files built and ready**  
✅ **Documentation complete**  
⏳ **Tag needs to be pushed** (blocked by proxy)

## What's the Difference: Main vs Master?

**They're the same thing** - just different naming conventions:
- **`master`** = Traditional default branch name (this repo uses this)
- **`main`** = New default branch name (GitHub's modern convention)

This repository uses **`master`** as its default branch.

## To Complete the Release

### From Your Local Machine:

```bash
# 1. Fetch the latest master branch
git fetch origin master:master
git checkout master

# 2. The tag is already created! Just push it:
git push origin 1.0.0
```

That's it! GitHub Actions will automatically:
- Build the plugin
- Create a draft release
- Attach main.js, manifest.json, and styles.css

Then just publish the draft release on GitHub.

### Alternative: Create Release Directly on GitHub

If you can't push tags, create the release manually:

1. Go to https://github.com/btromm/math-referencer/releases
2. Click "Create a new release"
3. Click "Choose a tag" → type "1.0.0" → "Create new tag: 1.0.0"
4. **Target branch**: `master` ← Important!
5. Title: "Math Referencer v1.0.0"
6. Add release notes (see below)
7. Upload these 3 files:
   - `main.js` (7.4K)
   - `manifest.json`
   - `styles.css`
8. Click "Publish release"

## Release Notes Template

```markdown
# Math Referencer v1.0.0

Initial release of Math Referencer - an Obsidian plugin for automatic equation numbering and block references.

## ✨ Features

- 🔢 **Automatic Equation Numbering**: All block equations (`$$...$$`) are automatically numbered
- 🔗 **Block References**: Reference equations using `![[file#^block-id]]` syntax
- ⚙️ **Customizable Formatting**: Choose numbering formats like (1), [1], or Eq. 1
- 🚀 **Performance Optimized**: Smart caching with batch processing
- 🛡️ **Robust Handling**: Properly handles code blocks, empty equations, and edge cases

## 📦 Installation

### Via BRAT (Recommended for Beta Testing)
1. Install the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat)
2. Add repository: `btromm/math-referencer`
3. Enable in Settings → Community Plugins

### Manual Installation
1. Download `main.js`, `manifest.json`, and `styles.css`
2. Extract to `.obsidian/plugins/math-referencer/`
3. Enable in Settings → Community Plugins

## 📖 Documentation

- [README.md](https://github.com/btromm/math-referencer#readme) - Full usage guide
- [TEST-PLAN.md](https://github.com/btromm/math-referencer/blob/master/TEST-PLAN.md) - Testing guidelines
- [RELEASING.md](https://github.com/btromm/math-referencer/blob/master/RELEASING.md) - Developer guide

## 🧪 Test Files

Try the plugin with the included test files:
- `test-equations.md` - Various equations with block IDs
- `test-references.md` - Examples of equation references

## 🎯 What's Next

- Share with beta testers
- Gather feedback
- Plan future enhancements

---

**Full Changelog**: https://github.com/btromm/math-referencer/commits/master
```

## Files Ready for Release

All in the repository root:
- ✅ `main.js` (7.4K - compiled and tested)
- ✅ `manifest.json` (version 1.0.0)
- ✅ `styles.css` (1.9K)
- ✅ `versions.json` (version compatibility tracking)

## After Release is Published

### For BRAT Users

Installation will be simple:
1. Install BRAT plugin
2. Add repository: `btromm/math-referencer`
3. BRAT automatically downloads and installs

### Testing Checklist

- [ ] Install via BRAT
- [ ] Test equation numbering
- [ ] Test block references
- [ ] Try different numbering formats in settings
- [ ] Test with test-equations.md and test-references.md files

## Local Commits Not Yet Pushed

There's one commit on master that couldn't be pushed due to proxy restrictions:
```
0d3e7b2 Update documentation: use 'master' instead of 'main'
```

When you push the tag from your local machine, also push master:
```bash
git push origin master 1.0.0
```

## Summary

Everything is **100% ready for release**! The only thing preventing it is the proxy restriction on tag pushes in this environment. From your local machine, it's literally just:

```bash
git fetch origin master:master
git checkout master
git push origin master 1.0.0
```

Then publish the draft release, and you're done! 🎉
