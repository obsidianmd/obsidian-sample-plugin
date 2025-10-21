<script lang="ts">
	import Select from "svelte-select";
	import { tick } from "svelte";
	import type { SavedFilter } from "../../settings/settings_store";

	export let label: string;
	export let items: { label: string; value: string }[];
	export let value: string[];
	export let savedFilters: SavedFilter[] = [];
	export let loadSavedFilter: ((filter: SavedFilter) => void) | undefined = undefined;

	$: fieldName = `field=${label}`;

	let selectedItems: { label: string; value: string }[] = items.filter(
		(item) => value.includes(item.value),
	);
	$: value = (selectedItems ?? []).map(({ value }) => value);

	$: savedFilterOptions = savedFilters.map((filter) => {
		const displayText = filter.tag ? filter.tag.tags.join(", ") : "";
		return { filter, displayText };
	});

	async function handleSavedFilterSelect(option: { filter: SavedFilter; displayText: string }) {
		if (loadSavedFilter) {
			loadSavedFilter(option.filter);
			// Wait for the next tick to allow value to propagate from parent
			await tick();
			// Now update selectedItems based on the new value
			selectedItems = items.filter((item) => value.includes(item.value));
		}
	}
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
		--border-radius="var(--input-radius)"
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

	{#if savedFilterOptions.length > 0}
		<div class="saved-filters">
			<details>
				<summary>Saved filters</summary>
				<ul>
					{#each savedFilterOptions as option}
						<li>
							<button on:click={() => handleSavedFilterSelect(option)}>
								{option.displayText}
							</button>
						</li>
					{/each}
				</ul>
			</details>
		</div>
	{/if}
</div>

<style lang="scss">
	label {
		display: inline-block;
		margin-bottom: var(--size-4-1);
	}

	.saved-filters {
		margin-top: var(--size-4-1);
		font-size: var(--font-ui-small);
		align-self: flex-start;

		details {
			summary {
				cursor: pointer;
				color: var(--text-muted);
				padding: var(--size-2-1) 0;
				user-select: none;

				&:hover {
					color: var(--text-normal);
				}
			}

			ul {
				margin: 0;
				padding: 0;
				list-style: none;

				li {
					margin: 0;

					button {
						text-align: left;
						padding: var(--size-2-1) var(--size-2-2);
						background: transparent;
						border: none;
						cursor: pointer;
						color: var(--text-normal);
						border-radius: var(--radius-s);
						white-space: nowrap;

						&:hover {
							background: var(--background-modifier-hover);
						}
					}
				}
			}
		}
	}

	:global(.svelte-select button > svg),
	:global(.svelte-select .multi-item-clear > svg) {
		cursor: pointer;
	}

	:global(.svelte-select .multi-item) {
		border: var(--border-width) solid var(--pill-border-color) !important;
		outline: none !important;
	}
</style>
