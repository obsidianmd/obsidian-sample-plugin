import { writable } from "svelte/store";
import type { ColumnTag, DefaultColumns } from "../columns/columns";

/**
 * Store for tracking which columns are in selection mode.
 * Key: column tag or default column
 * Value: true if in selection mode, false or undefined if in mark-done mode
 */
export const selectionModeStore = writable<
	Map<ColumnTag | DefaultColumns, boolean>
>(new Map());

/**
 * Toggle selection mode for a column
 */
export function toggleSelectionMode(column: ColumnTag | DefaultColumns) {
	selectionModeStore.update((map) => {
		const current = map.get(column) || false;
		map.set(column, !current);
		return new Map(map);
	});
}

/**
 * Check if a column is in selection mode
 */
export function isInSelectionMode(
	column: ColumnTag | DefaultColumns,
	modeMap: Map<ColumnTag | DefaultColumns, boolean>,
): boolean {
	return modeMap.get(column) || false;
}

/**
 * Exit selection mode for a column
 */
export function exitSelectionMode(column: ColumnTag | DefaultColumns) {
	selectionModeStore.update((map) => {
		map.set(column, false);
		return new Map(map);
	});
}
