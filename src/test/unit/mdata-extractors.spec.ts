import {
    extractorForPattern1
} from '../../custom-sort/mdata-extractors'

describe('extractorForPattern1', () => {
    const params = [
        // Positive
        ['03/05/2019', '2019-05-03//'],
        ['Created at: 03/05/2019', '2019-05-03//'],
        ['03/05/2019 | 22:00', '2019-05-03//'],
        ['Created at: 03/05/2019 | 22:00', '2019-05-03//'],

        // TODO: more positive then negative examples

        ['13-Jan-2012', '2012-01-13//'],
        ['3-Feb-2', '0002-02-03//'],
        ['1-Mar-1900', '1900-03-01//'],
        ['42-Apr-9999', '9999-04-42//'],
        ['0-May-0', '0000-05-00//'],
        ['21-Jun-2024', '2024-06-21//'],
        ['7-Jul-1872', '1872-07-07//'],
        ['15-Aug-1234', '1234-08-15//'],
        ['1234-Sep-7777', '7777-09-1234//'],
        ['3-Oct-2023', '2023-10-03//'],
        ['8-Nov-2022', '2022-11-08//'],
        ['18-Dec-2021', '2021-12-18//'],
        // Negative
        ['88-Dec-2012', '2012-12-88//'], // Invalid case, Regexp on matcher in the caller should guard against this
        ['13-JANUARY-2012', '2012-00-13//'], // Invalid case, Regexp on matcher in the caller should guard against this
        ['1 .1', '0000-00-1 .1//'],  // Invalid case, Regexp on matcher in the caller should guard against this
        ['', '0000-00-00//'],  // Invalid case, Regexp on matcher in the caller should guard against this
        ['abc', '0000-00-abc//'],  // Invalid case, Regexp on matcher in the caller should guard against this
        ['def-abc', '0000-00-def//'],  // Invalid case, Regexp on matcher in the caller should guard against this
    ];
    it.each(params)('>%s< should become %s', (s: string, out: string) => {
        expect(extractorForPattern1(s)).toBe(out)
    })
})
