import { MarkdownView, Plugin, TFile, WorkspaceLeaf } from "obsidian";
import { KANBAN_VIEW_NAME, KanbanView } from "./ui/text_view";

export default class Base extends Plugin {
	async onload() {
		this.registerView(KANBAN_VIEW_NAME, (leaf) => new KanbanView(leaf));

		this.switchToKanbanAfterLoad();

		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
				this.switchToKanbanAfterLoad();
			})
		);

		this.app.workspace.on("file-menu", (menu, file) => {
			menu.addItem((item) => {
				item.setTitle("New kanban")
					.setIcon("square-kanban")
					.onClick(async () => {
						const newFile = await this.app.vault.create(
							file.path + "/Kanban-" + Date.now() + ".md",
							`---\nkanban_plugin: {}\n---\n`
						);
						this.app.workspace
							.getActiveViewOfType(MarkdownView)
							?.leaf.openFile(newFile);
					});
			});
		});
	}

	onunload() {}

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
