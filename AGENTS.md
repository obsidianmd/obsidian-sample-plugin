BEFORE ANYTHING ELSE: run 'bd quickstart' and follow the instructions

## Project Information

### Testing

Run tests before every commit. Only commit if tests pass. Never disable tests
to get them to pass. Only modifiy tests to get them to pass if you are SURE
the failure is expected due to the PR. Otherwise, fix the non-test code or
check with the human operator.

### Tech Stack
- **Language**: TypeScript (strict mode)
- **UI Framework**: Svelte 4
- **Build Tool**: ESBuild
- **Testing**: Vitest
- **Plugin Framework**: Obsidian API
- **Package Manager**: npm

### Build & Development Commands

**Development**
```bash
npm run dev
```
Starts ESBuild in watch mode for live development. Built files go to root directory.

**Build (Production)**
```bash
npm run build
```
Runs TypeScript type checking (`tsc -noEmit -skipLibCheck`) then builds optimized bundle with ESBuild. Always run this before releasing to catch type errors.

**Test**
```bash
npm test
```
Runs the Vitest test suite. Tests are located in `src/` alongside source files.

**Version Bump**
```bash
npm run version
```
Automated script that updates version in manifest.json and versions.json, then stages the files for commit.

### Commit Message Standards

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

### Landing the plane

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

### Release Process

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

### PR and Release Note Structure

#### Pull Request Messages
- PR descriptions should end with a note indicating they were created with a coding agent
- Format: `Created in collaboration with [Amp](https://ampcode.com)`

#### Release Notes
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

### Project Structure
- `src/entry.ts` - Plugin entry point
- `src/ui/` - Svelte UI components and views
- `src/ui/tasks/` - Task model, store, and actions
- `src/parsing/` - Parsing utilities (tags, kebab case)
- `src/ui/settings/` - Settings store and configuration
- `specs/` - Design documents (tracked in git)
- `tmp_specs/` - Temporary planning artifacts (gitignored)

## Planning & Documentation

### Planning Artifacts Naming Convention
- Design documents and plans in the `specs/` directory should follow this naming convention:
  - Format: `SPEC_XXXX__STATUS__TITLE.md` where XXXX is a 4-digit sequential number
  - Status can be: `IN_PROGRESS`, `COMPLETE`, `CANCELLED`, etc.
  - Example: `SPEC_0001__COMPLETE__FILTER_SAVE_DESIGN.md`
- Date of implementation should be included in the file content as: `Implemented: YYYY-MM`

### Temporary Planning Artifacts
- Temporary planning artifacts (drafts, exploration notes, implementation logs) should go in `tmp_specs/`
- The `tmp_specs/` directory is gitignored and not tracked in version control
- Examples: implementation logs, rough drafts, temporary analysis documents

### Plan Document Structure & Style Guide

**Required Sections:**
1. **Status line** at top (e.g., `Status: COMPLETE`, `Status: IN_PROGRESS`)
2. **Implemented date** (for completed specs): `Implemented: YYYY-MM`
3. **Feature Request Summary** - Brief description and link to issue/PR
4. **User Requirements** - Numbered list of requirements
5. **High-Level Design** - Architecture, UI mockups, data models
6. **Detailed Behavior** - Specific behavior specifications
7. **Implementation Plan** - Phased approach with tracking

**Implementation Plan Format:**
- Break work into **testable vertical slices** - each phase should deliver a working, testable feature increment
- **Not testable until the end = wrong approach** - avoid phases based purely on technical layers (e.g., "add data model", "add UI", "add logic")
- **Testable increments = right approach** - each phase should work end-to-end (e.g., "basic filtering with manual input", "add autocomplete", "add persistence")
- Each phase should have:
  - **Phase number and name**
  - **Goal statement** - What working feature this phase delivers
  - **Numbered task list** with checkboxes (✅ when complete)
  - **Deliverable** - Concrete, testable outcome
  - **Implemented by** - Link to commit(s) or PR(s) that completed the phase
  
**Example Implementation Phase:**
```markdown
### Phase 1: Basic Add & Load (Content Filters Only) ✅ COMPLETE
**Goal:** User can save a content filter and reload it from dropdown

1. ✅ Add types to settings store
2. ✅ Update parsing functions
3. ✅ Add state to track saved filters
4. ✅ Implement Add logic
5. ✅ Test: Add filter, close/reopen board, verify persistence

**Deliverable:** Working save/load for content filters

**Implemented by:** [99a67b6](https://github.com/ErikaRS/task-list-kanban/commit/99a67b6)
```

**Tracking Guidelines:**
- Mark tasks with ✅ as they're completed
- Add phase status after title: `✅ COMPLETE`, `🚧 IN PROGRESS`, or leave blank if not started
- Link to commits using short hash: `[99a67b6](full-commit-url)`
- Link to PRs using number: `[#51](full-pr-url)`
- Update the filename status when all phases complete (rename `IN_PROGRESS` → `COMPLETE`)
- Keep the plan document as source of truth - update it as implementation evolves
