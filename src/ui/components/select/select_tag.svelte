<script lang="ts">
	import BaseSelect from "./base_select.svelte";
	import type { SavedFilter } from "../../settings/settings_store";

	export let tags: string[];
	export let value: string[];
	export let savedFilters: SavedFilter[] = [];

	let baseSelectRef: BaseSelect;

	function loadSavedFilter(filter: SavedFilter) {
		if (filter.tag) {
			value = [...filter.tag.tags];
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
	/>
{/if}
