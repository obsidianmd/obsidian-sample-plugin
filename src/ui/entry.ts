import { ItemView, WorkspaceLeaf } from "obsidian";

import Main from "./main.svelte";
import type { Settings } from "../entry";

export const APP_VIEW_NAME = "project-plan";

export class AppView extends ItemView {
	component: Main | undefined;
	icon = "kanban-square";

	constructor(leaf: WorkspaceLeaf, private readonly settings: Settings) {
		super(leaf);
	}

	getViewType() {
		this.leaf.openFile;
		return APP_VIEW_NAME;
	}

	getDisplayText() {
		return "Project Planner";
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
			},
		});
	}

	async onClose() {
		this.component?.$destroy();
	}
}
