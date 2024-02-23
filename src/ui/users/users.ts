import { writable } from "svelte/store";

export const userStore = writable<Record<string, string>>({});
