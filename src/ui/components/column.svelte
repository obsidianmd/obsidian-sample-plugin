<script lang="ts">
	import { Menu, setIcon, type App } from "obsidian";
	import {
		type ColumnTag,
		type DefaultColumns,
		type ColumnTagTable,
		type ColumnColourTable,
		isColumnTag,
	} from "../columns/columns";
	import type { TaskActions } from "../tasks/actions";
	import type { Task } from "../tasks/task";
	import TaskComponent from "./task.svelte";
	import IconButton from "./icon_button.svelte";
	import { isDraggingStore } from "../dnd/store";
	import type { Readable } from "svelte/store";
	import { selectionModeStore, toggleSelectionMode } from "../selection/selection_mode_store";
	import { taskSelectionStore, getSelectedTaskCount, clearTaskSelections } from "../selection/task_selection_store";

	export let app: App;
	export let column: ColumnTag | DefaultColumns;
	export let hideOnEmpty: boolean = false;
	export let tasks: Task[];
	export let taskActions: TaskActions;
	export let columnTagTableStore: Readable<ColumnTagTable>;
	export let columnColourTableStore: Readable<ColumnColourTable>;
	export let showFilepath: boolean;
	export let consolidateTags: boolean;

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
	$: columnColor = isColumnTag(column, columnTagTableStore) ? $columnColourTableStore[column] : undefined;
	$: isInSelectionMode = $selectionModeStore.get(column) || false;
	$: selectedCount = getSelectedTaskCount(tasks.map(t => t.id), $taskSelectionStore);

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

	function showBulkActionsMenu(e: MouseEvent) {
		const menu = new Menu();

		// Get selected task IDs from the current column
		const selectedTaskIds = tasks
			.filter(task => $taskSelectionStore.get(task.id))
			.map(task => task.id);

		if (selectedTaskIds.length === 0) {
			return;
		}

		const target = e.target as HTMLButtonElement | undefined;
		if (!target) {
			return;
		}

		const boundingRect = target.getBoundingClientRect();
		const y = boundingRect.top + boundingRect.height / 2;
		const x = boundingRect.left + boundingRect.width / 2;

		// Add "Move to [Column]" options
		for (const [tag, label] of Object.entries($columnTagTableStore)) {
			menu.addItem((i) => {
				i.setTitle(`Move to ${label}`).onClick(() => {
					// Move all selected tasks to this column
					selectedTaskIds.forEach(taskId => {
						taskActions.changeColumn(taskId, tag as ColumnTag);
					});
					// Clear selections after action (selection mode persists)
					clearTaskSelections();
				});
				// Disable if this is the current column
				if (isColumnTag(column, columnTagTableStore) && column === tag) {
					i.setDisabled(true);
				}
			});
		}

		// Add "Move to Done" option
		menu.addItem((i) => {
			i.setTitle(`Move to Done`).onClick(() => {
				// Mark all selected tasks as done
				selectedTaskIds.forEach(taskId => {
					taskActions.markDone(taskId);
				});
				// Clear selections after action (selection mode persists)
				clearTaskSelections();
			});
			// Disable if already in Done column
			if (column === "done") {
				i.setDisabled(true);
			}
		});

		menu.addSeparator();

		// Add "Archive task" option
		menu.addItem((i) => {
			i.setTitle(`Archive task`).onClick(() => {
				taskActions.archiveTasks(selectedTaskIds);
				// Clear selections after action (selection mode persists)
				clearTaskSelections();
			});
		});

		// Add "Delete task" option
		menu.addItem((i) => {
			i.setTitle(`Delete task`).onClick(() => {
				selectedTaskIds.forEach(taskId => {
					taskActions.deleteTask(taskId);
				});
				// Clear selections after action (selection mode persists)
				clearTaskSelections();
			});
		});

		menu.showAtPosition({ x, y });
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
		style:--column-color={columnColor}
		style={columnColor ? `background-color: ${columnColor};` : ''}
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
		<div class="mode-toggle-container">
			<div 
				class="segmented-control"
				class:has-color={!!columnColor}
				style:--toggle-bg-color={columnColor ? `color-mix(in srgb, ${columnColor} 25%, white)` : undefined}
				style:--toggle-active-color={columnColor || undefined}
				role="toolbar"
				aria-label="Task interaction mode"
			>
				<button
					class="segment"
					class:active={!isInSelectionMode}
					on:click={() => toggleSelectionMode(column)}
					on:keydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							if (isInSelectionMode) {
								toggleSelectionMode(column);
							}
						}
					}}
					aria-label="Mark as done mode"
					aria-pressed={!isInSelectionMode}
					tabindex="0"
				>
					Done
				</button>
				<button
					class="segment"
					class:active={isInSelectionMode}
					on:click={() => toggleSelectionMode(column)}
					on:keydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							if (!isInSelectionMode) {
								toggleSelectionMode(column);
							}
						}
					}}
					aria-label="Selection mode"
					aria-pressed={isInSelectionMode}
					tabindex="0"
				>
					Select
				</button>
			</div>
			<div class="selection-count" aria-live="polite">
				{#if isInSelectionMode && selectedCount > 0}
					{selectedCount} selected
				{:else}
					&nbsp;
				{/if}
			</div>
			<div class="bulk-actions-button" class:visible={isInSelectionMode && selectedCount > 0}>
				<IconButton 
					icon="lucide-more-vertical" 
					on:click={showBulkActionsMenu} 
					aria-label="Bulk actions"
				/>
			</div>
		</div>
		<div class="divide" />
		<div class="tasks-wrapper">
			<div class="tasks">
				{#each sortedTasks as task}
				<TaskComponent
				{app}
				{task}
				{taskActions}
				{columnTagTableStore}
				{showFilepath}
				{consolidateTags}
				displayColumn={column}
				{isInSelectionMode}
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
		width: var(--column-width, 300px);
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

		.mode-toggle-container {
			display: flex;
			align-items: center;
			margin-top: var(--size-4-3);
			margin-bottom: var(--size-4-2);
			gap: var(--size-4-2);

			.segmented-control {
				display: inline-flex;
				background: var(--background-primary);
				border: none;
				border-radius: var(--radius-s);
				padding: 2px;
				gap: 0;

				&.has-color {
					background: var(--toggle-bg-color);
				}

				.segment {
					padding: 2px var(--size-4-2);
					border: none;
					background: transparent;
					border-radius: calc(var(--radius-s) - 2px);
					cursor: pointer;
					font-size: var(--font-ui-smaller);
					color: var(--text-muted);
					transition: all 0.2s ease;
					box-shadow: none;
					position: relative;
					z-index: 1;
					white-space: nowrap;

					&.active {
						background: var(--background-secondary);
						border: none;
						color: var(--text-normal);
					}

					&:focus-visible {
						outline: 2px solid var(--background-modifier-border-focus);
						outline-offset: 2px;
					}
				}

				&.has-color .segment.active {
					background: var(--toggle-active-color);
					border: none;
					color: var(--text-normal);
				}
			}

			.selection-count {
				font-size: var(--font-ui-smaller);
				color: var(--text-muted);
				flex: 1;
			}

			.bulk-actions-button {
				opacity: 0;
				pointer-events: none;
				transition: opacity 0.2s ease;

				&.visible {
					opacity: 1;
					pointer-events: auto;
				}
			}
		}

		.divide {
			width: calc(100% + calc(2 * var(--size-4-3)));
			border-bottom: var(--border-width) solid
				var(--column-color, var(--background-modifier-border));
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
