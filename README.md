# Math Referencer for Obsidian

An Obsidian plugin that automatically numbers block equations and enables equation block references with dynamic numbering updates.

## Features

### 🔢 Automatic Equation Numbering

Automatically numbers all block equations (display math) in your markdown files:

```markdown
$$
E = mc^2
$$
```

Will be displayed with a number like **(1)** on the right side.

### 🔗 Equation Block References

Reference equations from anywhere in your vault using Obsidian's block reference syntax:

```markdown
$$
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
$$
^quadratic-formula

Later in any file:
![[mynote#^quadratic-formula]]
```

The referenced equation will render with:
- The full equation content
- The original equation number
- A highlighted background to distinguish it as a reference

### ⚙️ Customizable Numbering

Configure equation numbering to match your preferences:
- **Start number**: Begin numbering from any number (default: 1)
- **Number format**: Customize the format with templates:
  - `(${num})` → (1), (2), (3)...
  - `[${num}]` → [1], [2], [3]...
  - `Eq. ${num}` → Eq. 1, Eq. 2, Eq. 3...

### 🚀 Performance Optimized

- **Smart caching**: Equations are cached and only re-parsed when files change
- **Batch processing**: Initial cache build processes files in batches
- **Race condition prevention**: Concurrent updates are properly synchronized
- **Memory efficient**: Automatic cleanup when files are deleted or renamed

### 🛡️ Robust Edge Case Handling

- Skips code blocks containing `$$`
- Ignores empty equations
- Handles unclosed equations gracefully
- Works with complex multi-line equations and matrices
- Properly handles special LaTeX characters

## Installation

### Manual Installation

1. Download the latest release from the releases page
2. Extract the files to your vault's plugins folder: `<vault>/.obsidian/plugins/math-referencer/`
3. Reload Obsidian
4. Enable the plugin in Settings → Community Plugins

### Development Installation

