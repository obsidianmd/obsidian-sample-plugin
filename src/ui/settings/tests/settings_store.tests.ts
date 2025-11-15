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

	it("parses settings with lastContentFilter", () => {
		const settingsJson = JSON.stringify({
			...defaultSettings,
			lastContentFilter: "test search",
		});

		const parsed = parseSettingsString(settingsJson);

		expect(parsed.lastContentFilter).toBe("test search");
	});

	it("parses settings with lastTagFilter", () => {
		const settingsJson = JSON.stringify({
			...defaultSettings,
			lastTagFilter: ["frontend", "bug"],
		});

		const parsed = parseSettingsString(settingsJson);

		expect(parsed.lastTagFilter).toEqual(["frontend", "bug"]);
	});

	it("serializes settings with last filter values", () => {
		const settings = {
			...defaultSettings,
			lastContentFilter: "search term",
			lastTagFilter: ["tag1", "tag2"],
		};

		const serialized = toSettingsString(settings);
		const parsed = JSON.parse(serialized);

		expect(parsed.lastContentFilter).toBe("search term");
		expect(parsed.lastTagFilter).toEqual(["tag1", "tag2"]);
	});

	it("handles missing last filter values", () => {
		const settingsJson = JSON.stringify(defaultSettings);
		const parsed = parseSettingsString(settingsJson);

		expect(parsed.lastContentFilter).toBe("");
		expect(parsed.lastTagFilter).toEqual([]);
	});
});
