import { MarkdownView, Plugin, TFile, WorkspaceLeaf } from "obsidian";
import { APP_VIEW_NAME } from "./ui/entry";
import { SettingTab } from "./settings/settings_tab";
import { KANBAN_VIEW_NAME, KanbanView } from "./ui/text_view";

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
			KANBAN_VIEW_NAME,
			(leaf) => new KanbanView(leaf, this.settings)
		);

		this.switchToKanbanAfterLoad();

		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
				this.switchToKanbanAfterLoad();
			})
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

	private switchToKanbanAfterLoad() {
		this.app.workspace.onLayoutReady(() => {
			let leaf: WorkspaceLeaf;
			for (leaf of this.app.workspace.getLeavesOfType("markdown")) {
				if (
					leaf.view instanceof MarkdownView &&
					this.isKanbanFile(leaf.view.file)
				) {
					this.setKanbanView(leaf);
				}
			}
		});
	}

	private isKanbanFile(file: TFile | null): boolean {
		if (!file) {
			return false;
		}

		const fileCache = this.app.metadataCache.getFileCache(file);
		return (
			!!fileCache?.frontmatter && !!fileCache.frontmatter["kanban_plugin"]
		);
	}

	private async setKanbanView(leaf: WorkspaceLeaf) {
		await leaf.setViewState({
			type: KANBAN_VIEW_NAME,
			state: leaf.view.getState(),
		});
	}
}