1. Clone this repository into your vault's plugins folder:
   ```bash
   cd <vault>/.obsidian/plugins/
   git clone https://github.com/yourusername/obsidian-math-referencer.git math-referencer
   cd math-referencer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the plugin:
   ```bash
   npm run build
   ```

4. Reload Obsidian and enable the plugin

## Usage

### Basic Usage

1. **Enable the plugin** in Settings → Community Plugins

2. **Write block equations** in your markdown files:
   ```markdown
   $$
   \nabla \cdot \mathbf{E} = \frac{\rho}{\epsilon_0}
   $$
   ```

3. **Equations are automatically numbered** when you view the file in reading mode or live preview

### Adding Block IDs

To reference an equation, add a block ID on the line immediately after the closing `$$`:

```markdown
$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$
^gaussian-integral
```

The block ID must:
- Start with `^`
- Be on its own line
- Contain only letters, numbers, hyphens, and underscores
- Follow immediately after the closing `$$`

### Referencing Equations

Use Obsidian's embed syntax to reference equations:

```markdown
![[filename#^block-id]]
```

Examples:
```markdown
![[physics-notes#^maxwell-1]]
![[math-formulas#^quadratic-formula]]
![[same-file#^pythagorean-identity]]
```

### Settings

Access plugin settings via Settings → Math Referencer:

- **Enable automatic numbering**: Toggle equation numbering on/off
- **Start numbering from**: Set the starting number (default: 1)
- **Numbering format**: Customize how numbers are displayed (use `${num}` as placeholder)

## Examples

### Example 1: Basic Equations

**File: physics.md**
```markdown
# Physics Formulas

Newton's second law:
$$
F = ma
$$
^newton-second

Kinetic energy:
$$
KE = \frac{1}{2}mv^2
$$
^kinetic-energy
```

**File: homework.md**
```markdown
# Homework Solutions

Using Newton's second law from my notes:
![[physics#^newton-second]]

And the kinetic energy formula:
![[physics#^kinetic-energy]]
```

### Example 2: Complex Equations

**File: quantum.md**
```markdown
# Quantum Mechanics

The time-dependent Schrödinger equation:
$$
i\hbar\frac{\partial}{\partial t}\Psi(\mathbf{r},t) = \hat{H}\Psi(\mathbf{r},t)
$$
^schrodinger-time

The time-independent form:
$$
\hat{H}\psi = E\psi
$$
^schrodinger-time-independent
```

### Example 3: Matrices

**File: linear-algebra.md**
```markdown
# Linear Algebra

Matrix multiplication:
$$
\begin{pmatrix}
a & b \\
c & d
\end{pmatrix}
\begin{pmatrix}
x \\
y
\end{pmatrix}
=
\begin{pmatrix}
ax + by \\
cx + dy
\end{pmatrix}
$$
^matrix-vector-multiply
```

## How It Works

### Architecture

1. **Markdown Post-Processing**: The plugin registers two markdown post-processors:
   - **Early processor** (priority -100): Numbers equations in the rendered document
   - **Late processor** (priority 100): Processes block references to equations

2. **Equation Cache**: Maintains a cache of all equations in the vault:
   - Maps file paths to equation information
   - Includes equation content, block IDs, and numbers
   - Automatically updates when files change

3. **Block ID Mapping**: Maintains a nested map structure:
   - `filePath → (blockId → EquationInfo)`
   - Enables fast lookups for block references

4. **Event Handling**: Listens to vault events:
   - File changes: Updates equation cache
   - File deletions: Removes from cache
   - File renames: Updates cache keys

### Performance Considerations

- **Lazy loading**: Equations are only parsed when a file is rendered
- **Cache validation**: Uses file modification time and content hash
- **Batch processing**: Initial cache build processes files in batches of 10
- **Debouncing**: Concurrent updates to the same file are deduplicated

## Troubleshooting

### Equations aren't being numbered

1. Check that the plugin is enabled in Settings → Community Plugins
2. Verify that "Enable automatic numbering" is turned on in plugin settings
3. Make sure you're using block equations (`$$...$$`), not inline math (`$...$`)
4. Ensure equations are not inside code blocks

### Block references aren't rendering

1. Verify the block ID is correctly formatted (starts with `^`, on its own line)
2. Make sure the block ID is on the line immediately after the closing `$$`
3. Check that the file path in the reference is correct
4. Look for errors in the developer console (Ctrl+Shift+I or Cmd+Option+I)

### Equation numbers are incorrect

1. Try closing and reopening the file
2. Check if there are empty equations or equations in code blocks
3. Verify the "Start numbering from" setting
4. Reload Obsidian to rebuild the cache

### Performance issues

1. Check the console for errors during initial cache build
2. Try disabling and re-enabling the plugin
3. If you have a very large vault (1000+ files), the initial cache build may take a minute

### Equations not rendering in references

1. Ensure MathJax is enabled in Obsidian
2. Check browser console for MathJax errors
3. Verify the equation syntax is valid LaTeX

## Limitations

- Only block equations (`$$...$$`) are numbered, not inline math (`$...$`)
- Equation numbering is per-file, not global across the vault
- The plugin requires Obsidian's native MathJax rendering
- Block IDs must follow the equation immediately (no blank lines)

## Development

### Building from Source

```bash
# Install dependencies
npm install

# Development build with watch mode
npm run dev

# Production build
npm run build

# Type checking only
npm run build -- --watch
```

### Testing

See `TEST-PLAN.md` for the comprehensive testing strategy.

Test files are included:
- `test-equations.md` - Various equations with block IDs
- `test-references.md` - Block references to equations

### Project Structure

```
math-referencer/
├── main.ts              # Plugin source code
├── manifest.json        # Plugin metadata
├── styles.css          # Plugin styles
├── package.json        # NPM dependencies
├── tsconfig.json       # TypeScript configuration
├── esbuild.config.mjs  # Build configuration
├── test-equations.md   # Test file with equations
├── test-references.md  # Test file with references
├── TEST-PLAN.md        # Testing documentation
└── README.md           # This file
```

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

- Report bugs via GitHub Issues
- Feature requests welcome
- For questions, see the Obsidian forum

## Credits

Created for the Obsidian community. Built with the Obsidian Plugin API.

## Changelog

### Version 1.0.0

- Initial release
- Automatic equation numbering
- Block reference support
- Customizable numbering format
- Performance optimizations
- Comprehensive edge case handling

## Acknowledgments

- Obsidian team for the excellent API
- Community plugin developers for inspiration
- MathJax for equation rendering
