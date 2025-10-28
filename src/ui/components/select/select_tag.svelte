<script lang="ts">
	import BaseSelect from "./base_select.svelte";
	import type { SavedFilter } from "../../settings/settings_store";

	export let tags: string[];
	export let value: string[];
	export let savedFilters: SavedFilter[] = [];
	export let onLoadFilter: ((filterId: string) => void) | undefined = undefined;
	export let addButtonDisabled: boolean = false;
	export let onAddClick: (() => void) | undefined = undefined;
	export let clearButtonDisabled: boolean = false;
	export let onClearClick: (() => void) | undefined = undefined;
	export let activeFilterId: string | undefined = undefined;
	export let onDeleteClick: ((filterId: string, filterText: string) => void) | undefined = undefined;

	let baseSelectRef: BaseSelect;

	function loadSavedFilter(filter: SavedFilter) {
		if (filter.tag) {
			if (activeFilterId === filter.id) {
				baseSelectRef?.clearSelection();
			} else {
				value = [...filter.tag.tags];
			}
			onLoadFilter?.(filter.id);
		}
	}
	
	function handleClear() {
		baseSelectRef?.clearSelection();
		onClearClick?.();
	}
</script>

<BaseSelect
	bind:this={baseSelectRef}
	items={tags.map((tag) => ({ label: tag, value: tag }))}
	bind:value
	label="Filter by tag"
	{savedFilters}
	{loadSavedFilter}
	{addButtonDisabled}
	{onAddClick}
	{clearButtonDisabled}
	onClearClick={handleClear}
	{activeFilterId}
	{onDeleteClick}
/>
