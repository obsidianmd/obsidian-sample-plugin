import type { Brand } from "src/brand";
import { writable } from "svelte/store";

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
		output[kebab(column)] = column;
	}

	return output;
}

function kebab(input: string): ColumnTag {
	return input
		.toLowerCase() // all alphanumeric chars to lower case
		.replaceAll(/\s/g, "-") // replace all whitespace with "-"
		.replaceAll(/[^a-z0-9-]/g, "") // replace all other chars with ""
		.replaceAll(/-+/g, "-") as ColumnTag; // collapse any consecutive "-" into a single "-"
}

export const columnTagTableStore = writable<ColumnTagTable>({});
