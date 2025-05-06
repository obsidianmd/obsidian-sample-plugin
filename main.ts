import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';

// Definition of settings interface
interface AutoArchiveFleetingNoteSettings {
	fleetingFolder: string;
	archiveFolder: string;
	daysThreshold: number;
	autoRunOnStartup: boolean; // Setting to control automatic execution on startup
}

const DEFAULT_SETTINGS: AutoArchiveFleetingNoteSettings = {
	fleetingFolder: 'Fleeting',  // Default name for Fleeting folder
	archiveFolder: 'Archives',   // Default name for Archives folder
	daysThreshold: 7,            // Default days threshold for note movement (7 days)
	autoRunOnStartup: true,      // Default to run automatically on startup
}

export default class AutoArchiveFleetingNotesPlugin extends Plugin {
	settings: AutoArchiveFleetingNoteSettings;

	async onload() {
		await this.loadSettings();

		// Add command
		this.addCommand({
			id: 'move-fleeting-notes-to-archive',
			name: 'Move Fleeting Notes to Archive',
			callback: async () => {
				const movedCount = await this.moveFleetingNotes();
				new Notice(`${movedCount} note(s) moved to Archive.`);
			},
		});

		// Add setting tab
		this.addSettingTab(new AutoArchiveFleetingNotesSettingTab(this.app, this));

		// Execute after metadata loading is complete
		this.app.workspace.onLayoutReady(async () => {
			if (this.settings.autoRunOnStartup) {
				try {
					const movedCount = await this.moveFleetingNotes();
					if (movedCount > 0) {
						new Notice(`Auto-Archive: ${movedCount} note(s) moved to Archive.`);
					}
				} catch (error) {
					console.error("Auto-Archive failed:", error);
					new Notice("Auto-Archive failed. Check console for details.");
				}
			}
		});
	}

	// Load settings
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	// Save settings
	async saveSettings() {
		await this.saveData(this.settings);
	}

	// Function to move Fleeting notes
	async moveFleetingNotes(): Promise<number> {
		const { fleetingFolder, archiveFolder, daysThreshold } = this.settings;
		const now = Date.now();
		let movedCount = 0; // Counter for moved files

		// Get all files
		const files = this.app.vault.getFiles();

		for (const file of files) {
			// Target notes in the Fleeting folder
			if (file.path.startsWith(fleetingFolder + '/')) {
				const created = this.getCreatedDate(file);  // Get created:: metadata

				// Use file creation time if metadata not available
				const fileDate = created || file.stat.ctime;

				if (fileDate && now - fileDate > daysThreshold * 86400000) {
					// Check if archive folder exists, create if needed
					const archivePath = archiveFolder + '/' + file.path.substring(fleetingFolder.length + 1);
					const archiveDir = archivePath.substring(0, archivePath.lastIndexOf('/'));

					try {
						// Create necessary directories
						if (archiveDir && archiveDir !== archiveFolder) {
							if (!await this.app.vault.adapter.exists(archiveDir)) {
								await this.app.vault.createFolder(archiveDir);
							}
						}

						// Move file
						await this.app.vault.rename(file, archivePath);
						movedCount++;  // Increment move counter
						console.log(`Moved file: ${file.path} to ${archivePath}`);
					} catch (error) {
						console.error(`Failed to move file ${file.path}:`, error);
					}
				}
			}
		}

		return movedCount; // Return number of moved files
	}

	// Get created:: metadata
	getCreatedDate(file: TFile): number | null {
		const metadata = this.app.metadataCache.getFileCache(file);
		if (!metadata) return null;

		const created = metadata?.frontmatter?.created;
		if (created && !isNaN(Date.parse(created))) {
			return Date.parse(created);
		}
		return null;
	}
}

// Create settings tab
class AutoArchiveFleetingNotesSettingTab extends PluginSettingTab {
	plugin: AutoArchiveFleetingNotesPlugin;

	constructor(app: App, plugin: AutoArchiveFleetingNotesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		// Fleeting folder name setting
		new Setting(containerEl)
			.setName('Fleeting Folder')
			.setDesc('Specify the folder where Fleeting notes are stored.')
			.addText(text => text
				.setPlaceholder('Enter Fleeting folder name')
				.setValue(this.plugin.settings.fleetingFolder)
				.onChange(async (value) => {
					this.plugin.settings.fleetingFolder = value;
					await this.plugin.saveSettings();
				}));

		// Archives folder name setting
		new Setting(containerEl)
			.setName('Archive Folder')
			.setDesc('Specify the folder where Fleeting notes will be moved to.')
			.addText(text => text
				.setPlaceholder('Enter Archive folder name')
				.setValue(this.plugin.settings.archiveFolder)
				.onChange(async (value) => {
					this.plugin.settings.archiveFolder = value;
					await this.plugin.saveSettings();
				}));

		// Days threshold setting
		new Setting(containerEl)
			.setName('Days Threshold')
			.setDesc('Specify the number of days after which Fleeting notes will be moved to the Archive.')
			.addText(text => text
				.setPlaceholder('Enter number of days')
				.setValue(this.plugin.settings.daysThreshold.toString())
				.onChange(async (value) => {
					const days = parseInt(value);
					if (!isNaN(days)) {
						this.plugin.settings.daysThreshold = days;
						await this.plugin.saveSettings();
					}
				}));

		// Auto run on startup setting
		new Setting(containerEl)
			.setName('Auto Run on Startup')
			.setDesc('Automatically archive fleeting notes when Obsidian starts.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoRunOnStartup)
				.onChange(async (value) => {
					this.plugin.settings.autoRunOnStartup = value;
					await this.plugin.saveSettings();
				}));
	}
}