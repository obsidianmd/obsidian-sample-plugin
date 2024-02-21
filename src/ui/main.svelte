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

	export let vault: Vault;
	export let workspace: Workspace;
	export let registerEvent: (eventRef: EventRef) => void;
	export let columnConfig: ColumnConfig = {
		columns: ["Later", "Next week", "This week", "Today", "Pending"],
	};

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
			if (task.done) {
				output["done"] = output["done"].concat(task);
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

	$: tasksByColumn = groupByColumnTag($tasksStore);
</script>

<section>
	<h1>Project Planner</h1>
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
</section>

<style>
	.columns {
		max-width: 100vw;
		overflow-x: scroll;
		padding-bottom: var(--size-4-3);
	}

	.columns > div {
		display: flex;
		gap: var(--size-4-3);
	}
</style>
