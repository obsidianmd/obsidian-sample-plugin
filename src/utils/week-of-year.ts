
// Cache of start of years and number of days in the 1st week
interface MondayCache {
    year: number   // full year, e.g. 2015
    mondayDateOf1stWeekUS: number // U.S. standard, can be in Dec of previous year
    mondayDateOf1stWeekISO: number // ISO standard, when the first Thursday of the year determines week numbering
}

type YEAR = number
const DAY_OF_MILIS = 60*60*24*1000
const DAYS_IN_WEEK = 7

const MondaysCache: { [key: YEAR]: MondayCache } = {}

const calculateMondayDateIn1stWeekOfYear = (year: number): MondayCache => {
    const firstSecondOfYear = new Date(`${year}-01-01T00:00:00.000Z`)
    const SUNDAY = 0
    const MONDAY = 1
    const THURSDAY = 4
    const FRIDAY = 5
    const SATURDAY = 6

    const dayOfWeek = firstSecondOfYear.getDay()
    let daysToPrevMonday: number = 0 // For the Monday itself
    if (dayOfWeek === SUNDAY) { // Sunday
        daysToPrevMonday = DAYS_IN_WEEK - 1
    } else if (dayOfWeek > MONDAY) { // Tue - Sat
        daysToPrevMonday = dayOfWeek - MONDAY
    }

    // for U.S. the first week is the one with Jan 1st,
    // for ISO standard, the first week is the one which contains the 1st Thursday of the year
    const useISOoffset = [FRIDAY, SATURDAY, SUNDAY].includes(dayOfWeek) ? DAYS_IN_WEEK : 0

    return {
        year: year,
        mondayDateOf1stWeekUS: new Date(firstSecondOfYear).setDate(firstSecondOfYear.getDate() - daysToPrevMonday),
        mondayDateOf1stWeekISO: new Date(firstSecondOfYear).setDate(firstSecondOfYear.getDate() - daysToPrevMonday + useISOoffset),
    }
}

// Week number = 1 to 54, U.S. standard by default, can also work in ISO (parameter driven)
export const getDateForWeekOfYear = (year: number, weekNumber: number, useISO?: boolean): Date => {
    const WEEK_OF_MILIS = DAYS_IN_WEEK * DAY_OF_MILIS
    const dataOfMondayIn1stWeekOfYear = (MondaysCache[year] ??= calculateMondayDateIn1stWeekOfYear(year))
    const mondayOfTheRequestedWeek = new Date(
        (useISO ? dataOfMondayIn1stWeekOfYear.mondayDateOf1stWeekISO : dataOfMondayIn1stWeekOfYear.mondayDateOf1stWeekUS)
        + (weekNumber-1)*WEEK_OF_MILIS
    )

    return mondayOfTheRequestedWeek
}

export const _unitTests = {
    calculateMondayDateIn2stWeekOfYear: calculateMondayDateIn1stWeekOfYear
}
