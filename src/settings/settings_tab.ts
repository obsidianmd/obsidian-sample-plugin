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
			.setDesc("The users who will share the board, separated by a comma")
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

		new Setting(containerEl)
			.setName("Columns")
			.setDesc(
				"The columns that you wish to show up on the board, separated by a comma"
			)
			.addText((text) =>
				text
					.setPlaceholder("This week, Today")
					.setValue(this.plugin.settings.columns.join(", "))
					.onChange(async (value) => {
						this.plugin.settings.columns = value
							? value.split(", ")
							: [];
						await this.plugin.saveSettings();
					})
			);
	}
}
