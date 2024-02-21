import { Plugin, WorkspaceLeaf } from "obsidian";
import { AppView, APP_VIEW_NAME } from "./ui/entry";

export default class Base extends Plugin {
	async onload() {
		this.registerView(APP_VIEW_NAME, (leaf) => new AppView(leaf));
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
}
