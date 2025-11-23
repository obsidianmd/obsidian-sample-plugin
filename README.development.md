# Development Guide

## Tech Stack
- **Language**: TypeScript (strict mode)
- **UI Framework**: Svelte 4
- **Build Tool**: ESBuild
- **Testing**: Vitest
- **Plugin Framework**: Obsidian API
- **Package Manager**: npm

## Build & Development Commands

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

## Testing
Run tests before every commit. Only commit if tests pass. Never disable tests
to get them to pass. Only modifiy tests to get them to pass if you are SURE
the failure is expected due to the PR. Otherwise, fix the non-test code or
check with the human operator.
