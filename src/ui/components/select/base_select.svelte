<script lang="ts">
	import Select from "svelte-select/Select.svelte";

	export let label: string;
	export let items: { label: string; value: string }[];
	export let value: string[];

	let selectedItems: { label: string; value: string }[] = items.filter(
		(item) => value.includes(item.value),
	);
	$: value = (selectedItems ?? []).map(({ value }) => value);
</script>

<Select
	multiple
	{items}
	bind:value={selectedItems}
	--background="var(--color-base-25)"
	--border="2px solid var(--background-modifier-border)"
	--border-focused="ar(--color-base-25)"
	--border-hover="ar(--color-base-25)"
	--list-border="var(--border-width) solid var(--background-modifier-border)"
	--border-radius="var(--radius-m)"
	--list-background="var(--color-base-35)"
	--item-hover-bg="var(--background-secondary-alt)"
	--multi-item-color="var(--pill-color)"
	--multi-item-clear-icon-color="var(--pill-color)"
	--multi-item-bg="var(--pill-background)"
	--multi-item-outline="var(--border-width) solid var(--pill-border-color)"
	--multi-item-padding="var(--pill-padding-y) var(--pill-padding-x)"
	--multi-item-height="auto"
>
	<p slot="prepend" class="select-prepend">{label}:</p>
</Select>

<style lang="scss">
	.select-prepend {
		margin-right: var(--size-4-4);
	}
</style>
