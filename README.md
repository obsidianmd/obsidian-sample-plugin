# ChessMate Plugin for Obsidian

**ChessMate Plugin** is a plugin for [Obsidian](https://obsidian.md) that enables displaying chess games and positions in PGN and FEN formats directly within your notes. The plugin uses the `lichess-pgn-viewer` library to render boards and pieces.

---

## Features

- **Display Chess Games**: 
  Use code blocks with the `chessmate` type to visualize chess games in PGN format.

- **Customizable Display**:
  Supports configuration for board themes, piece styles, and board size.

- **Chess Notation Support**:
  Replay and study games with textual annotations and comments.

---

## Installation

### Manual Installation
1. Download the `manifest.json`, `main.js`, and `styles.css` files from the latest release in the [repository](#).
2. Place them in the `.obsidian/plugins/chessmate-plugin/` folder of your vault.
3. Reload Obsidian and activate the plugin in **Settings > Community Plugins**.

---

## Usage

### Displaying a Chess Game
Insert the following example into your note:
```markdown
```chessmate
[Event "Example Game"]
[Site "Obsidian"]
[Date "2024.12.01"]
[Round "?"]
[White "Player1"]
[Black "Player2"]
1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5
