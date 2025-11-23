# Process Guide

## Commit Message Standards

This project follows [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) for clear, structured commit messages.

**Format:** `<type>[optional scope]: <description>`

**Common Types:**
- `feat:` - New feature (MINOR version bump)
- `fix:` - Bug fix (PATCH version bump)
- `docs:` - Documentation changes
- `refactor:` - Code refactoring without behavior change
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks (dependencies, config)
- `perf:` - Performance improvements
- `style:` - Code style/formatting changes

**Breaking Changes:** Add `!` after type/scope to indicate breaking changes (MAJOR version bump)
- Example: `feat!: redesign settings API`
- Or use `BREAKING CHANGE:` footer in commit body

**AI Assistance Attribution:**
- **REQUIRED**: All commits created with AI assistance MUST include attribution in the commit body
- Add a blank line after the description, then add: `Created in collaboration with Amp (https://ampcode.com)`
- This applies to ALL commits, not just PRs

**Examples:**
```
feat: add column reordering via drag and drop

Created in collaboration with Amp (https://ampcode.com)
```

```
fix(parser): handle special characters in tag names

Fixed an issue where tags containing parentheses or quotes
would break the parser.

Created in collaboration with Amp (https://ampcode.com)
```

```
docs: update installation instructions
```

Full specification: https://www.conventionalcommits.org/en/v1.0.0/

## Landing the plane

Before completig any spec, after completing any issue in Beads, and before
cutting a release, make sure to "land the plane". This means:

- Make sure tests and other quality gates pass
- Remove debugging code and temp artifacts
- Check for leftover git stashes
- Check for unmerged git branches
- Update and close GH and Beads
- Update documentation
- Perform git operations
- Deal with untracked files and edge cases
- Choose work and create a prompt for next session

## Release Process

1. **Run build & tests** to ensure everything works:
   ```bash
   npm run build
   npm test
   ```

2. **Update version** in package.json, manifest.json, and versions.json (use semver)

3. **Commit the version change** (using conventional commit format):
   ```bash
   git add package.json manifest.json versions.json
   git commit -m "chore: bump version to X.Y.Z"
   ```

4. **Create and push tag**:
   ```bash
   git tag -a X.Y.Z -m "X.Y.Z"
   git push origin X.Y.Z
   ```

5. **GitHub Action automatically runs**:
   - Builds the plugin
   - Creates a draft release with main.js, manifest.json, and styles.css

6. **Publish release**:
   - Go to [releases page](https://github.com/ErikaRS/task-list-kanban/releases)
   - Edit the draft release
   - Add release notes (see Release Note Structure below)
   - Publish

## PR and Release Note Structure

### Pull Request Messages
- PR descriptions should end with a note indicating they were created with a coding agent
- Format: `Created in collaboration with [Amp](https://ampcode.com)`

### Release Notes
Release notes should be informative and comprehensive, covering all changes since the last tagged release.

**Format:**
- **Features first**, then bug fixes
- List items **in order of impact** (most impactful first)
- Include **links to PRs** that implement changes: `[#123](PR-URL)`
- Include **links to issues** that are fixed: `Fixes [#456](issue-URL)`
- Include messages about **large refactorings** at the end (e.g., changing out significant components)
- **Omit small refactorings** (e.g., local code restructuring, minor cleanups)

**Example:**
```markdown
## Features
- Added saved filters feature allowing users to save and quickly apply filter combinations [#51](PR-URL)
- New tag consolidation option to move all non-column tags to task footer for cleaner display [#48](PR-URL)

## Bug Fixes
- Fixed issue where tasks with special characters in tags weren't parsed correctly. Fixes [#47](issue-URL) [#49](PR-URL)
- Resolved column color not persisting after reload [#46](PR-URL)

## Internal Changes
- Migrated from custom state management to Svelte stores for improved reactivity
```
