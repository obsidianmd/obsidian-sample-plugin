<script lang="ts">
	import Select from "svelte-select";
	import { tick } from "svelte";
	import type { SavedFilter } from "../../settings/settings_store";

	export let label: string;
	export let items: { label: string; value: string }[];
	export let value: string[];
	export let savedFilters: SavedFilter[] = [];
	export let loadSavedFilter: ((filter: SavedFilter) => void) | undefined = undefined;
	export let addButtonDisabled: boolean = false;
	export let onAddClick: (() => void) | undefined = undefined;
	export let clearButtonDisabled: boolean = false;
	export let onClearClick: (() => void) | undefined = undefined;
	export let activeFilterId: string | undefined = undefined;
	export let onDeleteClick: ((filterId: string, filterText: string) => void) | undefined = undefined;

	$: fieldName = `field=${label}`;

	let selectedItems: { label: string; value: string }[] = items.filter(
		(item) => value.includes(item.value),
	);
	$: value = (selectedItems ?? []).map(({ value }) => value);
	
	export function clearSelection() {
		selectedItems = [];
	}

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

	<div class="saved-filters">
		<details>
			<summary>Saved filters</summary>
			<ul role="list">
				{#each savedFilterOptions as option}
					<li>
						{#if onDeleteClick}
							<button 
								class="delete-btn"
								on:click={() => onDeleteClick?.(option.filter.id, option.displayText)}
								aria-label="Delete filter: {option.displayText}"
							>
								×
							</button>
						{/if}
						<button 
							class:active={option.filter.id === activeFilterId}
							on:click={() => handleSavedFilterSelect(option)}
							aria-label="Load saved filter: {option.displayText}"
							aria-pressed={option.filter.id === activeFilterId}
						>
							{option.displayText}
						</button>
					</li>
				{/each}
			</ul>
		</details>
	</div>
	
	<div class="select-wrapper">
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
		--multi-select-input-padding="var(--size-4-2) 120px var(--size-4-2) var(--size-4-2)"
		--multi-select-input-margin="var(--size-2-2) var(--size-4-4) var(--size-2-2) var(--size-2-2)"
	></Select>
	<div class="inline-actions">
		<button 
			class="inline-action-btn" 
			disabled={addButtonDisabled} 
			on:click={onAddClick}
			aria-label="Add filter"
		>
			Add
		</button>
		<button 
			class="inline-action-btn" 
			disabled={clearButtonDisabled} 
			on:click={onClearClick}
			aria-label="Clear filter"
		>
			Clear
		</button>
	</div>
	</div>
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
				transition: color 0.15s ease;

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
					display: flex;
					align-items: center;
					gap: var(--size-2-1);

					button {
						text-align: left;
						padding: var(--size-2-1) var(--size-2-2);
						background: transparent;
						border: none;
						cursor: pointer;
						color: var(--text-normal);
						border-radius: var(--radius-s);
						white-space: nowrap;
						transition: background 0.15s ease, color 0.15s ease;

						&:hover {
							background: var(--background-modifier-hover);
						}

						&.active {
							font-weight: 700;
							color: var(--interactive-accent);
						}

						&.delete-btn {
							padding: 0;
							width: 20px;
							height: 20px;
							display: flex;
							align-items: center;
							justify-content: center;
							font-size: 18px;
							line-height: 1;
							color: var(--text-muted);

							&:hover {
								color: var(--color-red);
								background: var(--background-modifier-error-hover);
							}
						}
					}
				}
			}
		}
	}

	.select-wrapper {
		position: relative;
	}

	.inline-actions {
		position: absolute;
		right: var(--size-4-1);
		top: 50%;
		transform: translateY(-50%);
		display: flex;
		gap: var(--size-4-2);
		z-index: 10;
	}

	.inline-action-btn {
		padding: var(--size-2-1) var(--size-4-2);
		background: var(--interactive-accent);
		color: var(--text-on-accent);
		border: none;
		border-radius: var(--radius-s);
		cursor: pointer;
		font-size: var(--font-ui-smaller);
		white-space: nowrap;
		transition: background 0.15s ease, opacity 0.15s ease;

		&:hover:not(:disabled) {
			background: var(--interactive-accent-hover);
		}

		&:disabled {
			opacity: 0.5;
			cursor: not-allowed;
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
