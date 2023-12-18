# Obsidian Sample Plugin

This is a modified version of https://github.com/obsidianmd/obsidian-sample-plugin.

## Differences from the original sample plugin

- `*.ts` files are put in the `src` directory
- The plugin class definition and settings-related code are separated into `main.ts` and `settings.ts`
- [Release GitHub action](https://docs.obsidian.md/Plugins/Releasing/Release+your+plugin+with+GitHub+Actions) is already there
  - Don't forget to go to `Settings > Actions > General > Workflow permissions` and turn on `Read and write permissions`
- The default branch has been renamed `main`

## Usage

1. Create a new repository using this template ("Use this template" > "Create a new repository")
2. Clone the created repository
3. Modify at least the `id` & `name` fields in `manifest.json`.
4. Modify `package.json` accordingly.
5. Run `npm i` to install the dependencies
6. Run `npm run dev` or `npm run build` to compile your plugin

### Releasing your plugin

1. If you haven't, go to `Settings > Actions > General > Workflow permissions` and turn on `Read and write permissions`
2. Bump the version in `manifest.json` (and `package.json`) and then commit & push the change
3. `git tag -a <version> -m "<version>"`
4. `git push origin <version>`. This triggers the release action.
5. When the action is completed, go to the release page of your repository. You will find a newly created draft release.
6. Release the draft when you're ready.
