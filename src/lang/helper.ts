// https://github.com/mgmeyers/obsidian-kanban/blob/93014c2512507fde9eafd241e8d4368a8dfdf853/src/lang/helpers.ts

import { moment } from "obsidian";


import en from "src/lang/locale/en";
import ru from "src/lang/locale/ru";


export const localeMap: { [k: string]: Partial<typeof en> } = {

    en,
    ru
};

const locale = localeMap[moment.locale()];

// https://stackoverflow.com/a/41015840/
function interpolate(str: string, params: Record<string, unknown>): string {
    const names: string[] = Object.keys(params);
    const vals: unknown[] = Object.values(params);
    return new Function(...names, `return \`${str}\`;`)(...vals);
}

export function t(str: keyof typeof en, params?: Record<string, unknown>): string {
    if (!locale) {
        console.error(`SRS error: Locale ${moment.locale()} not found.`);
    }

    const result = (locale && locale[str]) || en[str];

    if (params) {
        return interpolate(result, params);
    }

    return result;
}