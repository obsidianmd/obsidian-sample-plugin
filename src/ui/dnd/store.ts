import { writable } from "svelte/store";

type DraggingData = {
	fromColumn: string | undefined;
};

export const isDraggingStore = writable<DraggingData | null>(null);
