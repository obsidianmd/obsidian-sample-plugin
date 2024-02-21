import { TFile, Vault, type EventRef, Workspace } from "obsidian";
import { updateMapsFromFile, type Metadata } from "./tasks";
import { Task } from "./task";
import { writable, type Writable } from "svelte/store";
import type { ColumnTagTable } from "../columns/columns";
import { createTaskActions, type TaskActions } from "./actions";

export function createTasksStore(
	vault: Vault,
	workspace: Workspace,
	registerEvent: (eventRef: EventRef) => void,
	columnTagTableStore: Writable<ColumnTagTable>
): { tasksStore: Writable<Task[]>; taskActions: TaskActions } {
	const tasksStore = writable<Task[]>([]);
	let timer: number | undefined;

	const tasksByTaskId = new Map<string, Task>();
	const metadataByTaskId = new Map<string, Metadata>();
	const taskIdsByFileHandle = new Map<TFile, Set<string>>();

	const fileHandles = vault.getMarkdownFiles();

	function debounceSetTasks() {
		if (!timer) {
			timer = window.setTimeout(() => {
				timer = undefined;
				tasksStore.set([...tasksByTaskId.values()]);
			}, 50);
		}
	}

	for (const fileHandle of fileHandles) {
		updateMapsFromFile({
			fileHandle,
			tasksByTaskId,
			metadataByTaskId,
			taskIdsByFileHandle,
			vault,
			columnTagTableStore,
		}).then(() => {
			debounceSetTasks();
		});
	}

	registerEvent(
		vault.on("modify", (fileHandle) => {
			if (fileHandle instanceof TFile) {
				updateMapsFromFile({
					fileHandle,
					tasksByTaskId,
					metadataByTaskId,
					taskIdsByFileHandle,
					vault,
					columnTagTableStore,
				}).then(() => {
					debounceSetTasks();
				});
			}
		})
	);

	registerEvent(
		vault.on("create", (fileHandle) => {
			if (fileHandle instanceof TFile) {
				updateMapsFromFile({
					fileHandle,
					tasksByTaskId,
					metadataByTaskId,
					taskIdsByFileHandle,
					vault,
					columnTagTableStore,
				}).then(() => {
					debounceSetTasks();
				});
			}
		})
	);

	registerEvent(
		vault.on("delete", (fileHandle) => {
			if (fileHandle instanceof TFile) {
				// TODO implement
			}
		})
	);

	registerEvent(
		vault.on("rename", (fileHandle) => {
			if (fileHandle instanceof TFile) {
				// TODO implement
			}
		})
	);

	const taskActions = createTaskActions({
		tasksByTaskId,
		metadataByTaskId,
		vault,
		workspace,
	});

	return { tasksStore, taskActions };
}
