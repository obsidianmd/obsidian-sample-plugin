import type { App } from "obsidian";
import { PluginSettingTab, Setting } from "obsidian";
import type { SamplePlugin } from "./SamplePlugin.ts";

// Remember to rename these classes and interfaces!

export class SampleSettingTab extends PluginSettingTab {
	plugin: SamplePlugin;

	constructor(app: App, plugin: SamplePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
