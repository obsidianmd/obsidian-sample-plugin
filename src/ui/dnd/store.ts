import { writable } from "svelte/store";

export const isDraggingStore = writable<boolean>(false);
