import {
    getNormalizedDate_NormalizerFn_for
} from "./matchers";
import {NormalizerFn} from "./custom-sort-types";

type ExtractorFn = (mdataValue: string) => string|undefined

interface DateExtractorSpec {
    specPattern: string|RegExp,
    extractorFn: ExtractorFn
}

export interface MDataExtractor {
    (mdataValue: string): string|undefined
}

export interface MDataExtractorParseResult {
    m: MDataExtractor
    remainder: string
}

function getGenericPlainRegexpExtractorFn(extractorRegexp: RegExp, extractedValueNormalizer: NormalizerFn) {
    return (mdataValue: string): string | undefined => {
        const hasMatch = mdataValue?.match(extractorRegexp)
        if (hasMatch && hasMatch[0]) {
            return extractedValueNormalizer(hasMatch[0]) ?? undefined
        } else {
            return undefined
        }
    }
}

const Extractors: DateExtractorSpec[] = [
    {   specPattern: 'date(dd/mm/yyyy)',
        extractorFn: getGenericPlainRegexpExtractorFn(
            new RegExp('\\d{2}/\\d{2}/\\d{4}'),
            getNormalizedDate_NormalizerFn_for('/', 0, 1, 2)
        )
    }, {
        specPattern: 'date(mm/dd/yyyy)',
        extractorFn: getGenericPlainRegexpExtractorFn(
            new RegExp('\\d{2}/\\d{2}/\\d{4}'),
            getNormalizedDate_NormalizerFn_for('/', 1, 0, 2)
        )
    }
]

export const tryParseAsMDataExtractorSpec = (s: string): MDataExtractorParseResult|undefined => {
    // Simplistic initial implementation of the idea with hardcoded two extractors
    for (const extrSpec of Extractors) {
        if ('string' === typeof extrSpec.specPattern && s.trim().startsWith(extrSpec.specPattern)) {
            return {
                m: extrSpec.extractorFn,
                remainder: s.substring(extrSpec.specPattern.length).trim()
            }
        }
    }
    return undefined
}

export const _unitTests = {
    extractorFnForDate_ddmmyyyy: Extractors.find((it) => it.specPattern === 'date(dd/mm/yyyy)')?.extractorFn!,
    extractorFnForDate_mmddyyyy: Extractors.find((it) => it.specPattern === 'date(mm/dd/yyyy)')?.extractorFn!,
}
