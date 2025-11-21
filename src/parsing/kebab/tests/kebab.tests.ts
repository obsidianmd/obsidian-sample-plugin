//

import { describe, expect, it } from "vitest";
import { kebab } from "../kebab";

describe("kebab", () => {
	it.each(validCases)("parses %s as %s", (input, expected) => {
		expect(kebab(input)).toEqual(expected);
	});
});

const validCases: TestCase[] = [
	["has spaces", "has-spaces"],
	["PascalCase", "pascal-case"],
	["snake_case", "snake-case"],
	["top/nested", "top/nested"],
	["foo", "foo"],
	["Foo", "foo"],
	["Foo Column", "foo-column"],
	["FOO", "f-o-o"],
	["fOO", "f-o-o"],
	["fOo", "f-oo"],
	["重要", "重要"],
	["重-要", "重-要"],
	["重_要", "重-要"],
	["12345", "12345"],
];

type TestCase = [content: string, expected: string];
