import {_unitTests, getDateForWeekOfYear} from "../../utils/week-of-year"

const paramsForWeekOf1stOfJan = [
    [2015,'2014-12-29T00:00:00.000Z','same as U.S.'], // 1st Jan on Thu, ISO = U.S.
    [2020,'2019-12-30T00:00:00.000Z','same as U.S.'], // 1st Jan on Wed, ISO = U.S.
    [2021,'2020-12-28T00:00:00.000Z','2021-01-04T00:00:00.000Z'], // 1st Jan on Fri, ISO != U.S.
    [2022,'2021-12-27T00:00:00.000Z','2022-01-03T00:00:00.000Z'], // 1st Jan on Sat, ISO != U.S.
    [2023,'2022-12-26T00:00:00.000Z','2023-01-02T00:00:00.000Z'], // 1st Jan on Sun, ISO != U.S.
    [2024,'2024-01-01T00:00:00.000Z','same as U.S.'], // 1st Jan on Mon, ISO = U.S.
    [2025,'2024-12-30T00:00:00.000Z','same as U.S.']  // 1st Jan on Wed, ISO = U.S.
]

const paramsFor10thWeek = [
    [2019,'2019-03-04T00:00:00.000Z','same as U.S.'],
    [1999,'1999-03-01T00:00:00.000Z','1999-03-08T00:00:00.000Z'],
    [1683,'1683-03-01T00:00:00.000Z','1683-03-08T00:00:00.000Z'],
    [1410,'1410-03-05T00:00:00.000Z','same as U.S.'],
    [1996,'1996-03-04T00:00:00.000Z','same as U.S.'],
    [2023,'2023-02-27T00:00:00.000Z','2023-03-06T00:00:00.000Z'],
    [2025,'2025-03-03T00:00:00.000Z','same as U.S.']
]

describe('calculateMondayDateIn2stWeekOfYear', () => {
    it.each(paramsForWeekOf1stOfJan)('year >%s< should result in %s (U.S.) and %s (ISO)', (year: number, dateOfMondayUS: string, dateOfMondayISO: string) => {
        const dateUS = new Date(dateOfMondayUS).getTime()
        const dateISO = 'same as U.S.' === dateOfMondayISO ? dateUS : new Date(dateOfMondayISO).getTime()
        const mondayData = _unitTests.calculateMondayDateIn2stWeekOfYear(year)
        expect(mondayData.mondayDateOf1stWeekUS).toBe(dateUS)
        expect(mondayData.mondayDateOf1stWeekISO).toBe(dateISO)
    })
})

describe('getDateForWeekOfYear', () => {
    it.each(paramsForWeekOf1stOfJan)('For year >%s< 1st week should start on %s (U.S.) and %s (ISO)', (year: number, dateOfMondayUS: string, dateOfMondayISO: string) => {
        const dateUS = new Date(dateOfMondayUS)
        const dateISO = 'same as U.S.' === dateOfMondayISO ? dateUS : new Date(dateOfMondayISO)
        expect(getDateForWeekOfYear(year, 1)).toStrictEqual(dateUS)
        expect(getDateForWeekOfYear(year, 1, true)).toStrictEqual(dateISO)
    })
    it.each(paramsFor10thWeek)('For year >%s< 10th week should start on %s (U.S.) and %s (ISO)', (year: number, dateOfMondayUS: string, dateOfMondayISO: string) => {
        const dateUS = new Date(dateOfMondayUS)
        const dateISO = 'same as U.S.' === dateOfMondayISO ? dateUS : new Date(dateOfMondayISO)
        expect(getDateForWeekOfYear(year, 10)).toStrictEqual(dateUS)
        expect(getDateForWeekOfYear(year, 10, true)).toStrictEqual(dateISO)
    })
    it('should correctly handle edge case - a year spanning 54 weeks (leap year staring on Sun)', () => {
        // This works in U.S. standard only, where 1st week can start on Sunday
        expect(getDateForWeekOfYear(2012,1)).toStrictEqual(new Date('2011-12-26T00:00:00.000Z'))
        expect(getDateForWeekOfYear(2012,54)).toStrictEqual(new Date('2012-12-31T00:00:00.000Z'))
    })
})
