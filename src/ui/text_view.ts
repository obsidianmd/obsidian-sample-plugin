import { TextFileView, WorkspaceLeaf } from "obsidian";
import matter from "front-matter";

import Main from "./main.svelte";
import type { Settings } from "../entry";
import { SettingValues, SettingsModal } from "./settings/settings";

export const KANBAN_VIEW_NAME = "kanban-view";

export class KanbanView extends TextFileView {
	private localSettings: SettingValues = { include: "" };

	component: Main | undefined;
	icon = "kanban-square";

	constructor(leaf: WorkspaceLeaf, private readonly settings: Settings) {
		super(leaf);
	}

	private onLocalSettingsChange(newSettings: SettingValues) {
		this.localSettings = newSettings;
		this.requestSave();
	}

	private openSettingsModal(): Promise<SettingValues> {
		const settingsModal = new SettingsModal(
			this.app,
			this.localSettings,
			(newSettings) => this.onLocalSettingsChange(newSettings)
		);

		settingsModal.open();
		return new Promise((resolve) => {
			settingsModal.onClose = () => {
				resolve(this.localSettings);
			};
			settingsModal.onClose = () => undefined;
		});
	}

	getViewType() {
		this.leaf.openFile;
		return KANBAN_VIEW_NAME;
	}

	getViewData(): string {
		const parsed = matter<{ kanban_plugin: string }>(this.data + "\n");

		parsed.attributes["kanban_plugin"] = JSON.stringify(this.localSettings);

		return `---
${Object.entries(parsed.attributes)
	.map(([key, value]) => `${key}: '${value}'`)
	.join("\n")}
---
${parsed.body}
`;
	}

	setViewData(data: string): void {
		const parsed = matter<{ kanban_plugin: string }>(data + "\n");
		if (parsed.attributes.kanban_plugin) {
			try {
				this.localSettings = JSON.parse(
					parsed.attributes.kanban_plugin
				);
			} catch (e) {
				console.log("caught", e);
				this.localSettings = { include: "" };
			}
		}
	}

	clear(): void {
		// TODO
	}

	async onOpen() {
		this.component = new Main({
			target: this.contentEl,
			props: {
				workspace: this.app.workspace,
				vault: this.app.vault,
				registerEvent: this.registerEvent.bind(this),
				userConfig: this.settings.users,
				columnConfig: {
					columns: this.settings.columns,
				},
				openSettings: () => this.openSettingsModal(),
			},
		});
	}

	async onClose() {
		this.component?.$destroy();
	}
}
