import {App, PluginSettingTab, Setting} from "obsidian";
import MyPlugin from "./main";

export interface MyPluginSettings {
	impersonateBrowser: string;
	ytdlpLocation: string;
	ffmpegLocation: string;
	outputDirectory: string;
	keepVideo: boolean;
	azureEndpoint: string;
	azureApiKey: string;
	azureDeploymentName: string;
	includeTimestamps: boolean;
	transcriptionLanguage: string;
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
	impersonateBrowser: 'chrome',
	ytdlpLocation: '',
	ffmpegLocation: '',
	outputDirectory: '',
	keepVideo: false,
	azureEndpoint: '',
	azureApiKey: '',
	azureDeploymentName: '',
	includeTimestamps: true,
	transcriptionLanguage: ''
}

export class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;
	private activeTab: 'transcription' | 'ai' = 'ai';

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		const tabContainer = containerEl.createDiv('settings-tab-container');
		const tabHeader = tabContainer.createDiv('settings-tab-header');
		const tabContent = tabContainer.createDiv('settings-tab-content');

		const aiTabButton = tabHeader.createEl('button', {
			text: 'AI Settings',
			cls: 'settings-tab-button'
		});

		const transcriptionTabButton = tabHeader.createEl('button', {
			text: 'Transcription',
			cls: 'settings-tab-button'
		});

		const showTab = (tab: 'transcription' | 'ai') => {
			this.activeTab = tab;
			aiTabButton.classList.toggle('active', tab === 'ai');
			transcriptionTabButton.classList.toggle('active', tab === 'transcription');
			tabContent.empty();

			if (tab === 'ai') {
				this.displayAISettings(tabContent);
			} else if (tab === 'transcription') {
				this.displayTranscriptionSettings(tabContent);
			} else {
				console.error(`Unknown settings tab: ${tab}`);
			}
		};

		aiTabButton.addEventListener('click', () => showTab('ai'));
		transcriptionTabButton.addEventListener('click', () => showTab('transcription'));

		showTab(this.activeTab);
	}

	private displayAISettings(containerEl: HTMLElement): void {
		containerEl.createEl('h3', {text: 'Azure OpenAI Settings'});

		new Setting(containerEl)
			.setName('Azure OpenAI endpoint')
			.setDesc('Your Azure OpenAI resource endpoint (e.g., https://your-resource.openai.azure.com)')
			.addText(text => text
				.setPlaceholder('https://your-resource.openai.azure.com')
				.setValue(this.plugin.settings.azureEndpoint)
				.onChange(async (value) => {
					this.plugin.settings.azureEndpoint = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Azure OpenAI API key')
			.setDesc('Your Azure OpenAI API key')
			.addText(text => {
				text.inputEl.type = 'password';
				text.setPlaceholder('Enter your API key')
					.setValue(this.plugin.settings.azureApiKey)
					.onChange(async (value) => {
						this.plugin.settings.azureApiKey = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Whisper deployment name')
			.setDesc('The name of your Whisper model deployment in Azure OpenAI')
			.addText(text => text
				.setPlaceholder('Enter your deployment name')
				.setValue(this.plugin.settings.azureDeploymentName)
				.onChange(async (value) => {
					this.plugin.settings.azureDeploymentName = value;
					await this.plugin.saveSettings();
				}));
	}

	private displayTranscriptionSettings(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName('Impersonate browser')
			.setDesc('Browser to impersonate when extracting audio for transcription')
			.addDropdown(dropdown => dropdown
				.addOption('chrome', 'Chrome')
				.addOption('edge', 'Edge')
				.addOption('safari', 'Safari')
				.addOption('firefox', 'Firefox')
				.addOption('brave', 'Brave')
				.addOption('chromium', 'Chromium')
				.setValue(this.plugin.settings.impersonateBrowser)
				.onChange(async (value) => {
					this.plugin.settings.impersonateBrowser = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Transcription language')
			.setDesc('Language code for transcription (e.g., en, es, fr). Leave empty for automatic detection')
			.addText(text => text
				.setPlaceholder('auto-detect')
				.setValue(this.plugin.settings.transcriptionLanguage)
				.onChange(async (value) => {
					this.plugin.settings.transcriptionLanguage = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Include timestamps')
			.setDesc('Include timestamps in transcription notes for each chunk of text')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.includeTimestamps)
				.onChange(async (value) => {
					this.plugin.settings.includeTimestamps = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Keep video file')
			.setDesc('Keep the original video file after extracting audio for transcription')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.keepVideo)
				.onChange(async (value) => {
					this.plugin.settings.keepVideo = value;
					await this.plugin.saveSettings();
					this.display();
				}));

		if (this.plugin.settings.keepVideo) {
			new Setting(containerEl)
				.setName('Output directory')
				.setDesc('Directory where video files will be saved (leave empty to use ~/Videos/Obsidian)')
				.addText(text => text
					.setPlaceholder('~/Videos/Obsidian')
					.setValue(this.plugin.settings.outputDirectory)
					.onChange(async (value) => {
						this.plugin.settings.outputDirectory = value;
						await this.plugin.saveSettings();
					}));
		}

		const advancedHeading = containerEl.createEl('h3', {
			text: 'Advanced Settings',
			cls: 'settings-advanced-heading'
		});
		advancedHeading.style.cursor = 'pointer';
		advancedHeading.style.userSelect = 'none';

		const advancedContainer = containerEl.createDiv('settings-advanced-container');
		advancedContainer.style.display = 'none';

		const toggleAdvanced = () => {
			const isHidden = advancedContainer.style.display === 'none';
			advancedContainer.style.display = isHidden ? 'block' : 'none';
			advancedHeading.textContent = `${isHidden ? '▾' : '▸'} Advanced Settings`;
		};

		advancedHeading.addEventListener('click', toggleAdvanced);
		advancedHeading.textContent = '▸ Advanced Settings';

		new Setting(advancedContainer)
			.setName('yt-dlp location')
			.setDesc('Path to yt-dlp binary directory (leave empty to use system PATH)')
			.addText(text => text
				.setValue(this.plugin.settings.ytdlpLocation)
				.onChange(async (value) => {
					this.plugin.settings.ytdlpLocation = value;
					await this.plugin.saveSettings();
				}));

		new Setting(advancedContainer)
			.setName('FFmpeg location')
			.setDesc('Path to FFmpeg binary directory (leave empty to use system PATH)')
			.addText(text => text
				.setValue(this.plugin.settings.ffmpegLocation)
				.onChange(async (value) => {
					this.plugin.settings.ffmpegLocation = value;
					await this.plugin.saveSettings();
				}));

	}
}
