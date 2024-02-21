<script lang="ts">
	import { isDraggingStore } from "../dnd/store";
	import type { TaskActions } from "../tasks/actions";
	import type { Task } from "../tasks/task";
	import TaskMenu from "./task_menu.svelte";

	export let task: Task;
	export let taskActions: TaskActions;

	function handleContentBlur(
		e: FocusEvent & { currentTarget: HTMLParagraphElement },
	) {
		isEditing = false;

		const content = e.currentTarget.textContent;
		if (!content) return;

		taskActions.updateContent(task.id, content);
	}

	function handleKeypress(
		e: KeyboardEvent & { currentTarget: HTMLParagraphElement },
	) {
		if (e.key === "Enter") {
			e.currentTarget.blur();
		}
	}

	let isDragging = false;
	let isEditing = false;

	function handleDragStart(e: DragEvent) {
		isEditing = false;
		isDragging = true;
		isDraggingStore.set(true);
		if (e.dataTransfer) {
			e.dataTransfer.setData("text/plain", task.id);
			e.dataTransfer.dropEffect = "move";
		}
	}

	function handleDragEnd() {
		isDragging = false;
		isDraggingStore.set(false);
	}

	function handleDblClick(e: MouseEvent) {
		const target = e.target as HTMLParagraphElement | null;
		if (!target) {
			return;
		}

		isEditing = true;
		target.focus();

		function onClickOutside(clickEvent: MouseEvent) {
			if (!target.contains(clickEvent.targetNode)) {
				isEditing = false;
				window.removeEventListener("click", onClickOutside);
			}
		}

		window.addEventListener("click", onClickOutside);
	}

	$: editableContentProps = isEditing ? { contenteditable: true } : {};
</script>

<div
	class="task"
	class:is-dragging={isDragging}
	role="group"
	draggable={true}
	on:dragstart={handleDragStart}
	on:dragend={handleDragEnd}
>
	<div class="task-body">
		<div class="task-content">
			<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
			<p
				{...editableContentProps}
				class:editing={isEditing}
				on:dblclick={handleDblClick}
				on:blur={handleContentBlur}
				on:keypress={handleKeypress}
			>
				{task.content}
			</p>
		</div>
		<TaskMenu {task} {taskActions} />
	</div>
	<div class="task-footer">
		<p>{task.path}</p>
	</div>
</div>

<style lang="scss">
	.task {
		background-color: var(--background-secondary-alt);
		border-radius: var(--radius-m);
		border: var(--border-width) solid var(--background-modifier-border);
		cursor: grab;

		&.is-dragging {
			opacity: 0.25;
		}

		.task-body {
			padding: var(--size-4-2);
			display: grid;
			grid-template-columns: 1fr auto;

			p {
				word-break: break-word;
				margin: 0;

				&.editing {
					cursor: text;
					background-color: var(--color-base-25);
				}
			}
		}

		.task-footer {
			border-top: var(--border-width) solid
				var(--background-modifier-border);

			padding: var(--size-4-2);

			p {
				margin: 0;
				font-size: var(--font-ui-smaller);
			}
		}
	}
</style>
