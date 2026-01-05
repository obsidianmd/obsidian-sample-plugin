#!/bin/bash

# Determine target directory
if [ -n "$1" ]; then
    TARGET_DIR="$1"
else
    TARGET_DIR="$OBSIDIAN_TEST_INSTANCE/.obsidian/plugins/task-list-kanban"
fi

# Check if target directory is set
if [ -z "$TARGET_DIR" ]; then
    echo "Error: No target directory specified and OBSIDIAN_TEST_INSTANCE is not set"
    echo "Usage: ./deploy_for_manual_test.sh [target-directory]"
    echo "Note: OBSIDIAN_TEST_INSTANCE will be available after sourcing .zshrc"
    exit 1
fi

# Create target directory if it doesn't exist
mkdir -p "$TARGET_DIR"

# Get script directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/.."

# Copy files
echo "Copying files to $TARGET_DIR..."
cp "$PROJECT_ROOT/main.js" "$TARGET_DIR/"
cp "$PROJECT_ROOT/manifest.json" "$TARGET_DIR/"
cp "$PROJECT_ROOT/styles.css" "$TARGET_DIR/"

echo "✓ Files copied successfully to $TARGET_DIR"
