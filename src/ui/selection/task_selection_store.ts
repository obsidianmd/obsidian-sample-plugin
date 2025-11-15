import { writable } from "svelte/store";

/**
 * Store for tracking which tasks are selected for bulk actions.
 * Key: task ID
 * Value: true if selected, false or undefined if not selected
 */
export const taskSelectionStore = writable<Map<string, boolean>>(new Map());

/**
 * Toggle selection state for a task
 */
export function toggleTaskSelection(taskId: string) {
	taskSelectionStore.update((map) => {
		const current = map.get(taskId) || false;
		map.set(taskId, !current);
		return new Map(map);
	});
}

/**
 * Check if a task is selected
 */
export function isTaskSelected(
	taskId: string,
	selectionMap: Map<string, boolean>,
): boolean {
	return selectionMap.get(taskId) || false;
}

/**
 * Clear all selections
 */
export function clearTaskSelections() {
	taskSelectionStore.set(new Map());
}

/**
 * Get count of selected tasks in a specific column
 */
export function getSelectedTaskCount(
	taskIds: string[],
	selectionMap: Map<string, boolean>,
): number {
	return taskIds.filter((id) => selectionMap.get(id) || false).length;
}
