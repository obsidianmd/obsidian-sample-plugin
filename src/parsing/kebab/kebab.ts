export function kebab<T = string>(input: string): T {
	return input
		.replaceAll(/\p{Lu}/gu, (match) => `-${match.toLowerCase()}`) // add a dash in front of upper case letters, and lower case them
		.replaceAll(/\p{Z}/gu, "-") // replace all whitespace with "-"
		.replaceAll(/[^\p{L}\p{N}\/-]/gu, "-") // replace all other chars with ""
		.replaceAll(/-+/g, "-") // collapse any consecutive "-" into a single "-"
		.replace(/^-/, "") // if starts with a "-", trim it
		.replace(/-$/, "") as T; // if ends with a "-", trim it
}

// https://www.regular-expressions.info/unicode.html
