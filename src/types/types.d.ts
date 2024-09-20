import {PluginInstance, TFolder, WorkspaceLeaf} from "obsidian";

// Needed to support monkey-patching of the folder sort() function

declare module 'obsidian' {
	export interface ViewRegistry {
		viewByType: Record<string, (leaf: WorkspaceLeaf) => unknown>;
	}

	// undocumented internal interface - for experimental features
	export interface PluginInstance {
		id: string;
	}

	export type CommunityPluginId = string

	// undocumented internal interface - for experimental features
	export interface CommunityPlugin {
		manifest: {
			id: CommunityPluginId
		}
		_loaded: boolean
	}

	// undocumented internal interface - for experimental features
	export interface CommunityPlugins {
		enabledPlugins: Set<CommunityPluginId>
		plugins: {[key: CommunityPluginId]: CommunityPlugin}
	}

	export interface App {
		plugins: CommunityPlugins;
		internalPlugins: InternalPlugins; // undocumented internal API - for experimental features
		viewRegistry: ViewRegistry;
	}

	// undocumented internal interface - for experimental features
	export interface InstalledPlugin {
		enabled: boolean;
		instance: PluginInstance;
	}

	// undocumented internal interface - for experimental features
	export interface InternalPlugins {
		plugins: Record<string, InstalledPlugin>;
		getPluginById(id: string): InstalledPlugin;
	}

	interface FileExplorerFolder {
	}

	export interface FileExplorerView extends View {
		createFolderDom(folder: TFolder): FileExplorerFolder;
		getSortedFolderItems(sortedFolder: TFolder): any[];

		requestSort(): void;

		sortOrder: string
	}

	interface MenuItem {
		setSubmenu: () => Menu;
	}
}
