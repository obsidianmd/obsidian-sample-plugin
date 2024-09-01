//

import { writable } from "svelte/store";
import { z } from "zod";

const settingsObject = z.object({
	columns: z.array(z.string()),
	scope: z.union([z.literal("everywhere"), z.literal("folder")]),
	showFilepath: z.boolean().default(true).optional(),
	consolidateTags: z.boolean().default(false).optional(),
});

export type SettingValues = z.infer<typeof settingsObject>;

const defaultSettings: SettingValues = {
	columns: ["Later", "Soonish", "Next week", "This week", "Today", "Pending"],
	scope: "folder",
	showFilepath: true,
	consolidateTags: false,
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
