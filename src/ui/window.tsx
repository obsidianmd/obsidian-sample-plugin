import { ItemView,WorkspaceLeaf } from "obsidian";
import * as React from "react";
import { Root, createRoot } from "react-dom/client";
import PluginView from './PluginView';
import { App } from "obsidian";
import MyPlugin from '../../main'


export const VIEW_TYPE = "example-view";

export const AppContext = React.createContext<App | undefined>(undefined);

export const useApp = (): App | undefined => {
    return React.useContext(AppContext);
};

export class AppView extends ItemView {
    root: Root | null = null;
    plugin: MyPlugin;
    constructor(leaf: WorkspaceLeaf, plugin: MyPlugin) {
        super(leaf)
        this.plugin = plugin
    }

    getViewType() {
        return VIEW_TYPE
    }

    getDisplayText() {
        return "Habitica Pane"
    }
    getIcon(): string {
        return "popup-open"
    }

    async onOpen() {
		this.root = createRoot(this.containerEl.children[1]);
		this.root.render(
			<AppContext.Provider value={this.app}>
				<PluginView />
            </AppContext.Provider>
		);
	}
    async onClose() {
		this.root?.unmount();
	}
}