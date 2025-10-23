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
	import DeleteFilterModal from "./components/delete_filter_modal.svelte";
	import type { Writable, Readable } from "svelte/store";
	import type { TaskActions } from "./tasks/actions";
	import { type SettingValues, VisibilityOption } from "./settings/settings_store";
	import { onMount } from "svelte";

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

	// Collect and sort available file paths for autocomplete
	// Note: The native <datalist> autocomplete performs substring matching on the full path,
	// so typing "a/b" will match "apple/banana" or "data/backup", not just paths with those exact segments.
	// This is browser behavior and may show multiple unrelated paths with matching substrings.
	$: availableFiles = [...new Set($tasksStore.map(task => task.path))].sort((a, b) => {
		const aParts = a.split('/');
		const bParts = b.split('/');
		const minLength = Math.min(aParts.length, bParts.length);
		
		for (let i = 0; i < minLength; i++) {
			// If one path ends here and the other continues, shorter (file) comes first
			const aIsLast = (i === aParts.length - 1);
			const bIsLast = (i === bParts.length - 1);
			
			if (aIsLast && !bIsLast) return -1;
			if (bIsLast && !aIsLast) return 1;
			
			const aPart = aParts[i];
			const bPart = bParts[i];
			if (aPart === undefined || bPart === undefined) continue;
			const comparison = aPart.localeCompare(bPart);
			if (comparison !== 0) return comparison;
		}
		
		return aParts.length - bParts.length;
	});

	let selectedTags: string[] = [];
	$: selectedTagsSet = new Set(selectedTags);

	let activeContentFilterId: string | undefined = undefined;
	let activeTagFilterId: string | undefined = undefined;
	let activeFileFilterId: string | undefined = undefined;

	let deleteModalOpen = false;
	let filterToDelete: { id: string; text: string; type: 'content' | 'tag' | 'file' } | null = null;

	$: savedFilters = $settingsStore.savedFilters ?? [];

	$: {
		const trimmedText = filterText.trim();
		if (trimmedText) {
			const matchingFilter = savedFilters.find(f => f.content?.text === trimmedText);
			if (matchingFilter) {
				activeContentFilterId = matchingFilter.id;
			} else {
				activeContentFilterId = undefined;
			}
		} else {
			activeContentFilterId = undefined;
		}
	}

	$: {
		if (selectedTags.length > 0) {
			const sortedCurrent = [...selectedTags].sort();
			const matchingFilter = savedFilters.find(f => {
				if (!f.tag) return false;
				const sortedSaved = [...f.tag.tags].sort();
				return sortedCurrent.length === sortedSaved.length &&
					sortedCurrent.every((tag, i) => tag === sortedSaved[i]);
			});
			if (matchingFilter) {
				activeTagFilterId = matchingFilter.id;
			} else {
				activeTagFilterId = undefined;
			}
		} else {
			activeTagFilterId = undefined;
		}
	}

	$: {
		const trimmedPath = fileFilter.trim();
		if (trimmedPath) {
			const matchingFilter = savedFilters.find(f => f.file?.filepaths[0] === trimmedPath);
			if (matchingFilter) {
				activeFileFilterId = matchingFilter.id;
			} else {
				activeFileFilterId = undefined;
			}
		} else {
			activeFileFilterId = undefined;
		}
	}

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

	$: fileFilters = savedFilters
		.filter((f) => f.file !== undefined)
		.sort((a, b) => {
			const pathA = a.file?.filepaths[0] ?? "";
			const pathB = b.file?.filepaths[0] ?? "";
			return pathA.localeCompare(pathB);
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

	$: fileFilterExists = savedFilters.some(
		(f) => f.file?.filepaths[0] === fileFilter.trim()
	);

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

	function clearContentFilter() {
		filterText = "";
		activeContentFilterId = undefined;
	}

	function clearFileFilter() {
		fileFilter = "";
		activeFileFilterId = undefined;
	}

	function addFileFilter() {
		const normalized = fileFilter.trim();
		if (!normalized) return;
		
		const existingFilterIndex = savedFilters.findIndex(
			(f) => f.file?.filepaths[0] === normalized
		);
		if (existingFilterIndex >= 0) {
			return;
		}
		const newFilter = {
			id: crypto.randomUUID(),
			file: { filepaths: [normalized] },
		};
		$settingsStore.savedFilters = [...savedFilters, newFilter];
		requestSave();
	}

	function loadFileFilter(filterId: string, filepath: string) {
		fileFilter = filepath;
		activeFileFilterId = filterId;
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

	function clearTagFilter() {
		selectedTags = [];
		activeTagFilterId = undefined;
	}

	function openDeleteModal(filterId: string, filterText: string, type: 'content' | 'tag' | 'file') {
		filterToDelete = { id: filterId, text: filterText, type };
		deleteModalOpen = true;
	}

	function closeDeleteModal() {
		deleteModalOpen = false;
		filterToDelete = null;
	}

	function confirmDelete() {
		if (!filterToDelete) return;
		
		const filterId = filterToDelete.id;
		const filterType = filterToDelete.type;
		
		const wasActive = filterType === 'content' 
			? activeContentFilterId === filterId
			: filterType === 'tag'
			? activeTagFilterId === filterId
			: activeFileFilterId === filterId;
		
		$settingsStore.savedFilters = savedFilters.filter(f => f.id !== filterId);
		
		if (wasActive) {
			if (filterType === 'content') {
				activeContentFilterId = undefined;
			} else if (filterType === 'tag') {
				activeTagFilterId = undefined;
			} else {
				activeFileFilterId = undefined;
			}
		}
		
		requestSave();
		closeDeleteModal();
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
	let fileFilter = "";
	let hasInitialized = false;

	onMount(() => {
		const unsubscribe = settingsStore.subscribe(settings => {
			if (!hasInitialized && (settings.lastContentFilter || settings.lastTagFilter || settings.lastFileFilter)) {
				filterText = settings.lastContentFilter ?? "";
				selectedTags = settings.lastTagFilter ?? [];
				fileFilter = settings.lastFileFilter?.[0] ?? "";
				hasInitialized = true;
			}
		});

		return unsubscribe;
	});

	function saveFilterState() {
		if (hasInitialized) {
			settingsStore.update(settings => ({
				...settings,
				lastContentFilter: filterText,
				lastTagFilter: selectedTags,
				lastFileFilter: fileFilter ? [fileFilter] : [],
			}));
			requestSave();
		}
	}

	$: if (hasInitialized) {
		filterText;
		selectedTags;
		fileFilter;
		saveFilterState();
	}

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

	$: filteredByFile = fileFilter
		? filteredByTag.filter((task) =>
				task.path.toLowerCase().includes(fileFilter.toLowerCase()),
			)
		: filteredByTag;

	$: tasksByColumn = groupByColumnTag(filteredByFile);

	$: ({ 
		showFilepath = true, 
		consolidateTags = false, 
		uncategorizedVisibility = VisibilityOption.Auto,
		doneVisibility = VisibilityOption.AlwaysShow,
		filtersExpanded = true
	} = $settingsStore);

	$: showUncategorizedColumn =
		uncategorizedVisibility === VisibilityOption.AlwaysShow ||
		(uncategorizedVisibility === VisibilityOption.Auto && tasksByColumn["uncategorised"]?.length > 0);

	$: showDoneColumn =
		doneVisibility === VisibilityOption.AlwaysShow ||
		(doneVisibility === VisibilityOption.Auto && tasksByColumn["done"]?.length > 0);
	
	function toggleFiltersExpanded(event: Event) {
		const detailsElement = event.currentTarget as HTMLDetailsElement;
		$settingsStore.filtersExpanded = detailsElement.open;
		requestSave();
	}
		
	async function handleOpenSettings() {
		openSettings();
	}
</script>

<div class="main">
	<div class="settings">
		<IconButton icon="lucide-settings" on:click={handleOpenSettings} />
	</div>
	<details class="filters-section" open={filtersExpanded} on:toggle={toggleFiltersExpanded}>
		<summary class="filters-summary">Filters</summary>
		<div class="controls">
		<div class="text-filter">
			<label for="filter">Filter by content:</label>
			<div class="saved-filters">
				<details>
					<summary>Saved filters</summary>
					<ul role="list">
						{#each contentFilters as filter}
							<li>
								<button 
									class="delete-btn"
									on:click={() => openDeleteModal(filter.id, filter.content?.text ?? "", 'content')}
									aria-label="Delete filter: {filter.content?.text}"
								>
									×
								</button>
								<button 
									class:active={filter.id === activeContentFilterId}
									on:click={() => loadContentFilter(filter.id, filter.content?.text ?? "")}
									aria-label="Load saved filter: {filter.content?.text}"
									aria-pressed={filter.id === activeContentFilterId}
								>
									{filter.content?.text}
								</button>
							</li>
						{/each}
					</ul>
				</details>
			</div>
			<div class="filter-input-container">
				<input
					id="filter"
					name="filter"
					type="search"
					bind:value={filterText}
					placeholder="Type to search..."
					list="content-filters"
					aria-describedby={contentFilters.length > 0 ? "content-filters" : undefined}
				/>
				<div class="inline-actions">
					<button 
						class="inline-action-btn" 
						disabled={filterText.trim() === "" || contentFilterExists}
						on:click={addContentFilter}
						aria-label="Save filter"
					>
						Save
					</button>
					<button 
						class="inline-action-btn" 
						disabled={filterText.trim() === ""}
						on:click={clearContentFilter}
						aria-label="Clear filter"
					>
						Clear
					</button>
				</div>
				{#if contentFilters.length > 0}
					<datalist id="content-filters">
						{#each contentFilters as filter}
							<option value={filter.content?.text}>{filter.content?.text}</option>
						{/each}
					</datalist>
				{/if}
			</div>
		</div>
		<div class="tag-filter">
			<SelectTag 
				tags={[...tags]} 
				savedFilters={tagFilters} 
				bind:value={selectedTags}
				onLoadFilter={(filterId) => { activeTagFilterId = filterId; }}
				addButtonDisabled={selectedTags.length === 0 || tagFilterExists}
				onAddClick={addTagFilter}
				clearButtonDisabled={selectedTags.length === 0}
				onClearClick={clearTagFilter}
				activeFilterId={activeTagFilterId}
				onDeleteClick={(filterId, filterText) => openDeleteModal(filterId, filterText, 'tag')}
			/>
		</div>
		<div class="file-filter">
			<label for="file-filter">Filter by file:</label>
			<div class="saved-filters">
				<details>
					<summary>Saved filters</summary>
					<ul role="list">
						{#each fileFilters as filter}
							<li>
								<button 
									class="delete-btn"
									on:click={() => openDeleteModal(filter.id, filter.file?.filepaths[0] ?? "", 'file')}
									aria-label="Delete filter: {filter.file?.filepaths[0]}"
								>
									×
								</button>
								<button 
									class:active={filter.id === activeFileFilterId}
									on:click={() => loadFileFilter(filter.id, filter.file?.filepaths[0] ?? "")}
									aria-label="Load saved filter: {filter.file?.filepaths[0]}"
									aria-pressed={filter.id === activeFileFilterId}
								>
									{filter.file?.filepaths[0]}
								</button>
							</li>
						{/each}
					</ul>
				</details>
			</div>
			<div class="filter-input-container">
				<input
					id="file-filter"
					name="file-filter"
					type="search"
					bind:value={fileFilter}
					placeholder="Type to search files..."
					list="file-paths"
					aria-label="Filter by file path"
				/>
				<div class="inline-actions">
					<button 
						class="inline-action-btn" 
						disabled={fileFilter.trim() === "" || fileFilterExists}
						on:click={addFileFilter}
						aria-label="Save filter"
					>
						Save
					</button>
					<button 
						class="inline-action-btn" 
						disabled={fileFilter.trim() === ""}
						on:click={clearFileFilter}
						aria-label="Clear file filter"
					>
						Clear
					</button>
				</div>
				{#if availableFiles.length > 0}
					<datalist id="file-paths">
						{#each availableFiles as filePath}
							<option value={filePath}>{filePath}</option>
						{/each}
					</datalist>
				{/if}
			</div>
		</div>
		</div>
	</details>

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

{#if deleteModalOpen && filterToDelete}
	<DeleteFilterModal
		filterText={filterToDelete.text}
		onConfirm={confirmDelete}
		onCancel={closeDeleteModal}
	/>
{/if}

<style lang="scss">
	.main {
		height: 100%;
		display: flex;
		flex-direction: column;

		.settings {
			display: flex;
			justify-content: flex-end;
		}

		.filters-section {
			margin-bottom: var(--size-4-4);
			background: var(--background-secondary);
			padding: var(--size-4-4) var(--size-4-4) var(--size-4-4) var(--size-4-4);
			border-radius: var(--radius-m);
			border-bottom: 1px solid var(--background-modifier-border);

			.filters-summary {
				cursor: pointer;
				user-select: none;
				font-weight: 600;
				color: var(--text-normal);
				list-style: none;
				transition: color 0.15s ease;
				margin-bottom: var(--size-4-4);
				position: relative;
				padding-left: var(--size-4-3);

				&:hover {
					color: var(--text-muted);
				}

				&::-webkit-details-marker {
					display: none;
				}

				&::before {
					content: "▸";
					position: absolute;
					left: 0;
					transition: transform 0.15s ease;
				}
			}

			&[open] .filters-summary::before {
				content: "▾";
			}

			&:not([open]) {
				padding-bottom: var(--size-4-4);
			}

			&:not([open]) .filters-summary {
				margin-bottom: 0;
			}
		}

		.controls {
			display: flex;
			flex-direction: column;
			gap: var(--size-4-3);
			max-width: 400px;

			.saved-filters {
				margin-top: 0;
				margin-bottom: var(--size-4-2);
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
							gap: var(--size-4-2);

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

			.text-filter {
				display: flex;
				flex-direction: column;

				label {
					display: inline-block;
					margin-bottom: var(--size-2-3);
				}

				.filter-input-container {
					position: relative;
					
					input[type="search"] {
						display: block;
						width: 100%;
						background: var(--background-primary);
						padding: var(--size-4-2) 120px var(--size-4-2) var(--size-4-2);
						min-height: 54px;
						box-sizing: border-box;

						&::-webkit-calendar-picker-indicator,
						&::-webkit-list-button {
							display: none !important;
							opacity: 0 !important;
							pointer-events: none !important;
						}
					}
					
					.inline-actions {
						position: absolute;
						right: var(--size-4-1);
						top: 50%;
						transform: translateY(-50%);
						display: flex;
						gap: var(--size-4-2);
					}
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
			}

			.tag-filter {
				display: flex;
				flex-direction: column;
			}

			.file-filter {
				display: flex;
				flex-direction: column;

				label {
					display: inline-block;
					margin-bottom: var(--size-2-3);
				}

				.filter-input-container {
					position: relative;
					
					input[type="search"] {
						display: block;
						width: 100%;
						background: var(--background-primary);
						padding: var(--size-4-2) 100px var(--size-4-2) var(--size-4-2);
						min-height: 54px;
						box-sizing: border-box;

						&::-webkit-calendar-picker-indicator,
						&::-webkit-list-button {
							display: none !important;
							opacity: 0 !important;
							pointer-events: none !important;
						}
					}
					
					.inline-actions {
						position: absolute;
						right: var(--size-4-1);
						top: 50%;
						transform: translateY(-50%);
						display: flex;
						gap: var(--size-4-2);
					}
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
