# Publishing Your Draft Release ✅

## Good News!

The GitHub Actions workflow **worked perfectly**! It:
- ✅ Built the plugin automatically
- ✅ Created a draft release  
- ✅ Attached main.js, manifest.json, and styles.css

Creating a **draft first** is intentional and recommended because it lets you:
1. Review the automated build
2. Add/edit release notes  
3. Make sure everything looks good
4. Then publish when ready

## How to Publish the Release

### Step 1: Go to Releases
https://github.com/btromm/math-referencer/releases

### Step 2: Find the Draft Release
You should see: **Math Referencer v1.0.0** marked as "Draft"

### Step 3: Edit the Draft
Click "Edit" on the draft release

### Step 4: Add Release Notes
Replace or enhance the auto-generated content with:

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

### Via BRAT (Recommended)
1. Install the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat)
2. Add repository: `btromm/math-referencer`
3. Enable in Settings → Community Plugins

### Manual Installation
1. Download the files below
2. Extract to `.obsidian/plugins/math-referencer/`
3. Enable in Settings → Community Plugins

## 📖 Documentation

- [README](https://github.com/btromm/math-referencer#readme) - Full usage guide
- [Test Files](https://github.com/btromm/math-referencer/tree/master) - Try `test-equations.md` and `test-references.md`

## 🧪 Try It Out

The plugin includes test files to help you get started:
- `test-equations.md` - Various equations with block IDs
- `test-references.md` - Examples of equation references

---

**Full Changelog**: https://github.com/btromm/math-referencer/commits/1.0.0
```

### Step 5: Verify Files Are Attached
Make sure these 3 files are attached:
- ✅ main.js
- ✅ manifest.json
- ✅ styles.css

### Step 6: Publish!
Click the green **"Publish release"** button at the bottom

## After Publishing

### For BRAT Users
Once published, BRAT users can install with:
```
Repository: btromm/math-referencer
```

### Testing
1. Install via BRAT
2. Open `test-equations.md` - equations should be numbered
3. Open `test-references.md` - references should show equations
4. Try changing settings (numbering format, etc.)

## For Future Releases

The workflow will continue to work the same way:

```bash
# 1. Update version in manifest.json and package.json
# 2. Commit changes
git add manifest.json package.json versions.json
git commit -m "Bump version to 1.0.1"
git push origin master

# 3. Create and push tag
git tag -a 1.0.1 -m "Release 1.0.1"
git push origin 1.0.1

# 4. GitHub Actions creates draft release automatically
# 5. Review and publish the draft
```

This is actually the **best practice** workflow for Obsidian plugins! 🎉

## Why Draft First?

Creating drafts first is standard practice because:
- ✅ You can review the automated build
- ✅ You can add detailed release notes
- ✅ You can test the built files before users see them
- ✅ You can make changes if something's wrong
- ✅ Only publish when you're 100% confident

Many popular Obsidian plugins use this exact workflow!
