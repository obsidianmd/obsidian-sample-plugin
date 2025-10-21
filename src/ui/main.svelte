<script lang="ts">
	import {
		type ColumnTag,
		type ColumnTagTable,
		type ColumnColourTable,
		type DefaultColumns,
	} from "./columns/columns";
	import type { Task } from "./tasks/task";
	import Column from "./components/column.svelte";
	import SelectTag from "./components/select/select_tag.svelte";
	import IconButton from "./components/icon_button.svelte";
	import type { Writable, Readable } from "svelte/store";
	import type { TaskActions } from "./tasks/actions";
	import { type SettingValues, VisibilityOption } from "./settings/settings_store";

	export let tasksStore: Writable<Task[]>;
	export let taskActions: TaskActions;
	export let openSettings: () => Promise<void>;
	export let columnTagTableStore: Readable<ColumnTagTable>;
	export let columnColourTableStore: Readable<ColumnColourTable>;
	export let settingsStore: Writable<SettingValues>;
	export let requestSave: () => void;

	$: tags = $tasksStore.reduce((acc, curr) => {
		for (const tag of curr.tags) {
			acc.add(tag);
		}
		return acc;
	}, new Set<string>());

	let selectedTags: string[] = [];
	$: selectedTagsSet = new Set(selectedTags);

	let activeContentFilterId: string | undefined = undefined;
	let activeTagFilterId: string | undefined = undefined;

	$: savedFilters = $settingsStore.savedFilters ?? [];

	$: {
		if (activeContentFilterId !== undefined) {
			const savedFilter = savedFilters.find(f => f.id === activeContentFilterId);
			if (!savedFilter || savedFilter.content?.text !== filterText.trim()) {
				activeContentFilterId = undefined;
			}
		}
	}

	$: contentFilterMatches = activeContentFilterId !== undefined && 
		savedFilters.find(f => f.id === activeContentFilterId)?.content?.text === filterText.trim();

	$: {
		if (activeTagFilterId !== undefined) {
			const activeFilter = savedFilters.find(f => f.id === activeTagFilterId);
			if (activeFilter?.tag) {
				const sortedCurrent = [...selectedTags].sort();
				const sortedSaved = [...activeFilter.tag.tags].sort();
				if (sortedCurrent.length !== sortedSaved.length || 
					!sortedCurrent.every((tag, i) => tag === sortedSaved[i])) {
					activeTagFilterId = undefined;
				}
			} else {
				activeTagFilterId = undefined;
			}
		}
	}

	$: tagFilterMatches = (() => {
		if (activeTagFilterId === undefined) return false;
		const activeFilter = savedFilters.find(f => f.id === activeTagFilterId);
		if (!activeFilter?.tag) return false;
		const sortedCurrent = [...selectedTags].sort();
		const sortedSaved = [...activeFilter.tag.tags].sort();
		if (sortedCurrent.length !== sortedSaved.length) return false;
		return sortedCurrent.every((tag, i) => tag === sortedSaved[i]);
	})();
	$: contentFilters = savedFilters
		.filter((f) => f.content !== undefined)
		.sort((a, b) => {
			const textA = a.content?.text.toLowerCase() ?? "";
			const textB = b.content?.text.toLowerCase() ?? "";
			return textA.localeCompare(textB);
		});

	$: tagFilters = savedFilters
		.filter((f) => f.tag !== undefined)
		.sort((a, b) => {
			const tagsA = (a.tag?.tags ?? []).join(", ").toLowerCase();
			const tagsB = (b.tag?.tags ?? []).join(", ").toLowerCase();
			return tagsA.localeCompare(tagsB);
		});

	$: contentFilterExists = contentFilters.some(
		(f) => f.content?.text === filterText.trim()
	);

	$: tagFilterExists = (() => {
		if (selectedTags.length === 0) return false;
		const sortedTags = [...selectedTags].sort();
		return savedFilters.some((f) => {
			const filterTags = f.tag?.tags ?? [];
			if (filterTags.length !== sortedTags.length) return false;
			const sortedFilterTags = [...filterTags].sort();
			return sortedFilterTags.every((tag, i) => tag === sortedTags[i]);
		});
	})();

	function addContentFilter() {
		const normalized = filterText.trim();
		const existingFilterIndex = savedFilters.findIndex(
			(f) => f.content?.text === normalized
		);
		if (existingFilterIndex >= 0) {
			return;
		}
		const newFilter = {
			id: crypto.randomUUID(),
			content: { text: normalized },
		};
		$settingsStore.savedFilters = [...savedFilters, newFilter];
		requestSave();
	}

	function loadContentFilter(filterId: string, text: string) {
		filterText = text;
		activeContentFilterId = filterId;
	}

	function addTagFilter() {
		if (selectedTags.length === 0) {
			return;
		}
		const sortedTags = [...selectedTags].sort();
		const existingFilterIndex = savedFilters.findIndex(
			(f) => {
				const filterTags = f.tag?.tags ?? [];
				if (filterTags.length !== sortedTags.length) return false;
				const sortedFilterTags = [...filterTags].sort();
				return sortedFilterTags.every((tag, i) => tag === sortedTags[i]);
			}
		);
		if (existingFilterIndex >= 0) {
			return;
		}
		const newFilter = {
			id: crypto.randomUUID(),
			tag: { tags: sortedTags },
		};
		$settingsStore.savedFilters = [...savedFilters, newFilter];
		requestSave();
	}

	function groupByColumnTag(
		tasks: Task[],
	): Record<ColumnTag | DefaultColumns, Task[]> {
		const output: Record<ColumnTag | DefaultColumns, Task[]> = {
			uncategorised: [],
			done: [],
		};
		for (const task of tasks) {
			if (task.done || task.column === "done") {
				output["done"] = output["done"].concat(task);
			} else if (task.column === "archived") {
				// ignored
			} else if (task.column) {
				output[task.column] = (output[task.column] ?? []).concat(task);
			} else {
				output["uncategorised"] = output["uncategorised"].concat(task);
			}
		}
		return output;
	}

	let columns: ("uncategorised" | ColumnTag)[];
	$: columns = Object.keys($columnTagTableStore) as ColumnTag[];

	let filterText = "";

	$: filteredByText = filterText
		? $tasksStore.filter((task) =>
				task.content.toLowerCase().includes(filterText.toLowerCase()),
			)
		: $tasksStore;

	$: filteredByTag = selectedTagsSet.size
		? filteredByText.filter((task) => {
				for (const tag of task.tags) {
					if (selectedTagsSet.has(tag)) {
						return true;
					}
				}

				return false;
			})
		: filteredByText;

	$: tasksByColumn = groupByColumnTag(filteredByTag);

	$: ({ 
		showFilepath = true, 
		consolidateTags = false, 
		uncategorizedVisibility = VisibilityOption.Auto,
		doneVisibility = VisibilityOption.AlwaysShow
	} = $settingsStore);

	$: showUncategorizedColumn =
		uncategorizedVisibility === VisibilityOption.AlwaysShow ||
		(uncategorizedVisibility === VisibilityOption.Auto && tasksByColumn["uncategorised"]?.length > 0);

	$: showDoneColumn =
		doneVisibility === VisibilityOption.AlwaysShow ||
		(doneVisibility === VisibilityOption.Auto && tasksByColumn["done"]?.length > 0);
		
	async function handleOpenSettings() {
		openSettings();
	}
