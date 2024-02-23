export function kebab<T = string>(input: string): T {
	return input
		.toLowerCase() // all alphanumeric chars to lower case
		.replaceAll(/\s/g, "-") // replace all whitespace with "-"
		.replaceAll(/[^a-z0-9-]/g, "") // replace all other chars with ""
		.replaceAll(/-+/g, "-") as T; // collapse any consecutive "-" into a single "-"
}
