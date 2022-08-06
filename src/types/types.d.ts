import {TFolder, WorkspaceLeaf} from "obsidian";

declare module 'obsidian' {
	export interface ViewRegistry {
		viewByType: Record<string, (leaf: WorkspaceLeaf) => unknown>;
	}

	export interface App {
		viewRegistry: ViewRegistry;
	}

	interface FileExplorerFolder {
	}

	export interface FileExplorerView extends View {
		createFolderDom(folder: TFolder): FileExplorerFolder;

		requestSort(): void;
	}
}
