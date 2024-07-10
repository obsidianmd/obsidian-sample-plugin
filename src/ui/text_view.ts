import { TextFileView, WorkspaceLeaf } from "obsidian";
import matter from "front-matter";

import Main from "./main.svelte";
import { SettingsModal } from "./settings/settings";
import {
	createSettingsStore,
	parseSettingsString,
	toSettingsString,
	type SettingValues,
} from "./settings/settings_store";
import { get, type Readable, type Writable } from "svelte/store";
import { createTasksStore } from "./tasks/store";
import type { Task } from "./tasks/task";
import type { TaskActions } from "./tasks/actions";
import {
	createColumnTagTableStore,
	type ColumnTagTable,
} from "./columns/columns";

export const KANBAN_VIEW_NAME = "kanban-view";

export class KanbanView extends TextFileView {
	private readonly settingsStore: Writable<SettingValues>;
	private readonly destroySettingsStore: () => void;

	private readonly columnTagTableStore: Readable<ColumnTagTable>;

	private filenameFilter: string | null = null;

	private readonly tasksStore: Writable<Task[]>;
	private readonly taskActions: TaskActions;
	private readonly initialiseTasksStore: () => void;

	component: Main | undefined;
	icon = "kanban-square";

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);

		this.settingsStore = createSettingsStore();
		this.destroySettingsStore = this.settingsStore.subscribe((settings) => {
			switch (settings.scope) {
				case "everywhere":
					this.filenameFilter = null;
					break;
				case "folder":
					this.filenameFilter = this.file?.parent?.path ?? null;
					break;
				default:
					this.filenameFilter = null;
					break;
			}
		});

		this.columnTagTableStore = createColumnTagTableStore(
			this.settingsStore
		);

		const { tasksStore, taskActions, initialise } = createTasksStore(
			this.app.vault,
			this.app.workspace,
			this.registerEvent.bind(this),
			this.columnTagTableStore,
			() => this.filenameFilter
		);

		this.tasksStore = tasksStore;
		this.taskActions = taskActions;
		this.initialiseTasksStore = initialise;
	}

	private onLocalSettingsChange(newSettings: SettingValues) {
		this.settingsStore.set(newSettings);
		this.initialiseTasksStore();
		this.requestSave();
	}

	private openSettingsModal(): Promise<void> {
		const settingsModal = new SettingsModal(
			this.app,
			structuredClone(get(this.settingsStore)),
			(newSettings) => this.onLocalSettingsChange(newSettings)
		);

		settingsModal.open();
		return new Promise((resolve) => {
			settingsModal.onClose = () => {
				resolve();
				settingsModal.onClose = () => undefined;
			};
		});
	}

	getViewType() {
		this.leaf.openFile;
		return KANBAN_VIEW_NAME;
	}

	getViewData(): string {
		const parsed = matter<{ kanban_plugin: string }>(this.data + "\n");
		parsed.attributes["kanban_plugin"] = toSettingsString(
			get(this.settingsStore)
		);

		return `---
${Object.entries(parsed.attributes)
	.map(([key, value]) => `${key}: '${value}'`)
	.join("\n")}
---
${parsed.body}
`;
	}

	setViewData(data: string): void {
		this.settingsStore.set(this.getInitialSettings(data));
		this.initialiseTasksStore();
	}

	private getInitialSettings(data: string): SettingValues {
		const parsed = matter<{ kanban_plugin?: string }>(data + "\n");
		return parseSettingsString(parsed.attributes.kanban_plugin ?? "");
	}

	clear(): void {
		// TODO
	}

	async onOpen() {
		this.component = new Main({
			target: this.contentEl,
			props: {
				tasksStore: this.tasksStore,
				taskActions: this.taskActions,
				columnTagTableStore: this.columnTagTableStore,
				openSettings: () => this.openSettingsModal(),
				settingsStore: this.settingsStore,
			},
		});
	}

	async onClose() {
		this.component?.$destroy();
		this.destroySettingsStore();
	}
}
