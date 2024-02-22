<script lang="ts">
	import { isDraggingStore } from "../dnd/store";
	import type { TaskActions } from "../tasks/actions";
	import type { Task } from "../tasks/task";
	import TaskMenu from "./task_menu.svelte";
	import { Converter } from "showdown";

	export let task: Task;
	export let taskActions: TaskActions;

	const mdConverted = new Converter({
		simplifiedAutoLink: true,
		openLinksInNewWindow: true,
		emoji: true,
	});

	function handleContentBlur(
		e: FocusEvent & { currentTarget: HTMLTextAreaElement },
	) {
		isEditing = false;

		const content = e.currentTarget.value;
		if (!content) return;

		taskActions.updateContent(task.id, content);
	}

	function handleKeypress(
		e: KeyboardEvent & { currentTarget: HTMLTextAreaElement },
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

	let textAreaEl: HTMLTextAreaElement | undefined;

	function handleDblClick(e: MouseEvent) {
		isEditing = true;

		setTimeout(() => {
			textAreaEl?.focus();
		}, 100);
	}

	$: mdContent = mdConverted.makeHtml(task.content);

	$: {
		if (textAreaEl) {
			textAreaEl.style.height = `0px`;
			textAreaEl.style.height = `${textAreaEl.scrollHeight}px`;
		}
	}

	function onInput(e: Event & { currentTarget: HTMLTextAreaElement }) {
		e.currentTarget.style.height = `0px`;
		e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
	}
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
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<div class="task-content" on:dblclick={handleDblClick}>
			{#if isEditing}
				<textarea
					class:editing={isEditing}
					bind:this={textAreaEl}
					on:blur={handleContentBlur}
					on:keypress={handleKeypress}
					on:input={onInput}
					value={task.content}
				/>
			{:else}
				{@html mdContent}
			{/if}
		</div>
		<TaskMenu {task} {taskActions} />
	</div>
	<div class="task-footer">
		<p>{task.path}</p>
		{#if task.owner}
			<p>#{task.owner}</p>
		{/if}
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
			}

			textarea {
				cursor: text;
				background-color: var(--color-base-25);
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

	:global(.task-content *) {
		margin: 0;
	}
</style>
