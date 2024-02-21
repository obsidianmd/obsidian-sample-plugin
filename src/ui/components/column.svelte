<script lang="ts">
	import {
		columnTagTableStore,
		type ColumnTag,
		type DefaultColumns,
		type ColumnTagTable,
	} from "../columns/columns";
	import type { TaskActions } from "../tasks/actions";
	import type { Task } from "../tasks/task";
	import TaskComponent from "./task.svelte";

	export let column: ColumnTag | DefaultColumns;
	export let hideOnEmpty: boolean = false;
	export let tasks: Task[];
	export let taskActions: TaskActions;

	function getColumnTitle(
		column: ColumnTag | DefaultColumns,
		columnTagTable: ColumnTagTable,
	) {
		switch (column) {
			case "done":
				return "Done";
			case "uncategorised":
				return "Uncategorised";
			default:
				return columnTagTable[column];
		}
	}

	$: columnTitle = getColumnTitle(column, $columnTagTableStore);

	$: sortedTasks = tasks.sort((a, b) => {
		if (a.path === b.path) {
			return a.rowIndex - b.rowIndex;
		} else {
			return a.path.localeCompare(b.path);
		}
	});
</script>

{#if !hideOnEmpty || tasks.length}
	<div class="column">
		<h2>{columnTitle}</h2>
		<div class="divide" />
		<div class="tasks">
			{#each sortedTasks as task}
				<TaskComponent {task} {taskActions} />
			{/each}
		</div>
	</div>
{/if}

<style>
	.column {
		width: 220px;
		flex-shrink: 0;
		padding: var(--size-4-3);
		border-radius: var(--radius-m);
		border: var(--border-width) solid var(--background-modifier-border);
		background-color: var(--background-primary);
	}

	.column h2 {
		font-size: var(--font-ui-larger);
		font-weight: var(--font-bold);
		margin: 0;
	}

	.column .divide {
		width: calc(100% + calc(2 * var(--size-4-3)));
		border-bottom: var(--border-width) solid
			var(--background-modifier-border);
		margin: var(--size-4-3) calc(-1 * var(--size-4-3));
	}

	.column .tasks {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-2);
	}
</style>
