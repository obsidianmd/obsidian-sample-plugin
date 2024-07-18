<script lang="ts">
	import {
		type ColumnTag,
		type ColumnTagTable,
		type DefaultColumns,
	} from "./columns/columns";
	import type { Task } from "./tasks/task";
	import Column from "./components/column.svelte";
	import SelectTag from "./components/select/select_tag.svelte";
	import IconButton from "./components/icon_button.svelte";
	import type { Writable, Readable } from "svelte/store";
	import type { TaskActions } from "./tasks/actions";
	import type { SettingValues } from "./settings/settings_store";

	export let tasksStore: Writable<Task[]>;
	export let taskActions: TaskActions;
	export let openSettings: () => Promise<void>;
	export let columnTagTableStore: Readable<ColumnTagTable>;
	export let settingsStore: Writable<SettingValues>;

	$: tags = $tasksStore.reduce((acc, curr) => {
		for (const tag of curr.tags) {
			acc.add(tag);
		}
		return acc;
	}, new Set<string>());

	let selectedTags: string[] = [];
	$: selectedTagsSet = new Set(selectedTags);

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

	$: showFilepath = $settingsStore.showFilepath ?? true;
	$: showTags = $settingsStore.showTags ?? true;
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
			<input
				name="filter"
				type="search"
				bind:value={filterText}
				placeholder="Type to search..."
			/>
		</div>
		<SelectTag tags={[...tags]} bind:value={selectedTags} />
	</div>

	<div class="columns">
		<div>
			<Column
				column={"uncategorised"}
				hideOnEmpty={true}
				tasks={tasksByColumn["uncategorised"]}
				{taskActions}
				{columnTagTableStore}
				{showFilepath}
				showTags={showTags}
			/>
			{#each columns as column}
				<Column
					{column}
					tasks={tasksByColumn[column] ?? []}
					{taskActions}
					{columnTagTableStore}
					{showFilepath}
					showTags={showTags}
				/>
			{/each}
			<Column
				column="done"
				tasks={tasksByColumn["done"] ?? []}
				{taskActions}
				{columnTagTableStore}
				{showFilepath}
				showTags={showTags}
			/>
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

					~ input[type="search"] {
						display: block;
						flex-grow: 1;
						background: var(--background-primary);
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
