# Proper Release Steps

## Why Merge to Main First?

Releases should be created from the main branch because:
- BRAT and users expect stable code on main
- Tags should represent official releases, not feature branch work
- Makes the repository history cleaner
- Follows standard Git workflow conventions

## Step-by-Step Release Process

### Step 1: Merge Feature Branch to Main

**Option A: Create Pull Request (Recommended)**
1. Go to https://github.com/btromm/math-referencer
2. Create a Pull Request from `claude/obsidian-plugin-feature-011CV1vsz1jk81vTuEaFdH5j` to `main`
3. Review the changes
4. Merge the PR

**Option B: Direct Merge (from your local machine)**
```bash
# Switch to main branch
git checkout main

# Pull latest changes
git pull origin main

# Merge feature branch
git merge claude/obsidian-plugin-feature-011CV1vsz1jk81vTuEaFdH5j

# Push to main
git push origin main
```

### Step 2: Create Release Tag from Main

After merging to main:

```bash
# Ensure you're on main branch
git checkout main
git pull origin main

# Create the tag
git tag -a 1.0.0 -m "Release version 1.0.0

Initial release with:
- Automatic equation numbering
- Block reference support
- Dynamic numbering updates
- BRAT compatibility"

# Push the tag
git push origin 1.0.0
```

### Step 3: GitHub Actions Automatically Handles the Rest

The workflow will:
1. Trigger on the tag push
2. Build from main branch
3. Create a draft release
4. Attach `main.js`, `manifest.json`, `styles.css`

### Step 4: Publish the Release

1. Go to https://github.com/btromm/math-referencer/releases
2. Review the draft release
3. Add any additional release notes
4. Publish the release

## Alternative: Direct Release on GitHub (Without Tag Push)

If you can't push tags, you can create the release directly on GitHub:

1. **First, merge to main** (via PR or direct merge)
2. Go to https://github.com/btromm/math-referencer/releases
3. Click "Create a new release"
4. Click "Choose a tag" → "Create new tag: 1.0.0"
5. **Set target branch to: `main`** ← Important!
6. Upload files from main branch:
   - `main.js`
   - `manifest.json`
   - `styles.css`
7. Publish release

## Summary

**Correct Flow:**
```
Feature Branch → Main Branch → Tag → Release
```

**Incorrect Flow:**
```
Feature Branch → Tag → Release  ← Don't do this
```

The tag should always point to a commit on main (or your primary release branch), not a feature branch.
