import {
	getDateForWeekOfYear
} from "../utils/week-of-year";

export const RomanNumberRegexStr: string = ' *([MDCLXVI]+)'; // Roman number
export const CompoundRomanNumberDotRegexStr: string = ' *([MDCLXVI]+(?:\\.[MDCLXVI]+)*)';// Compound Roman number with dot as separator
export const CompoundRomanNumberDashRegexStr: string = ' *([MDCLXVI]+(?:-[MDCLXVI]+)*)'; // Compound Roman number with dash as separator

export const NumberRegexStr: string = ' *(\\d+)';  // Plain number
export const CompoundNumberDotRegexStr: string = ' *(\\d+(?:\\.\\d+)*)'; // Compound number with dot as separator
export const CompoundNumberDashRegexStr: string = ' *(\\d+(?:-\\d+)*)'; // Compound number with dash as separator

export const Date_yyyy_mm_dd_RegexStr: string = ' *(\\d{4}-[0-3]*[0-9]-[0-3]*[0-9])'
export const Date_yyyy_dd_mm_RegexStr: string = Date_yyyy_mm_dd_RegexStr

export const Date_dd_Mmm_yyyy_RegexStr: string = ' *([0-3]*[0-9]-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-\\d{4})'; // Date like 01-Jan-2020
export const Date_Mmm_dd_yyyy_RegexStr: string = ' *((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-[0-3]*[0-9]-\\d{4})'; // Date like Jan-01-2020

export const Date_yyyy_Www_mm_dd_RegexStr: string = ' *(\\d{4}-W[0-5]*[0-9] \\([0-3]*[0-9]-[0-3]*[0-9]\\))'
export const Date_yyyy_WwwISO_RegexStr: string = ' *(\\d{4}-W[0-5]*[0-9])'
export const Date_yyyy_Www_RegexStr: string = Date_yyyy_WwwISO_RegexStr

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

export const getNormalizedDate_yyyy_mm_dd_NormalizerFn = getNormalizedDate_NormalizerFn_for('-', 2, 1, 0)
export const getNormalizedDate_yyyy_dd_mm_NormalizerFn = getNormalizedDate_NormalizerFn_for('-', 1, 2, 0)
export const getNormalizedDate_dd_Mmm_yyyy_NormalizerFn = getNormalizedDate_NormalizerFn_for('-', 0, 1, 2, MONTHS)
export const getNormalizedDate_Mmm_dd_yyyy_NormalizerFn = getNormalizedDate_NormalizerFn_for('-', 1, 0, 2, MONTHS)

const DateExtractor_yyyy_Www_mm_dd_Regex = /(\d{4})-W(\d{1,2}) \((\d{2})-(\d{2})\)/
const DateExtractor_yyyy_Www_Regex = /(\d{4})-W(\d{1,2})/

// Matching groups
const YEAR_IDX = 1
const WEEK_IDX = 2
const MONTH_IDX = 3
const DAY_IDX = 4

const DECEMBER = 12
const JANUARY = 1

export function getNormalizedDate_NormalizerFn_yyyy_Www_mm_dd(consumeWeek: boolean, weeksISO?: boolean) {
	return (s: string): string | null => {
		// Assumption - the regex date matched against input s, no extensive defensive coding needed
		const matches = consumeWeek ? DateExtractor_yyyy_Www_Regex.exec(s) : DateExtractor_yyyy_Www_mm_dd_Regex.exec(s)
		const yearStr = matches![YEAR_IDX]
		let yearNumber = Number.parseInt(yearStr,10)
		let monthNumber: number
		let dayNumber: number
		if (consumeWeek) {
			const weekNumberStr = matches![WEEK_IDX]
			const weekNumber = Number.parseInt(weekNumberStr, 10)
			const dateForWeek = getDateForWeekOfYear(yearNumber, weekNumber, weeksISO)
			monthNumber = dateForWeek.getMonth()+1 // 1 - 12
			dayNumber = dateForWeek.getDate() // 1 - 31
			// Be careful with edge dates, which can belong to previous or next year
			if (weekNumber === 1) {
				if (monthNumber === DECEMBER) {
					yearNumber--
				}
			}
			if (weekNumber >= 50) {
				if (monthNumber === JANUARY) {
					yearNumber++
				}
			}
		} else { // ignore week
			monthNumber = Number.parseInt(matches![MONTH_IDX],10)
			dayNumber = Number.parseInt(matches![DAY_IDX], 10)
		}
		return `${prependWithZeros(`${yearNumber}`, YEAR_POSITIONS)}-${prependWithZeros(`${monthNumber}`, MONTH_POSITIONS)}-${prependWithZeros(`${dayNumber}`, DAY_POSITIONS)}//`
	}
}

export const getNormalizedDate_yyyy_Www_mm_dd_NormalizerFn = getNormalizedDate_NormalizerFn_yyyy_Www_mm_dd(false)
export const getNormalizedDate_yyyy_WwwISO_NormalizerFn = getNormalizedDate_NormalizerFn_yyyy_Www_mm_dd(true, true)
export const getNormalizedDate_yyyy_Www_NormalizerFn = getNormalizedDate_NormalizerFn_yyyy_Www_mm_dd(true, false)
