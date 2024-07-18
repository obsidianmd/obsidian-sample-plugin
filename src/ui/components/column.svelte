<script lang="ts">
	import { Menu, setIcon } from "obsidian";
	import {
		type ColumnTag,
		type DefaultColumns,
		type ColumnTagTable,
		isColumnTag,
	} from "../columns/columns";
	import type { TaskActions } from "../tasks/actions";
	import type { Task } from "../tasks/task";
	import TaskComponent from "./task.svelte";
	import IconButton from "./icon_button.svelte";
	import { isDraggingStore } from "../dnd/store";
	import type { Readable } from "svelte/store";

	export let column: ColumnTag | DefaultColumns;
	export let hideOnEmpty: boolean = false;
	export let tasks: Task[];
	export let taskActions: TaskActions;
	export let columnTagTableStore: Readable<ColumnTagTable>;
	export let showFilepath: boolean;
	export let showTags: boolean;

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

	function showMenu(e: MouseEvent) {
		const menu = new Menu();

		menu.addItem((i) => {
			i.setTitle(`Archive all`).onClick(() =>
				taskActions.archiveTasks(tasks.map(({ id }) => id)),
			);
		});

		menu.showAtMouseEvent(e);
	}

	let isDraggedOver = false;

	$: draggingData = $isDraggingStore;
	$: canDrop = draggingData && draggingData.fromColumn !== column;

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		if (!canDrop) {
			if (e.dataTransfer) {
				e.dataTransfer.dropEffect = "none";
			}
			return;
		}

		isDraggedOver = true;
		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = "move";
		}
	}

	function handleDragLeave(e: DragEvent) {
		isDraggedOver = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		if (!canDrop) {
			return;
		}

		// Get the id of the target and add the moved element to the target's DOM
		const droppedId = e.dataTransfer?.getData("text/plain");
		if (droppedId) {
			switch (column) {
				case "uncategorised":
					break;
				case "done":
					taskActions.markDone(droppedId);
					break;
				default:
					taskActions.changeColumn(droppedId, column);
					break;
			}
		}
	}

	let buttonEl: HTMLSpanElement | undefined;

	$: {
		if (buttonEl) {
			setIcon(buttonEl, "lucide-plus");
		}
	}
</script>

{#if !hideOnEmpty || tasks.length}
	<div
		role="group"
		class="column"
		class:drop-active={!!draggingData}
		class:drop-hover={isDraggedOver}
		on:dragover={handleDragOver}
		on:dragleave={handleDragLeave}
		on:drop={handleDrop}
	>
		<div class="header">
			<h2>{columnTitle}</h2>
			{#if column === "done"}
				<IconButton icon="lucide-more-vertical" on:click={showMenu} />
			{/if}
		</div>
		<div class="divide" />
		<div class="tasks-wrapper">
			<div class="tasks">
				{#each sortedTasks as task}
					<TaskComponent
						{task}
						{taskActions}
						{columnTagTableStore}
						{showFilepath}
						{showTags}
					/>
				{/each}
				{#if isColumnTag(column, columnTagTableStore)}
					<button
						on:click={async (e) => {
							if (isColumnTag(column, columnTagTableStore)) {
								await taskActions.addNew(column, e);
							}
						}}
					>
						<span bind:this={buttonEl} />
						Add new
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style lang="scss">
	.column {
		display: flex;
		flex-direction: column;
		align-self: flex-start;
		width: 300px;
		flex-shrink: 0;
		padding: var(--size-4-3);
		border-radius: var(--radius-m);
		border: var(--border-width) solid var(--background-modifier-border);
		background-color: var(--background-secondary);

		&.drop-active {
			.tasks-wrapper {
				.tasks {
					opacity: 0.4;
				}
			}

			&.drop-hover {
				.tasks-wrapper {
					border-color: var(--color-base-70);
				}
			}
		}

		.header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			height: 24px;
			flex-shrink: 0;

			h2 {
				font-size: var(--font-ui-larger);
				font-weight: var(--font-bold);
				margin: 0;
			}
		}

		.divide {
			width: calc(100% + calc(2 * var(--size-4-3)));
			border-bottom: var(--border-width) solid
				var(--background-modifier-border);
			margin: var(--size-4-3) calc(-1 * var(--size-4-3));
		}

		.tasks-wrapper {
			height: 100%;
			min-height: 50px;
			border: var(--border-width) dashed transparent;
			border-radius: var(--radius-m);

			.tasks {
				display: flex;
				flex-direction: column;
				gap: var(--size-4-2);

				button {
					display: flex;
					align-items: center;
					cursor: pointer;

					span {
						height: 18px;
					}
				}
			}
		}
	}
</style>
