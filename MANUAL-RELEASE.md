# Manual Release Instructions

The Git proxy in this environment restricts tag pushes. Here's how to create the first release manually:

## Option 1: Push Tag from Your Local Machine

Once you have access to the repository on your local machine:

```bash
# Pull the latest changes
git pull origin claude/obsidian-plugin-feature-011CV1vsz1jk81vTuEaFdH5j

# The tag is already created locally in the repo
# If it doesn't exist, create it:
git tag -a 1.0.0 -m "Initial release of Math Referencer"

# Push the tag to trigger GitHub Actions
git push origin 1.0.0
```

GitHub Actions will automatically build and create the draft release.

## Option 2: Create Release Directly on GitHub

1. Go to https://github.com/btromm/math-referencer/releases
2. Click "Create a new release"
3. Click "Choose a tag" → "Create new tag: 1.0.0"
4. Set the target to your branch: `claude/obsidian-plugin-feature-011CV1vsz1jk81vTuEaFdH5j`
5. Title: "Math Referencer v1.0.0"
6. Description: Add release notes (see below)
7. Upload files:
   - `main.js` (from the repo)
   - `manifest.json`
   - `styles.css`
8. Click "Publish release"

## Option 3: Merge to Main and Use GitHub Actions

1. Create a pull request from `claude/obsidian-plugin-feature-011CV1vsz1jk81vTuEaFdH5j` to `main`
2. Merge the PR
3. From your local machine with main branch checked out:
   ```bash
   git pull origin main
   git tag -a 1.0.0 -m "Initial release"
   git push origin 1.0.0
   ```

## Release Notes Template

```markdown
# Math Referencer v1.0.0

Initial release of Math Referencer - an Obsidian plugin for automatic equation numbering and block references.

## Features

- 🔢 **Automatic Equation Numbering**: All block equations (`$$...$$`) are automatically numbered
- 🔗 **Block References**: Reference equations using `![[file#^block-id]]` syntax
- ⚙️ **Customizable Formatting**: Choose from various numbering formats like (1), [1], or Eq. 1
- 🚀 **Performance Optimized**: Smart caching with batch processing
- 🛡️ **Robust Handling**: Properly handles code blocks, empty equations, and edge cases

## Installation

### Via BRAT (Recommended)
1. Install the BRAT plugin from Obsidian Community Plugins
2. Add repository: `btromm/math-referencer`
3. Enable in Settings → Community Plugins

### Manual Installation
1. Download `main.js`, `manifest.json`, and `styles.css`
2. Extract to `.obsidian/plugins/math-referencer/`
3. Enable in Settings → Community Plugins

## Documentation

- See README.md for full usage instructions
- See TEST-PLAN.md for testing guidelines
- See RELEASING.md for contribution guidelines

## What's Next

- Share with beta testers
- Gather feedback for improvements
- Plan future enhancements
```

## Files Ready for Release

All required files are in the repository:
- ✅ `main.js` (built and ready)
- ✅ `manifest.json` (version 1.0.0)
- ✅ `styles.css`
- ✅ `versions.json`
- ✅ GitHub Actions workflow configured

## BRAT Installation After Release

Once the release is published, users can install via BRAT:

```
Repository: btromm/math-referencer
```

BRAT will automatically:
- Download the plugin files
- Install in the correct location
- Check for updates
- Notify users of new versions

## Testing the Release

After creating the release:

1. **Test BRAT Installation**:
   - Use BRAT to install: `btromm/math-referencer`
   - Verify files are downloaded correctly
   - Enable plugin and test features

2. **Test Manual Installation**:
   - Download release files
   - Install manually
   - Verify plugin loads and works

3. **Test Auto-Updates**:
   - Create a new version (1.0.1)
   - Push tag
   - Verify BRAT detects the update

## Current Status

- ✅ Tag `1.0.0` created locally
- ⏳ Tag needs to be pushed from authorized environment
- ✅ All files ready for release
- ✅ GitHub Actions workflow configured
- ✅ Documentation complete

The repository is fully ready for release - just needs the tag to be pushed or the release to be created manually on GitHub!
