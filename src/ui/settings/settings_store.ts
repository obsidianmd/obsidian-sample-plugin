import { writable } from "svelte/store";
import { z } from "zod";

export enum VisibilityOption {
	Auto = "auto",
	NeverShow = "never",
	AlwaysShow = "always",
}

const settingsObject = z.object({
	columns: z.array(z.string()),
	scope: z.union([z.literal("everywhere"), z.literal("folder")]),
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
});

export type SettingValues = z.infer<typeof settingsObject>;

export const defaultSettings: SettingValues = {
	columns: ["Later", "Soonish", "Next week", "This week", "Today", "Pending"],
	scope: "folder",
	showFilepath: true,
	consolidateTags: false,
	uncategorizedVisibility: VisibilityOption.Auto,
	doneVisibility: VisibilityOption.AlwaysShow,
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
