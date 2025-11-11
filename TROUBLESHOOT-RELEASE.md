# Troubleshooting GitHub Actions Release

## Why the Workflow Might Not Have Run

### Check 1: Did GitHub Actions Run?

Go to: https://github.com/btromm/math-referencer/actions

Look for a workflow run triggered by the `1.0.0` tag push. You should see:
- Workflow name: "Release Obsidian plugin"
- Triggered by: tag push

**If you DON'T see a workflow run:**
- GitHub Actions might not be enabled for the repo
- Go to Settings → Actions → General
- Make sure "Allow all actions and reusable workflows" is selected

**If you DO see a workflow run that failed:**
- Click on it to see the error logs
- Common issues below

### Common Issues and Fixes

#### Issue 1: GitHub CLI Not Found
**Error**: `gh: command not found`

**Fix**: The workflow uses GitHub CLI which should be pre-installed. If it's not, update the workflow to install it first.

#### Issue 2: Permission Denied
**Error**: `refused to create release`

**Fix**: The GITHUB_TOKEN needs write permissions
- Go to Settings → Actions → General
- Under "Workflow permissions"
- Select "Read and write permissions"
- Check "Allow GitHub Actions to create and approve pull requests"
- Save

#### Issue 3: No main.js After Build
**Error**: `main.js: no such file or directory`

**Fix**: The build might have failed. Check the "Build plugin" step logs.

## Manual Release (Recommended for Now)

Since you need to create the release anyway, here's the process:

1. **Go to**: https://github.com/btromm/math-referencer/releases
2. **Click**: "Create a new release"
3. **Choose existing tag**: `1.0.0` (should appear in dropdown)
4. **Title**: Math Referencer v1.0.0
5. **Description**: See RELEASE-STATUS.md for complete release notes
6. **Attach files**:
   - Download main.js from the repo
   - Download manifest.json from the repo  
   - Download styles.css from the repo
7. **Publish release**

## Alternative: Simpler Workflow

If the current workflow keeps failing, here's a simpler approach using the official Obsidian release action:

```yaml
name: Release Obsidian plugin

on:
  push:
    tags:
      - "*"

jobs:
  build:
    runs-on: ubuntu-latest
    
    permissions:
      contents: write

    steps:
      - uses: actions/checkout@v3

      - name: Use Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18.x"

      - name: Build plugin
        run: |
          npm install
          npm run build

      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: |
            main.js
            manifest.json
            styles.css
          draft: true
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

This uses a dedicated GitHub Action instead of the `gh` CLI, which is more reliable.

## For Future Releases

Once you get the first release working (either manually or via Actions), document what worked so you can repeat it for v1.0.1, etc.

## Quick Manual Release Steps

If Actions is too troublesome for now:

```bash
# 1. Tag the release (already done)
git tag -a 1.0.1 -m "Release 1.0.1"
git push origin 1.0.1

# 2. Build locally
npm run build

# 3. Create release on GitHub manually
# - Choose the tag
# - Upload main.js, manifest.json, styles.css
# - Publish
```

This is perfectly valid and what many Obsidian plugins do!
