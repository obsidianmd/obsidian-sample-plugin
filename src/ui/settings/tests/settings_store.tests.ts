import { describe, expect, it } from "vitest";
import {
	parseSettingsString,
	toSettingsString,
	defaultSettings,
	type SavedFilter,
} from "../settings_store";

describe("SavedFilter persistence", () => {
	it("parses settings with savedFilters array", () => {
		const savedFilters: SavedFilter[] = [
			{
				id: "test-id-1",
				content: { text: "frontend" },
			},
			{
				id: "test-id-2",
				tag: { tags: ["bug", "urgent"] },
			},
		];

		const settingsJson = JSON.stringify({
			...defaultSettings,
			savedFilters,
		});

		const parsed = parseSettingsString(settingsJson);

		expect(parsed.savedFilters).toHaveLength(2);
		expect(parsed.savedFilters?.[0]?.content?.text).toBe("frontend");
		expect(parsed.savedFilters?.[1]?.tag?.tags).toEqual(["bug", "urgent"]);
	});

	it("serializes settings with savedFilters", () => {
		const savedFilters: SavedFilter[] = [
			{
				id: "test-id",
				content: { text: "test filter" },
			},
		];

		const settings = {
			...defaultSettings,
			savedFilters,
		};

		const serialized = toSettingsString(settings);
		const parsed = JSON.parse(serialized);

		expect(parsed.savedFilters).toHaveLength(1);
		expect(parsed.savedFilters[0].content.text).toBe("test filter");
	});

	it("handles empty savedFilters array", () => {
		const settingsJson = JSON.stringify({
			...defaultSettings,
			savedFilters: [],
		});

		const parsed = parseSettingsString(settingsJson);

		expect(parsed.savedFilters).toEqual([]);
	});

	it("defaults to empty array when savedFilters is missing", () => {
		const settingsJson = JSON.stringify(defaultSettings);
		const parsed = parseSettingsString(settingsJson);

		expect(parsed.savedFilters).toEqual([]);
	});

	it("handles filter with both content and tag", () => {
		const filter: SavedFilter = {
			id: "combo-id",
			content: { text: "search term" },
			tag: { tags: ["frontend", "bug"] },
		};

		const settingsJson = JSON.stringify({
			...defaultSettings,
			savedFilters: [filter],
		});

		const parsed = parseSettingsString(settingsJson);

		expect(parsed.savedFilters?.[0]?.content?.text).toBe("search term");
		expect(parsed.savedFilters?.[0]?.tag?.tags).toEqual(["frontend", "bug"]);
	});
});
