#!/bin/bash
WORKSPACE="$(realpath $PWD)"
PLUGIN_NAME="$(basename $PWD)"

# Fix issue with gtk file picker being to big.
gsettings set org.gtk.Settings.FileChooser window-size "(800, 600)"
gsettings set org.gtk.Settings.FileChooser window-position '(0,0)'

# You will want to see hidden files by default for plugin development.
gsettings set org.gtk.Settings.FileChooser show-hidden true

# Bulding temp vault for testing plugin
mkdir -p ~/vault
cp -R $PWD/.devcontainer/.obsidian ~/vault/.obsidian
mkdir -p ~/vault/.obsidian/plugins
PLUGIN_DIR="$(realpath "$HOME/vault/.obsidian/plugins")"
ln -sf $WORKSPACE "$PLUGIN_DIR/$PLUGIN_NAME"
mkdir -p ~/.config/obsidian

# Make obsidian open the temp vault by default
cp $PWD/.devcontainer/obsidian.json ~/.config/obsidian

echo "PLUGIN_DIR: $PLUGIN_DIR"
echo "PLUGIN_NAME: $PLUGIN_NAME"
echo "WORKSPACE: $WORKSPACE"
