<script lang="ts">
	import BaseSelect from "./base_select.svelte";
	import type { SavedFilter } from "../../settings/settings_store";

	export let tags: string[];
	export let value: string[];
	export let savedFilters: SavedFilter[] = [];
	export let onLoadFilter: ((filterId: string) => void) | undefined = undefined;
	export let showUsingStatus: boolean = false;
	export let showAddButton: boolean = false;
	export let onAddClick: (() => void) | undefined = undefined;

	let baseSelectRef: BaseSelect;

	function loadSavedFilter(filter: SavedFilter) {
		if (filter.tag) {
			value = [...filter.tag.tags];
			onLoadFilter?.(filter.id);
		}
	}
</script>

{#if tags.length}
	<BaseSelect
		bind:this={baseSelectRef}
		items={tags.map((tag) => ({ label: tag, value: tag }))}
		bind:value
		label="Filter by tag"
		{savedFilters}
		{loadSavedFilter}
		{showUsingStatus}
		{showAddButton}
		{onAddClick}
	/>
{/if}
