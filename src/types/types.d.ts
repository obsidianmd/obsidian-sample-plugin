import {TFolder, WorkspaceLeaf} from "obsidian";

// Needed to support monkey-patching of the folder sort() function

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
