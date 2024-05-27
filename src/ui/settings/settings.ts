//

import { App, Modal, Setting } from "obsidian";

export type SettingValues = {
	include: string;
};

export class SettingsModal extends Modal {
	constructor(
		app: App,
		private settings: SettingValues,
		private readonly onSubmit: (newSettings: SettingValues) => void
	) {
		super(app);
	}
	onOpen() {
		this.contentEl.createEl("h1", { text: "Settings" });

		new Setting(this.contentEl)
			.setName("Include paths glob")
			.addText((text) => {
				text.setValue(this.settings.include);
				text.onChange((value) => {
					this.settings.include = value;
				});
			});

		new Setting(this.contentEl).addButton((btn) =>
			btn
				.setButtonText("Submit")
				.setCta()
				.onClick(() => {
					this.close();
					this.onSubmit(this.settings);
				})
		);
	}

	onClose() {
		this.contentEl.empty();
	}
}
