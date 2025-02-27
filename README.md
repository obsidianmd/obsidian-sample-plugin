# GitHub Sync Plugin for Obsidian

## 🌟 Overview
This **GitHub Sync Plugin** allows you to synchronize your Obsidian notes with a GitHub repository using the **GitHub API** (without `isomorphic-git`). It works across **Windows, Linux, Android, and iOS**.

## 🚀 Features
- **Clone** repository (manual setup required)
- **Pull** latest changes from GitHub
- **Commit** with a default message `#`
- **Push** changes to GitHub
- **Authentication** via GitHub Personal Access Token (hidden after first input)

## 📥 Installation

### **Manual Installation**
1. Download the latest release from [GitHub Releases](#).
2. Copy these files to your Obsidian plugin directory:
   - `dist/main.js`
   - `manifest.json`
   - `versions.json`
3. Restart Obsidian and enable the plugin from **Settings → Community Plugins**.

**Plugin Folder Path:**
- **Windows:** `%APPDATA%\Obsidian\plugins\github-sync`
- **Linux:** `~/.config/Obsidian/plugins/github-sync`
- **Android:** `/storage/emulated/0/Obsidian/.obsidian/plugins/github-sync`
- **iOS:** (Community Plugin installation required)

## 🔧 Setup
1. **Go to Plugin Settings** (`Settings → Community Plugins → GitHub Sync`)
2. **Enter your GitHub details:**
   - Repository Owner (your GitHub username or organization)
   - Repository Name
   - Branch Name (default: `main`)
   - Authentication Token *(hidden after first input)*
   - Folder Path (subfolder in repo to sync, default: `/`)
3. **Save settings and restart Obsidian**.

## 📌 Usage

### **Pull Latest Changes**
1. Open **Command Palette** (`Ctrl + P` or `Cmd + P` on macOS)
2. Search for **Pull from GitHub** and execute it.
3. The latest changes will be downloaded into Obsidian.

### **Commit & Push**
1. Open **Command Palette**
2. Search for **Commit & Push** and execute it.
3. All files in the specified folder will be committed and pushed with the message `#`.

## 🛠️ Build from Source
To build this plugin from source:
```sh
npm install
npm run build
```
This generates the `dist/` folder with the necessary files.

## 📢 Contributing
Want to improve this plugin? Feel free to fork this repository and submit a pull request!

## 📜 License
This project is licensed under the **MIT License**.

## ❓ FAQ
### *Why is my authentication token hidden after first input?*
This is a security feature to prevent accidental exposure of your GitHub token.

### *Can I sync only a specific folder from my repository?*
Yes! Set the **Folder Path** in settings to the specific subfolder you want to sync.

### *How do I update the plugin?*
Download the latest version and replace the existing files in your Obsidian plugin folder.

---
🚀 **Enjoy seamless GitHub sync in Obsidian!**

