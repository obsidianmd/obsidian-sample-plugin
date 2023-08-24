# Obsidian Sample Plugin

This is a sample plugin for Obsidian [https://obsidian.md](https://obsidian.md).

This project uses Typescript to provide type checking and documentation.
The repo depends on the latest plugin API (obsidian.d.ts) in Typescript Definition format, which contains TSDoc comments describing what it does.

This sample plugin demonstrates some of the basic functionality the plugin API can do.

- Adds a ribbon icon, which shows a Notice when clicked.
- Adds a command "Open Sample Modal" which opens a Modal.
- Adds a plugin setting tab to the settings page.
- Registers a global click event and output 'click' to the console.
- Registers a global interval which logs 'setInterval' to the console.

## API Documentation

See [here](https://github.com/obsidianmd/obsidian-api)

## Local changes (ocx)

1. Add [husky](https://typicode.github.io/husky/getting-started.html) and commitlint

- `npx husky-init && npm install`
- `npm i @commitlint/cli @commitlint/config-convential -D`

2. Add esbuild internal 'plugin' to copy files to right place (dev and prod)


