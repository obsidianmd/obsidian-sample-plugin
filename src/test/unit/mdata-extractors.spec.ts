import {
    _unitTests
} from '../../custom-sort/mdata-extractors'

describe('extractor for date(dd/mm/yyyy)', () => {
    const params = [
        // Positive
        ['03/05/2019', '2019-05-03//'],
        ['103/05/2019', '2019-05-03//'],
        ['103/05/20193232', '2019-05-03//'],
        ['99/99/9999', '9999-99-99//'],
        ['00/00/0000', '0000-00-00//'],
        ['Created at: 03/05/2019', '2019-05-03//'],
        ['03/05/2019 | 22:00', '2019-05-03//'],
        ['Created at: 03/05/2019 | 22:00', '2019-05-03//'],

        // Negative
        ['88-Dec-2012', undefined],
        ['13-JANUARY-2012', undefined],
        ['1 .1', undefined],
        ['', undefined],
        ['abc', undefined],
        ['def-abc', undefined],
        ['3/5/2019', undefined],
    ];
    it.each(params)('>%s< should become %s', (s: string, out: string) => {
        expect(_unitTests.extractorFnForDate_ddmmyyyy(s)).toBe(out)
    })
})
