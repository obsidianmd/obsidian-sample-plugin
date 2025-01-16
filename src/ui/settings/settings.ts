import { App, Modal, Setting } from "obsidian";
import type { SettingValues } from "./settings_store";
import {
	VisibilityOption,
	ScopeOption,
	defaultSettings,
} from "../settings/settings_store";
import { z } from "zod";

const VisibilityOptionSchema = z.nativeEnum(VisibilityOption);
const ScopeOptionSchema = z.nativeEnum(ScopeOption);

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
			.setName("Columns")
			.setDesc('The column names separated by a comma ","')
			.setClass("column")
			.addText((text) => {
				text.setValue(this.settings.columns.join(", "));
				text.onChange((value) => {
					this.settings.columns = value
						.split(",")
						.map((column) => column.trim());
				});
			});

		new Setting(this.contentEl)
			.setName("Folder scope")
			.setDesc("Where should we try to find tasks for this Kanban?")
			.addDropdown((dropdown) => {
				dropdown.addOption("folder", "This folder");
				dropdown.addOption("everywhere", "Every folder");
				dropdown.setValue(this.settings.scope);
				dropdown.onChange((value) => {
					const validatedValue = ScopeOptionSchema.safeParse(value);
					this.settings.scope = validatedValue.success
						? validatedValue.data
						: defaultSettings.scope;
				});
			});

		new Setting(this.contentEl)
			.setName("Show filepath")
			.setDesc("Show the filepath on each task in Kanban?")
			.addToggle((toggle) => {
				toggle.setValue(this.settings.showFilepath ?? true);
				toggle.onChange((value) => {
					this.settings.showFilepath = value;
				});
			});

		new Setting(this.contentEl)
			.setName("Uncategorized column visibility")
			.setDesc("When to show the Uncategorized column")
			.addDropdown((dropdown) => {
				dropdown
					.addOption("auto", "Hide when empty")
					.addOption("never", "Never show")
					.addOption("always", "Always show")
					.setValue(this.settings.uncategorizedVisibility ?? "auto")
					.onChange((value) => {
						const validatedValue =
							VisibilityOptionSchema.safeParse(value);
						this.settings.uncategorizedVisibility =
							validatedValue.success
								? validatedValue.data
								: defaultSettings.uncategorizedVisibility;
					});
			});

		new Setting(this.contentEl)
			.setName("Done column visibility")
			.setDesc("When to show the Done column")
			.addDropdown((dropdown) => {
				dropdown
					.addOption("always", "Always show")
					.addOption("auto", "Hide when empty")
					.addOption("never", "Never show")
					.setValue(this.settings.doneVisibility ?? "always")
					.onChange((value) => {
						const validatedValue =
							VisibilityOptionSchema.safeParse(value);
						this.settings.doneVisibility = validatedValue.success
							? validatedValue.data
							: defaultSettings.doneVisibility;
					});
			});

		new Setting(this.contentEl)
			.setName("Consolidate tags")
			.setDesc(
				"Consolidate the tags on each task in Kanban into the footer?"
			)
			.addToggle((toggle) => {
				toggle.setValue(this.settings.consolidateTags ?? false);
				toggle.onChange((value) => {
					this.settings.consolidateTags = value;
				});
			});

		new Setting(this.contentEl).addButton((btn) =>
			btn.setButtonText("Save").onClick(() => {
				this.close();
				this.onSubmit(this.settings);
			})
		);
	}

	onClose() {
		this.contentEl.empty();
	}
}
