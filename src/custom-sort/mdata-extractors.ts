import {
    getNormalizedDate_NormalizerFn_for
} from "./matchers";

const DateExtractorSpecPattern1 = 'date(dd/mm/yyyy)'
const DateExtractorRegex1 = new RegExp('\\d{2}/\\d{2}/\\d{4}')
const DateExtractorNormalizer1 = getNormalizedDate_NormalizerFn_for('/', 0, 1, 2)
const DateExtractorSpecPattern2 = 'date(mm/dd/yyyy)'
const DateExtractorRegex2 = new RegExp('\\d{2}/\\d{2}/\\d{4}')
const DateExtractorNormalizer2 = getNormalizedDate_NormalizerFn_for('/', 1, 0, 2)

export interface MDataExtractor {
    (mdataValue: string): string|undefined
}

export interface MDataExtractorParseResult {
    m: MDataExtractor
    remainder: string
}

export const tryParseAsMDataExtractorSpec = (s: string): MDataExtractorParseResult|undefined => {
    // Simplistic initial implementation of the idea with hardcoded two extractors
    if (s.trim().startsWith(DateExtractorSpecPattern1)) {
        return {
            m: extractorForPattern1,
            remainder: s.substring(DateExtractorSpecPattern1.length).trim()
        }
    }
    if (s.trim().startsWith(DateExtractorSpecPattern2)) {
        return {
            m: extractorForPattern2,
            remainder: s.substring(DateExtractorSpecPattern2.length).trim()
        }
    }
    return undefined
}

export function extractorForPattern1(mdataValue: string): string|undefined {
    const hasDate = mdataValue?.match(DateExtractorRegex1)
    if (hasDate && hasDate[0]) {
        return DateExtractorNormalizer1(hasDate[0]) ?? undefined
    } else {
        return undefined
    }
}

export function extractorForPattern2(mdataValue: string): string|undefined {
    const hasDate = mdataValue?.match(DateExtractorRegex2)
    if (hasDate && hasDate[0]) {
        return DateExtractorNormalizer2(hasDate[0]) ?? undefined
    } else {
        return undefined
    }
}
