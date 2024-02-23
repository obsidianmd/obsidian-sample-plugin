<script lang="ts">
	import { type EventRef, type Vault, type Workspace } from "obsidian";
	import { createTasksStore } from "./tasks/store";
	import {
		columnTagTableStore,
		createColumnTagTable,
		type ColumnConfig,
		type ColumnTag,
		type DefaultColumns,
	} from "./columns/columns";
	import type { Task } from "./tasks/task";
	import Column from "./components/column.svelte";
	import { userStore } from "./users/users";
	import { kebab } from "src/kebab";

	export let vault: Vault;
	export let workspace: Workspace;
	export let registerEvent: (eventRef: EventRef) => void;
	export let columnConfig: ColumnConfig = {
		columns: [
			"Later",
			"Soonish",
			"Next week",
			"This week",
			"Today",
			"Pending",
		],
	};
	export let userConfig: string[];

	$: userStore.set(
		userConfig.reduce<Record<string, string>>((acc, curr) => {
			acc[kebab(curr)] = curr;
			return acc;
		}, {}),
	);
	$: columnTagTableStore.set(createColumnTagTable(columnConfig));

	const { tasksStore, taskActions } = createTasksStore(
		vault,
		workspace,
		registerEvent,
		columnTagTableStore,
	);

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

	let showUnassigned: boolean = true;
	let filters = new Set(userConfig.map(kebab));

	$: filteredTasks = $tasksStore.filter((task) => {
		if (!task.owner) {
			return showUnassigned;
		}

		return filters.has(task.owner);
	});

	$: tasksByColumn = groupByColumnTag(filteredTasks);
</script>

<div class="main">
	{#if userConfig.length}
		<div class="controls">
			<label>
				<input
					type="checkbox"
					bind:checked={showUnassigned}
					on:dblclick={(e) => {
						e.preventDefault();
						filters = new Set([]);
						showUnassigned = true;
					}}
				/>
				Unassigned
			</label>
			{#each userConfig as user, i}
				<label>
					<input
						type="checkbox"
						checked={filters.has(kebab(user))}
						on:change={() => {
							const userId = kebab(user);
							const newFilters = new Set(filters);
							if (newFilters.has(userId)) {
								newFilters.delete(userId);
							} else {
								newFilters.add(userId);
							}
							filters = newFilters;
						}}
						on:dblclick={(e) => {
							e.preventDefault();
							filters = new Set([kebab(user)]);
							showUnassigned = false;
						}}
					/>
					{user}
				</label>
			{/each}
		</div>
	{/if}
	<div class="columns">
		<div>
			<Column
				column={"uncategorised"}
				hideOnEmpty={true}
				tasks={tasksByColumn["uncategorised"]}
				{taskActions}
			/>
			{#each columns as column}
				<Column
					{column}
					tasks={tasksByColumn[column] ?? []}
					{taskActions}
				/>
			{/each}
			<Column
				column="done"
				tasks={tasksByColumn["done"] ?? []}
				{taskActions}
			/>
		</div>
	</div>
</div>

<style lang="scss">
	.main {
		height: 100%;
		display: flex;
		flex-direction: column;

		.controls {
			margin-bottom: var(--size-4-4);
			display: flex;
			gap: var(--size-4-8);

			label {
				display: flex;
				align-items: center;
				gap: var(--size-2-1);
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
