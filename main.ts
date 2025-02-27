import { Plugin, PluginSettingTab, Setting, Notice, App } from "obsidian";

interface GitHubSyncSettings {
    repoOwner: string;
    repoName: string;
    branch: string;
    authToken: string;
    folderPath: string;
}

const DEFAULT_SETTINGS: GitHubSyncSettings = {
    repoOwner: "",
    repoName: "",
    branch: "main",
    authToken: "",
    folderPath: "/",
};

export default class GitHubSyncPlugin extends Plugin {
    settings: GitHubSyncSettings;

    async onload() {
        await this.loadSettings();
        this.addSettingTab(new GitHubSyncSettingTab(this.app, this));

        this.addCommand({
            id: "github-pull",
            name: "Pull from GitHub",
            callback: () => this.pullFromGitHub(),
        });

        this.addCommand({
            id: "github-add-commit-push",
            name: "Commit & Push",
            callback: () => this.commitAndPush(),
        });
    }

    async pullFromGitHub() {
        try {
            const response = await fetch(
                `https://api.github.com/repos/${this.settings.repoOwner}/${this.settings.repoName}/contents/${this.settings.folderPath}?ref=${this.settings.branch}`,
                {
                    headers: { Authorization: `token ${this.settings.authToken}` },
                }
            );

            if (!response.ok) throw new Error(`Failed to fetch files: ${response.statusText}`);

            const files = await response.json();
            for (const file of files) {
                if (file.type === "file") {
                    const contentResponse = await fetch(file.download_url);
                    const content = await contentResponse.text();
                    const filePath = `${this.settings.folderPath}/${file.name}`;
                    await this.app.vault.adapter.write(filePath, content);
                }
            }

            new Notice("Pull completed successfully!");
        } catch (error) {
            console.error("GitHub Pull Error:", error);
            new Notice("GitHub Pull failed. Check console.");
        }
    }

    async commitAndPush() {
        try {
            const files = await this.app.vault.adapter.list(this.settings.folderPath);
            for (const filePath of files.files) {
                if (!filePath.startsWith(this.settings.folderPath)) continue;

                const content = await this.app.vault.adapter.read(filePath);
                const base64Content = btoa(unescape(encodeURIComponent(content)));

                // Fetch the existing file metadata (needed for updating a file on GitHub)
                const metadataResponse = await fetch(
                    `https://api.github.com/repos/${this.settings.repoOwner}/${this.settings.repoName}/contents/${filePath}`,
                    {
                        headers: {
                            Authorization: `token ${this.settings.authToken}`,
                        },
                    }
                );

                let sha = "";
                if (metadataResponse.ok) {
                    const metadata = await metadataResponse.json();
                    sha = metadata.sha; // GitHub requires the SHA of existing files
                }

                // Commit and push
                const response = await fetch(
                    `https://api.github.com/repos/${this.settings.repoOwner}/${this.settings.repoName}/contents/${filePath}`,
                    {
                        method: "PUT",
                        headers: {
                            Authorization: `token ${this.settings.authToken}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            message: "#",
                            content: base64Content,
                            branch: this.settings.branch,
                            sha: sha || undefined, // If file is new, omit SHA
                        }),
                    }
                );

                if (!response.ok) throw new Error(`Failed to commit: ${response.statusText}`);
            }

            new Notice("Commit & Push successful!");
        } catch (error) {
            console.error("GitHub Commit & Push Error:", error);
            new Notice("Commit & Push failed. Check console.");
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

class GitHubSyncSettingTab extends PluginSettingTab {
    plugin: GitHubSyncPlugin;

    constructor(app: App, plugin: GitHubSyncPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        new Setting(containerEl)
            .setName("GitHub Repository Owner")
            .setDesc("Enter your GitHub username or organization.")
            .addText(text => text
                .setValue(this.plugin.settings.repoOwner)
                .onChange(async (value) => {
                    this.plugin.settings.repoOwner = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName("GitHub Repository Name")
            .setDesc("Enter your GitHub repository name.")
            .addText(text => text
                .setValue(this.plugin.settings.repoName)
                .onChange(async (value) => {
                    this.plugin.settings.repoName = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName("Branch Name")
            .setDesc("Branch to sync with (default: main).")
            .addText(text => text
                .setValue(this.plugin.settings.branch)
                .onChange(async (value) => {
                    this.plugin.settings.branch = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName("GitHub Auth Token")
            .setDesc("Enter your GitHub authentication token (hidden after input).")
            .addText(text => text
                .setValue(this.plugin.settings.authToken ? "********" : "")
                .onChange(async (value) => {
                    this.plugin.settings.authToken = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName("Folder Path")
            .setDesc("Enter the folder path in the repository to sync with.")
            .addText(text => text
                .setValue(this.plugin.settings.folderPath)
                .onChange(async (value) => {
                    this.plugin.settings.folderPath = value;
                    await this.plugin.saveSettings();
                }));
    }
}
