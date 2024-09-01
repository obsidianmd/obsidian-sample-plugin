import { TFile, Vault, type EventRef, Workspace } from "obsidian";
import { updateMapsFromFile, type Metadata } from "./tasks";
import { Task } from "./task";
import { get, writable, type Readable, type Writable } from "svelte/store";
import type { ColumnTagTable } from "../columns/columns";
import { createTaskActions, type TaskActions } from "./actions";
import type { SettingValues } from "../settings/settings_store";

export function createTasksStore(
	vault: Vault,
	workspace: Workspace,
	registerEvent: (eventRef: EventRef) => void,
	columnTagTableStore: Readable<ColumnTagTable>,
	getFilenameFilter: () => string | null,
	settingsStore: Writable<SettingValues>
): {
	tasksStore: Writable<Task[]>;
	taskActions: TaskActions;
	initialise: () => void;
} {
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
				tasksStore.set(
					[...tasksByTaskId.values()].sort((a, b) => {
						if (a.path !== b.path) {
							return a.path.localeCompare(b.path);
						}
						return a.rowIndex - b.rowIndex;
					})
				);
			}, 50);
		}
	}

	function shouldHandle(file: TFile): boolean {
		const filenameFilter = getFilenameFilter()?.replace(/^\//, "");
		return !filenameFilter || file.path.startsWith(filenameFilter);
	}

	function initialise() {
		tasksByTaskId.clear();
		metadataByTaskId.clear();
		taskIdsByFileHandle.clear();

		const consolidateTags = get(settingsStore).consolidateTags ?? false;

		for (const fileHandle of fileHandles) {
			if (!shouldHandle(fileHandle)) {
				continue;
			}

			updateMapsFromFile({
				fileHandle,
				tasksByTaskId,
				metadataByTaskId,
				taskIdsByFileHandle,
				vault,
				columnTagTableStore,
				consolidateTags,
			}).then(() => {
				debounceSetTasks();
			});
		}
	}

	registerEvent(
		vault.on("modify", (fileHandle) => {
			if (fileHandle instanceof TFile && shouldHandle(fileHandle)) {
				const consolidateTags =
					get(settingsStore).consolidateTags ?? false;
				updateMapsFromFile({
					fileHandle,
					tasksByTaskId,
					metadataByTaskId,
					taskIdsByFileHandle,
					vault,
					columnTagTableStore,
					consolidateTags,
				}).then(() => {
					debounceSetTasks();
				});
			}
		})
	);

	registerEvent(
		vault.on("create", (fileHandle) => {
			if (fileHandle instanceof TFile && shouldHandle(fileHandle)) {
				const consolidateTags =
					get(settingsStore).consolidateTags ?? false;
				updateMapsFromFile({
					fileHandle,
					tasksByTaskId,
					metadataByTaskId,
					taskIdsByFileHandle,
					vault,
					columnTagTableStore,
					consolidateTags,
				}).then(() => {
					debounceSetTasks();
				});
			}
		})
	);

	registerEvent(
		vault.on("delete", (fileHandle) => {
			if (fileHandle instanceof TFile) {
				const tasksToDelete = taskIdsByFileHandle.get(fileHandle);
				if (!tasksToDelete) return;

				for (const taskId of tasksToDelete) {
					tasksByTaskId.delete(taskId);
					metadataByTaskId.delete(taskId);
				}
				taskIdsByFileHandle.delete(fileHandle);
			}
		})
	);

	registerEvent(
		vault.on("rename", (fileHandle) => {
			if (fileHandle instanceof TFile) {
				initialise();
			}
		})
	);

	const taskActions = createTaskActions({
		tasksByTaskId,
		metadataByTaskId,
		vault,
		workspace,
	});

	return { tasksStore, taskActions, initialise };
}
