<script lang="ts">
	import Select from "svelte-select";

	export let label: string;
	export let items: { label: string; value: string }[];
	export let value: string[];

	$: fieldName = `field=${label}`;

	let selectedItems: { label: string; value: string }[] = items.filter(
		(item) => value.includes(item.value),
	);
	$: value = (selectedItems ?? []).map(({ value }) => value);
</script>

<div>
	<label for={fieldName}>
		{label}:
	</label>

	<Select
		name={fieldName}
		multiple={true}
		closeListOnChange={false}
		listAutoWidth={true}
		placeholderAlwaysShow={true}
		{items}
		bind:value={selectedItems}
		--background="var(--background-primary)"
		--border="var(--border-width) solid var(--background-modifier-border)"
		--border-focused="var(--border-width) solid var(--background-modifier-border-focus)"
		--border-hover="var(--border-width) solid var(--background-modifier-border-hover)"
		--border-radius="var(--radius-m)"
		--item-hover-bg="var(--background-modifier-hover)"
		--list-background="var(--background-primary)"
		--list-border="var(--border-width) solid var(--background-modifier-border)"
		--multi-item-bg="var(--pill-background)"
		--multi-item-clear-icon-color="var(--pill-color)"
		--multi-item-color="var(--pill-color)"
		--multi-item-height="auto"
		--multi-item-outline="var(--border-width) solid var(--pill-border-color)"
		--multi-item-padding="var(--pill-padding-y) var(--pill-padding-x)"
		--multi-select-input-padding="var(--size-2-2) var(--size-4-1)"
		--multi-select-input-margin="var(--size-2-2) var(--size-4-4) var(--size-2-2) var(--size-2-2)"
	></Select>
</div>

<style lang="scss">
	label {
		display: inline-block;
		margin-bottom: var(--size-4-1);
	}

	:global(.svelte-select button > svg),
	:global(.svelte-select .multi-item-clear > svg) {
		cursor: pointer;
	}
</style>
