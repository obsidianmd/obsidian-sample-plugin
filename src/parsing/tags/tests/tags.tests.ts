//

import { describe, expect, it } from "vitest";
import { getTagsFromContent } from "../tags";

describe("tags", () => {
	it.each(validCases)("parses %s as %o", (input, expected) => {
		expect(getTagsFromContent(input)).toEqual(expected);
	});
});

const validCases: TestCase[] = [
	["#camelCase", new Set(["camelCase"])],
	["#has spaces", new Set(["has"])],
	["#PascalCase", new Set(["PascalCase"])],
	["#snake_case", new Set(["snake_case"])],
	["#kebab-case", new Set(["kebab-case"])],
	["#top/nested", new Set(["top/nested"])],
	["#重要", new Set(["重要"])],
	["#PL/C-重要", new Set(["PL/C-重要"])],
	["#z125081", new Set(["z125081"])],
	["asdf", new Set([])],
	["#1241251", new Set([])],
];

type TestCase = [content: string, expected: Set<string>];
