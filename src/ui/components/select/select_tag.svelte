<script lang="ts">
	import BaseSelect from "./base_select.svelte";

	export let tags: string[];
	export let value: string[];
</script>

{#if tags.length}
	<BaseSelect
		items={tags.map((tag) => ({ label: tag, value: tag }))}
		bind:value
		label="Filter by tag"
	/>
{/if}
