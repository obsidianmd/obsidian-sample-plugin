import type { Brand } from "src/brand";
import { kebab } from "src/parsing/kebab/kebab";
import { derived, get, type Readable, type Writable } from "svelte/store";
import type { SettingValues } from "../settings/settings_store";

export type DefaultColumns = "uncategorised" | "done";
export type ColumnTag = Brand<string, "ColumnTag">;

export interface ParsedColumn {
	raw: string;
	label: string;
	color?: string;
}

export type ColumnTagTable = Record<ColumnTag, string>;
export type ColumnColourTable = Record<ColumnTag, string>;

export const parseColumnSpec = (columnSpec: string): ParsedColumn => {
	// Support both #RRGGBB and 0xRRGGBB formats
	const hashMatch = columnSpec.match(/^(.+?)\(#([0-9a-fA-F]{6})\)$/);
	const oxMatch = columnSpec.match(/^(.+?)\(0x([0-9a-fA-F]{6})\)$/);
	
	const match = hashMatch || oxMatch;
	if (match && match[1] && match[2]) {
		return {
			raw: columnSpec,
			label: match[1],
			color: `#${match[2]}`
		};
	}
	return {
		raw: columnSpec,
		label: columnSpec
	};
};

export const createColumnStores = (
	settingsStore: Writable<SettingValues>
): { columnTagTable: Readable<ColumnTagTable>; columnColourTable: Readable<ColumnColourTable> } => {
	const columnTagTable = derived([settingsStore], ([settings]) => {
		const output: ColumnTagTable = {};

		for (const column of settings.columns ?? []) {
			const parsed = parseColumnSpec(column);
			output[kebab<ColumnTag>(parsed.label)] = parsed.label;
		}

		return output;
	});

	const columnColourTable = derived([settingsStore], ([settings]) => {
		const output: ColumnColourTable = {};

		for (const column of settings.columns ?? []) {
			const parsed = parseColumnSpec(column);
			if (parsed.color) {
				output[kebab<ColumnTag>(parsed.label)] = parsed.color;
			}
		}

		return output;
	});

	return { columnTagTable, columnColourTable };
};

export const createColumnTagTableStore = (
	settingsStore: Writable<SettingValues>
): Readable<ColumnTagTable> => {
	return createColumnStores(settingsStore).columnTagTable;
};

export function isColumnTag(
	input: ColumnTag | DefaultColumns,
	columnTagTableStore: Readable<ColumnTagTable>
): input is ColumnTag {
	return input in get(columnTagTableStore);
}
