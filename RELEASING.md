# Release Guide

This guide explains how to create and publish releases for the Math Referencer plugin.

## Quick Start

To create a new release, simply push a git tag:

```bash
# Update version numbers in manifest.json, package.json, and versions.json
# Then create and push a tag:
git tag -a 1.0.1 -m "Release version 1.0.1"
git push origin 1.0.1
```

GitHub Actions will automatically build and create a draft release.

## Detailed Release Process

### 1. Update Version Numbers

Update the version in three files:

**manifest.json:**
```json
{
  "version": "1.0.1"
}
```

**package.json:**
```json
{
  "version": "1.0.1"
}
```

**versions.json:**
```json
{
  "1.0.0": "0.15.0",
  "1.0.1": "0.15.0"
}
```

The format for `versions.json` is: `"plugin-version": "minimum-obsidian-version"`

### 2. Commit Version Changes

```bash
git add manifest.json package.json versions.json
git commit -m "Bump version to 1.0.1"
git push
```

### 3. Create and Push Git Tag

```bash
git tag -a 1.0.1 -m "Release version 1.0.1"
git push origin 1.0.1
```

### 4. GitHub Actions Workflow

The workflow (`.github/workflows/release.yml`) will automatically:

1. Checkout the code
2. Install Node.js dependencies
3. Build the plugin (`npm run build`)
4. Create a draft GitHub release
5. Attach these files to the release:
   - `main.js` (compiled plugin)
   - `manifest.json` (plugin metadata)
   - `styles.css` (plugin styles)

### 5. Review and Publish

1. Go to your repository's Releases page on GitHub
2. Find the draft release
3. Review the attached files
4. Add release notes describing changes
5. Click "Publish release"

## Using npm version Commands

You can automate version bumping with npm:

```bash
# For bug fixes (1.0.0 -> 1.0.1)
npm version patch

# For new features (1.0.0 -> 1.1.0)
npm version minor

# For breaking changes (1.0.0 -> 2.0.0)
npm version major
```

**Note:** You still need to manually update `versions.json` and push the tag.

## BRAT Integration

Once a release is published:

1. BRAT users will be automatically notified of the update
2. They can update directly from BRAT settings
3. No manual installation required

## Troubleshooting

### Release workflow fails

Check the Actions tab in your GitHub repository to see the error logs.

Common issues:
- Build errors: Fix TypeScript errors and test locally with `npm run build`
- Missing files: Ensure `main.js`, `manifest.json`, and `styles.css` exist after build

### Tag already exists

If you need to update a tag:
```bash
git tag -d 1.0.1  # Delete locally
git push origin :refs/tags/1.0.1  # Delete remotely
# Then create the tag again
```

### Release not showing in BRAT

- Ensure the release is published (not draft)
- Check that all required files are attached
- Wait a few minutes for GitHub to propagate changes

## Version Numbering Guidelines

Follow semantic versioning (semver):

- **MAJOR** (X.0.0): Breaking changes, incompatible API changes
- **MINOR** (0.X.0): New features, backward compatible
- **PATCH** (0.0.X): Bug fixes, backward compatible

Examples:
- Bug fix: 1.0.0 → 1.0.1
- New feature: 1.0.1 → 1.1.0
- Breaking change: 1.1.0 → 2.0.0

## First Release Checklist

For the initial 1.0.0 release:

- [ ] All features tested and working
- [ ] README.md is complete
- [ ] TEST-PLAN.md is up to date
- [ ] versions.json has initial entry
- [ ] manifest.json has correct metadata
- [ ] GitHub Actions workflow is set up
- [ ] Tag 1.0.0 created and pushed
- [ ] Release published on GitHub

After the first release:
- [ ] Test BRAT installation
- [ ] Verify auto-update works
- [ ] Share with beta testers

## Resources

- [Obsidian Plugin Guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines)
- [BRAT Plugin](https://github.com/TfTHacker/obsidian42-brat)
- [Semantic Versioning](https://semver.org/)
