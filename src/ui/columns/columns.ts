import type { Brand } from "src/brand";
import { kebab } from "src/kebab";
import { get, writable } from "svelte/store";

export type ColumnConfig = {
	columns: string[];
};

export type DefaultColumns = "uncategorised" | "done";
export type ColumnTag = Brand<string, "ColumnTag">;

export type ColumnTagTable = Record<ColumnTag, string>;

export function createColumnTagTable({
	columns,
}: ColumnConfig): ColumnTagTable {
	const output: ColumnTagTable = {};

	for (const column of columns) {
		output[kebab<ColumnTag>(column)] = column;
	}

	return output;
}

export const columnTagTableStore = writable<ColumnTagTable>({});

export function isColumnTag(
	input: ColumnTag | DefaultColumns
): input is ColumnTag {
	return input in get(columnTagTableStore);
}