</script>

<div class="main">
	<div class="settings">
		<IconButton icon="lucide-settings" on:click={handleOpenSettings} />
	</div>
	<div class="controls">
		<div class="text-filter">
			<label for="filter">Filter by content:</label>
			<div class="filter-input-container">
				<input
					name="filter"
					type="search"
					bind:value={filterText}
					placeholder="Type to search..."
					list="content-filters"
				/>
				{#if contentFilters.length > 0}
					<datalist id="content-filters">
						{#each contentFilters as filter}
							<option value={filter.content?.text}>{filter.content?.text}</option>
						{/each}
					</datalist>
				{/if}
			</div>
			{#if contentFilters.length > 0}
				<div class="saved-filters">
					<details>
						<summary>Saved filters</summary>
						<ul>
							{#each contentFilters as filter}
								<li>
									<button on:click={() => loadContentFilter(filter.id, filter.content?.text ?? "")}>
										{filter.content?.text}
									</button>
								</li>
							{/each}
						</ul>
					</details>
				</div>
			{/if}
			{#if contentFilterMatches}
				<div class="filter-status">Using saved</div>
			{/if}
			{#if filterText.trim() !== "" && !contentFilterExists}
				<button class="add-filter-btn" on:click={addContentFilter}>Add</button>
			{/if}
		</div>
		<div class="tag-filter">
			<SelectTag 
				tags={[...tags]} 
				savedFilters={tagFilters} 
				bind:value={selectedTags}
				onLoadFilter={(filterId) => { activeTagFilterId = filterId; }}
				showUsingStatus={tagFilterMatches}
				showAddButton={selectedTags.length > 0 && !tagFilterExists}
				onAddClick={addTagFilter}
			/>
		</div>
	</div>

	<div class="columns">
		<div>
			{#if showUncategorizedColumn}
			<Column
				column={"uncategorised"}
				hideOnEmpty={false}
				tasks={tasksByColumn["uncategorised"]}
				{taskActions}
				{columnTagTableStore}
				{columnColourTableStore}
				{showFilepath}
				{consolidateTags}
			/>
			{/if}
			{#each columns as column}
				<Column
					{column}
					tasks={tasksByColumn[column] ?? []}
					{taskActions}
					{columnTagTableStore}
					{columnColourTableStore}
					{showFilepath}
					{consolidateTags}
				/>
			{/each}
			{#if showDoneColumn}
			<Column
				column="done"
				hideOnEmpty={false}
				tasks={tasksByColumn["done"] ?? []}
				{taskActions}
				{columnTagTableStore}
				{columnColourTableStore}
				{showFilepath}
				{consolidateTags}
			/>
			{/if}
		</div>
	</div>
</div>

<style lang="scss">
	.main {
		height: 100%;
		display: flex;
		flex-direction: column;

		.settings {
			display: flex;
			justify-content: flex-end;
		}

		.controls {
			margin-bottom: var(--size-4-4);
			display: grid;
			gap: var(--size-4-8);
			grid-template-columns: 1fr 1fr;

			.text-filter {
				display: flex;
				flex-direction: column;
				flex-grow: 1;

				label {
					display: inline-block;
					margin-bottom: var(--size-4-1);
				}

				.filter-input-container {
					input[type="search"] {
						display: block;
						width: 100%;
						background: var(--background-primary);

						&::-webkit-calendar-picker-indicator,
						&::-webkit-list-button {
							display: none !important;
							opacity: 0 !important;
							pointer-events: none !important;
						}
					}
				}

				.filter-status {
					margin-top: var(--size-4-1);
					font-size: var(--font-ui-small);
					color: var(--text-muted);
					align-self: flex-start;
				}

				.add-filter-btn {
					margin-top: var(--size-4-1);
					padding: var(--size-4-1) var(--size-4-2);
					background: var(--interactive-accent);
					color: var(--text-on-accent);
					border: none;
					border-radius: var(--radius-s);
					cursor: pointer;
					font-size: var(--font-ui-small);
					align-self: flex-start;

					&:hover {
						background: var(--interactive-accent-hover);
					}
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
			}

			.tag-filter {
				display: flex;
				flex-direction: column;
				flex-grow: 1;
			}
		}

		.columns {
			height: 100%;
			flex-grow: 1;
			max-width: 100vw;
			overflow-x: scroll;
			padding-bottom: var(--size-4-3);

			> div {
				display: flex;
				gap: var(--size-4-3);
			}
		}
	}
</style>
