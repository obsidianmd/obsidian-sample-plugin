import { Plugin, WorkspaceLeaf } from "obsidian";
import { AppView, APP_VIEW_NAME } from "./ui/entry";
import { SettingTab } from "./settings/settings_tab";

export type Settings = {
	users: string[];
	columns: string[];
};

const DEFAULT_SETTINGS: Settings = {
	users: [],
	columns: [],
};

export default class Base extends Plugin {
	async onload() {
		await this.loadSettings();
		this.addSettingTab(new SettingTab(this.app, this));

		this.registerView(
			APP_VIEW_NAME,
			(leaf) => new AppView(leaf, this.settings)
		);
		this.addRibbonIcon("kanban-square", "Open Kanban", () =>
			this.activateView()
		);
	}

	onunload() {}

	async activateView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | undefined;
		const leaves = workspace.getLeavesOfType(APP_VIEW_NAME);

		if (leaves.length > 0) {
			// A leaf with our view already exists, use that
			leaf = leaves[0];
		} else {
			// Our view could not be found in the workspace, create a new leaf
			// in the right sidebar for it
			leaf = workspace.getLeaf("tab");
			await leaf.setViewState({ type: APP_VIEW_NAME, active: true });
		}

		// "Reveal" the leaf in case it is in a collapsed sidebar
		leaf && workspace.revealLeaf(leaf);
	}

	settings: Settings = DEFAULT_SETTINGS;

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
