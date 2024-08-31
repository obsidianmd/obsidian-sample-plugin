//

export function getTagsFromContent(content: string): Set<string> {
	const tags = new Set<string>();

	const matches = content.matchAll(tagsRegex);
	for (const match of matches) {
		if (match[1] && tagNonNumericTest.test(match[1])) {
			tags.add(match[1]);
		}
	}

	return tags;
}

// https://www.regular-expressions.info/unicode.html
// `\p{L}` is any letter in any language
// `\p{N}` is any numeric in any language
const tagsRegex = /#([-_/\p{L}\p{N}]+)/gu;
const tagNonNumericTest = /\p{L}/u;

// const tagRegex = /#([-_/\p{S}\p{N}]+)/gu;

// #Tag format
// https://help.obsidian.md/Editing+and+formatting/Tags
//
// You can use any of the following characters in your tags:
// - Alphabetical letters
// - Numbers
// - Underscore (_)
// - Hyphen (-)
// - Forward slash (/) for Nested tags
// - Tags must contain at least one non-numerical character. For example, #1984 isn't a valid tag, but #y1984 is.
// - Tags can't contain blank spaces.
