import { writable } from "svelte/store";
import { z } from "zod";
import { DEFAULT_DONE_STATUS_MARKERS, DEFAULT_IGNORED_STATUS_MARKERS } from "../tasks/task";

export enum VisibilityOption {
	Auto = "auto",
	NeverShow = "never",
	AlwaysShow = "always",
}

export enum ScopeOption {
	Folder = "folder",
	Everywhere = "everywhere",
}

export interface ContentValue {
	text: string;
}

export interface TagValue {
	tags: string[];
}

export interface FileValue {
	filepaths: string[];
}

export interface SavedFilter {
	id: string;
	content?: ContentValue;
	tag?: TagValue;
	file?: FileValue;
}

const contentValueSchema = z.object({
	text: z.string(),
});

const tagValueSchema = z.object({
	tags: z.array(z.string()),
});

const fileValueSchema = z.object({
	filepaths: z.array(z.string()),
});

const savedFilterSchema = z.object({
	id: z.string(),
	content: contentValueSchema.optional(),
	tag: tagValueSchema.optional(),
	file: fileValueSchema.optional(),
});

const settingsObject = z.object({
	columns: z.array(z.string()),
	scope: z.nativeEnum(ScopeOption).default(ScopeOption.Folder),
	showFilepath: z.boolean().default(true).optional(),
	consolidateTags: z.boolean().default(false).optional(),
	uncategorizedVisibility: z
		.nativeEnum(VisibilityOption)
		.default(VisibilityOption.Auto)
		.optional(),
	doneVisibility: z
		.nativeEnum(VisibilityOption)
		.default(VisibilityOption.AlwaysShow)
		.optional(),
	doneStatusMarkers: z.string().default(DEFAULT_DONE_STATUS_MARKERS).optional(),
	ignoredStatusMarkers: z.string().default(DEFAULT_IGNORED_STATUS_MARKERS).optional(),
	savedFilters: z.array(savedFilterSchema).default([]).optional(),
	lastContentFilter: z.string().optional(),
	lastTagFilter: z.array(z.string()).optional(),
	lastFileFilter: z.array(z.string()).optional(),
	filtersExpanded: z.boolean().default(true).optional(),
	filtersSidebarExpanded: z.boolean().default(true).optional(),
	filtersSidebarWidth: z.number().default(280).optional(),
	columnWidth: z.number().min(200).max(600).default(300).optional(),
});

export type SettingValues = z.infer<typeof settingsObject>;

export const defaultSettings: SettingValues = {
	columns: ["Later", "Soonish", "Next week", "This week", "Today", "Pending"],
	scope: ScopeOption.Folder,
	showFilepath: true,
	consolidateTags: false,
	uncategorizedVisibility: VisibilityOption.Auto,
	doneVisibility: VisibilityOption.AlwaysShow,
	doneStatusMarkers: DEFAULT_DONE_STATUS_MARKERS,
	ignoredStatusMarkers: DEFAULT_IGNORED_STATUS_MARKERS,
	savedFilters: [],
	lastContentFilter: "",
	lastTagFilter: [],
	lastFileFilter: [],
	columnWidth: 300,
};

export const createSettingsStore = () =>
	writable<SettingValues>(defaultSettings);

export function parseSettingsString(str: string): SettingValues {
	try {
		const parsed = JSON.parse(str);
		const partial = settingsObject.partial().parse(parsed);
		return { ...defaultSettings, ...partial };
	} catch {
		return defaultSettings;
	}
}

export function toSettingsString(settings: SettingValues): string {
	return JSON.stringify(settings);
}
