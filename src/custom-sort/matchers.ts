export const RomanNumberRegexStr: string = ' *([MDCLXVI]+)'; // Roman number
export const CompoundRomanNumberDotRegexStr: string = ' *([MDCLXVI]+(?:\\.[MDCLXVI]+)*)';// Compound Roman number with dot as separator
export const CompoundRomanNumberDashRegexStr: string = ' *([MDCLXVI]+(?:-[MDCLXVI]+)*)'; // Compound Roman number with dash as separator

export const NumberRegexStr: string = ' *(\\d+)';  // Plain number
export const CompoundNumberDotRegexStr: string = ' *(\\d+(?:\\.\\d+)*)'; // Compound number with dot as separator
export const CompoundNumberDashRegexStr: string = ' *(\\d+(?:-\\d+)*)'; // Compound number with dash as separator

export const Date_dd_Mmm_yyyy_RegexStr: string = ' *([0-3]*[0-9]-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-\\d{4})'; // Date like 01-Jan-2020
export const Date_Mmm_dd_yyyy_RegexStr: string = ' *((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-[0-3]*[0-9]-\\d{4})'; // Date like Jan-01-2020

export const DOT_SEPARATOR = '.'
export const DASH_SEPARATOR = '-'

const SLASH_SEPARATOR = '/' // ASCII 47
const PIPE_SEPARATOR = '|'  // ASCII 124

export const DEFAULT_NORMALIZATION_PLACES = 8;  // Fixed width of a normalized number (with leading zeros)

// Property escapes:
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions/Unicode_Property_Escapes
// https://stackoverflow.com/a/48902765
//
// Using Unicode property escapes to express 'a letter in any modern language'
export const WordInAnyLanguageRegexStr = '(\\p{Letter}+)'   // remember about the /u option -> /\p{Letter}+/u

export const WordInASCIIRegexStr = '([a-zA-Z]+)'

export function prependWithZeros(s: string|undefined, minLength: number): string {
	if ('string' === typeof s) {
		if (s.length < minLength) {
			const delta: number = minLength - s.length;
			return '000000000000000000000000000'.substring(0, delta) + s;
		} else {
			return s;
		}
	} else {
		return prependWithZeros((s ?? '').toString(), minLength)
	}
}

// Accepts trimmed number (compound or not) as parameter. No internal verification!!!

export function getNormalizedNumber(s: string = '', separator?: string, places?: number): string | null {
	// The strange PIPE_SEPARATOR and trailing // are to allow correct sorting of compound numbers:
	// 1-1 should go before 1-1-1 and 1 should go yet earlier.
	// That's why the conversion to:
	// 1//
	// 1|1//
	// 1|1|1//
	// guarantees correct order (/ = ASCII 47, | = ASCII 124)
	if (separator) {
		const components: Array<string> = s.split(separator).filter(s => s)
		return `${components.map((c) => prependWithZeros(c, places ?? DEFAULT_NORMALIZATION_PLACES)).join(PIPE_SEPARATOR)}//`
	} else {
		return `${prependWithZeros(s, places ?? DEFAULT_NORMALIZATION_PLACES)}//`
	}
}

function RomanCharToInt(c: string): number {
	const Roman: string = '0iIvVxXlLcCdDmM';
	const RomanValues: Array<number> = [0, 1, 1, 5, 5, 10, 10, 50, 50, 100, 100, 500, 500, 1000, 1000];
	if (c) {
		const idx: number = Roman.indexOf(c[0])
		return idx > 0 ? RomanValues[idx] : 0;
	} else {
		return 0;
	}
}

export function romanToIntStr(rs: string): string {
	if (rs == null) return '0';

	let num = RomanCharToInt(rs.charAt(0));
	let prev, curr;

	for (let i = 1; i < rs.length; i++) {
		curr = RomanCharToInt(rs.charAt(i));
		prev = RomanCharToInt(rs.charAt(i - 1));
		if (curr <= prev) {
			num += curr;
		} else {
			num = num - prev * 2 + curr;
		}
	}

	return `${num}`;
}

export function getNormalizedRomanNumber(s: string, separator?: string, places?: number): string | null {
	// The strange PIPE_SEPARATOR and trailing // are to allow correct sorting of compound numbers:
	// 1-1 should go before 1-1-1 and 1 should go yet earlier.
	// That's why the conversion to:
	// 1//
	// 1|1//
	// 1|1|1//
	// guarantees correct order (/ = ASCII 47, | = ASCII 124)
	if (separator) {
		const components: Array<string> = s.split(separator).filter(s => s)
		return `${components.map((c) => prependWithZeros(romanToIntStr(c), places ?? DEFAULT_NORMALIZATION_PLACES)).join(PIPE_SEPARATOR)}//`
	} else {
		return `${prependWithZeros(romanToIntStr(s), places ?? DEFAULT_NORMALIZATION_PLACES)}//`
	}
}

export const DAY_POSITIONS = '00'.length
export const MONTH_POSITIONS = '00'.length
export const YEAR_POSITIONS = '0000'.length

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export function getNormalizedDate_NormalizerFn_for(separator: string, dayIdx: number, monthIdx: number, yearIdx: number, months?: string[]) {
	return (s: string): string | null => {
		// Assumption - the regex date matched against input s, no extensive defensive coding needed
		const components = s.split(separator)
		const day = prependWithZeros(components[dayIdx], DAY_POSITIONS)
		const monthValue = months ? `${1 + MONTHS.indexOf(components[monthIdx])}` : components[monthIdx]
		const month = prependWithZeros(monthValue, MONTH_POSITIONS)
		const year = prependWithZeros(components[yearIdx], YEAR_POSITIONS)
		return `${year}-${month}-${day}//`
	}
}

export const getNormalizedDate_dd_Mmm_yyyy_NormalizerFn = getNormalizedDate_NormalizerFn_for('-', 0, 1, 2, MONTHS)
export const getNormalizedDate_Mmm_dd_yyyy_NormalizerFn = getNormalizedDate_NormalizerFn_for('-', 1, 0, 2, MONTHS)
