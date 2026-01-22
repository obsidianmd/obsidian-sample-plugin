# LaTeX Equations for Obsidian

Automatically number block equations and reference them across your vault with LaTeX-style `\ref` commands.

## Features

- **Automatic numbering**: Block equations (`$$...$$`) are numbered (1), (2), (3)...
- **LaTeX-style references**: Type `\ref` to search and insert equation references
- **Block references**: Embed equations with `![[file#^block-id]]`
- **Auto block IDs**: Generates IDs like `^eq-1`, `^eq-2` for equations
- **Auto-generate on save**: Optionally refresh block IDs automatically when saving
- **Custom ID preservation**: Your custom block IDs are never overwritten
- **Live Preview support**: Numbers appear in both editing and reading modes

## Installation

### BRAT (Recommended)

1. Install [BRAT](https://github.com/TfTHacker/obsidian42-brat)
2. Add beta plugin: `btromm/math-referencer`
3. Enable "LaTeX Equations" in Community Plugins

### Manual

Download `main.js`, `manifest.json`, and `styles.css` from [releases](https://github.com/btromm/math-referencer/releases) to `.obsidian/plugins/obsidian-latex-equations/`

## Usage

Write block equations:

```markdown
$$
E = mc^2
$$
^eq-1

$$
F = ma
$$
^eq-2
```

Equations are automatically numbered sequentially. Reference them using `\ref`:

1. Type `\ref` in your document
2. Select an equation from the suggestion popup
3. A link like `[[#^eq-1]]` is inserted

Or embed equations directly:

```markdown
See ![[physics#^eq-1]] for the energy-mass relation.
```

### Block IDs

Block IDs can be:
- **Auto-generated**: Use the command "Generate block IDs for all equations" to create IDs like `^eq-1`, `^eq-2`
- **Custom**: Add your own like `^my-equation` (these are never overwritten)

Auto-generated IDs (matching the pattern `prefix-number`) are refreshed when you regenerate, while custom IDs are preserved.

### Auto-Generate on Save

Enable "Auto-generate block IDs on save" in settings to automatically generate and refresh block IDs whenever you save a file. You can also toggle this with the command "Toggle auto-generate block IDs on save".

## Settings

| Setting | Description |
|---------|-------------|
| Enable automatic numbering | Toggle numbering on/off |
| Start numbering from | First equation number (default: 1) |
| Numbering format | Template like `(${num})` or `[${num}]` |
| Show file name in embeds | Display source file for cross-file embeds |
| Link render format | How equation links appear (e.g., `Equation ${num}`) |
| Block ID prefix | Prefix for auto IDs (default: `eq`) |
| Auto-generate on save | Automatically refresh block IDs when saving |
| Reference trigger | Text to trigger suggestions (default: `\ref`) |

## Commands

| Command | Description |
|---------|-------------|
| Generate block IDs for all equations | Add/refresh block IDs for all equations in the current file |
| Toggle auto-generate block IDs on save | Enable/disable automatic block ID generation on save |

## Development

```bash
npm install
npm run build    # production build
npm run dev      # watch mode
```

## License

MIT