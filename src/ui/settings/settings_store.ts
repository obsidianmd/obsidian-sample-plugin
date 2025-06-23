import { writable } from "svelte/store";
import { z } from "zod";
import { DEFAULT_DONE_STATUS_MARKERS } from "../tasks/task";

export enum VisibilityOption {
	Auto = "auto",
	NeverShow = "never",
	AlwaysShow = "always",
}

export enum ScopeOption {
	Folder = "folder",
	Everywhere = "everywhere",
}

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
};

export const createSettingsStore = () =>
	writable<SettingValues>(defaultSettings);

export function parseSettingsString(str: string): SettingValues {
	try {
		return (
			settingsObject.safeParse(JSON.parse(str)).data ?? defaultSettings
		);
	} catch {
		return defaultSettings;
	}
}

export function toSettingsString(settings: SettingValues): string {
	return JSON.stringify(settings);
}
