import { MarkdownView, type TFile, type Vault, type Workspace } from "obsidian";
import type { Task } from "./task";
import type { Metadata } from "./tasks";
import type { ColumnTag } from "../columns/columns";

export type TaskActions = {
	changeColumn: (id: string, column: ColumnTag) => Promise<void>;
	changeOwner: (id: string, owner: "kate" | "chris") => Promise<void>;
	markDone: (id: string) => Promise<void>;
	updateContent: (id: string, content: string) => Promise<void>;
	viewFile: (id: string) => Promise<void>;
	archiveTasks: (ids: string[]) => Promise<void>;
};

export function createTaskActions({
	tasksByTaskId,
	metadataByTaskId,
	vault,
	workspace,
}: {
	tasksByTaskId: Map<string, Task>;
	metadataByTaskId: Map<string, Metadata>;
	vault: Vault;
	workspace: Workspace;
}): TaskActions {
	async function updateRowWithTask(
		id: string,
		updater: (task: Task) => void
	) {
		const metadata = metadataByTaskId.get(id);
		const task = tasksByTaskId.get(id);

		if (!metadata || !task) {
			return;
		}

		updater(task);

		const newTaskString = task.serialise();
		await updateRow(
			vault,
			metadata.fileHandle,
			metadata.rowIndex,
			newTaskString
		);
	}

	return {
		async changeColumn(id, column) {
			await updateRowWithTask(id, (task) => (task.column = column));
		},

		async changeOwner(id, owner) {
			await updateRowWithTask(id, (task) => (task.owner = owner));
		},

		async markDone(id) {
			await updateRowWithTask(id, (task) => (task.done = true));
		},

		async updateContent(id, content) {
			await updateRowWithTask(id, (task) => (task.content = content));
		},

		async archiveTasks(ids) {
			for (const id of ids) {
				await updateRowWithTask(id, (task) => task.archive());
			}
		},

		async viewFile(id) {
			const metadata = metadataByTaskId.get(id);

			if (!metadata) {
				return;
			}

			const { fileHandle, rowIndex } = metadata;

			const leaf = workspace.getLeaf("tab");
			await leaf.openFile(fileHandle);

			const editorView = workspace.getActiveViewOfType(MarkdownView);
			editorView?.editor.setCursor(rowIndex);
		},
	};
}

async function updateRow(
	vault: Vault,
	fileHandle: TFile,
	row: number,
	newText: string
) {
	const file = await vault.read(fileHandle);
	const rows = file.split("\n");

	if (rows.length < row) {
		return;
	}

	rows[row] = newText;
	const newFile = rows.join("\n");
	await vault.modify(fileHandle, newFile);
}
