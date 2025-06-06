# AGENT.md - Development Guide

## Commands
- **Build**: `npm run build` - TypeScript check + production build
- **Dev**: `npm run dev` - Development build with esbuild
- **Test**: `npm run test` - Run all tests with vitest
- **Test single**: `npx vitest run [pattern]` - Run specific test file/pattern
- **Lint**: Check eslint config, no script defined

## Code Style
- **Language**: TypeScript with Svelte UI components
- **Imports**: Standard ES6 imports, relative paths for local files
- **Types**: Strict TypeScript with `noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess`
- **Naming**: camelCase for variables/functions, PascalCase for classes/components, kebab-case for files
- **Files**: Use kebab-case for file names (e.g., `kebab.ts`, `tags.ts`)
- **Tabs**: Use tabs for indentation (per .editorconfig)
- **ESLint**: No unused vars, TypeScript recommended rules, ban-ts-comment off

## Architecture
- **Entry**: Plugin extends Obsidian Plugin class in `src/entry.ts`
- **UI**: Svelte components in `src/ui/`
- **Parsing**: Tag and content parsing logic in `src/parsing/`
- **Tests**: Co-located in `tests/` subdirectories with `.tests.ts` suffix
- **Dependencies**: Obsidian plugin, Svelte, Zod for validation, crypto-js, showdown
