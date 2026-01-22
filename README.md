# Math Referencer for Obsidian

Automatically number block equations and reference them across your vault.

## Features

- **Automatic numbering**: Block equations (`$$...$$`) are numbered (1), (2), (3)...
- **Section-based numbering**: Numbers follow heading hierarchy (2.1.1, 2.1.2...)
- **Block references**: Embed equations with `![[file#^block-id]]`
- **Auto block IDs**: Generates IDs like `^eq-2-1-1` based on section structure
- **Live Preview support**: Numbers appear in both editing and reading modes

## Installation

### BRAT (Recommended)

1. Install [BRAT](https://github.com/TfTHacker/obsidian42-brat)
2. Add beta plugin: `btromm/math-referencer`
3. Enable "Math Referencer" in Community Plugins

### Manual

Download `main.js`, `manifest.json`, and `styles.css` from [releases](https://github.com/btromm/math-referencer/releases) to `.obsidian/plugins/math-referencer/`

## Usage

Write block equations:

```markdown
## Section 2

### Subsection 2.1

$$
E = mc^2
$$
^eq-2-1-1

$$
F = ma
$$
^eq-2-1-2
```

Equations are automatically numbered based on their section. Reference them anywhere:

```markdown
See ![[physics#^eq-2-1-1]] for the energy-mass relation.
```

### Block IDs

Block IDs can be:
- **Auto-generated**: The plugin creates IDs like `^eq-2-1-1` based on section numbers
- **Custom**: Add your own like `^my-equation` (these won't be overwritten)

Auto-generated IDs update when you change the document structure (add headings, move equations).

## Settings

| Setting | Description |
|---------|-------------|
| Enable automatic numbering | Toggle numbering on/off |
| Section-based numbering | Use hierarchical numbers (2.1.1) vs sequential (1, 2, 3) |
| Numbering format | Template like `(${num})` or `[${num}]` |
| Auto-generate block IDs | Automatically add block IDs to equations |
| Block ID prefix | Prefix for auto IDs (default: `eq`) |

## Development

```bash
npm install
npm run build    # production build
npm run dev      # watch mode
```

## License

MIT
