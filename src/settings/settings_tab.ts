import type Base from "../entry";
import { App, PluginSettingTab, Setting } from "obsidian";

export class SettingTab extends PluginSettingTab {
	plugin: Base;

	constructor(app: App, plugin: Base) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Users")
			.setDesc("The users who will share this Kanban")
			.addText((text) =>
				text
					.setPlaceholder("Kate, Chris")
					.setValue(this.plugin.settings.users.join(", "))
					.onChange(async (value) => {
						this.plugin.settings.users = value
							? value.split(", ")
							: [];
						await this.plugin.saveSettings();
					})
			);
	}
}
