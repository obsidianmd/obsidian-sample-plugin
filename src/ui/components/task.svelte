<script lang="ts">
	import type { TaskActions } from "../tasks/actions";
	import type { Task } from "../tasks/task";
	import TaskMenu from "./task_menu.svelte";

	export let task: Task;
	export let taskActions: TaskActions;
</script>

<div class="task">
	<div class="task-content">
		<p>{task.content}</p>
	</div>
	<TaskMenu {task} {taskActions} />
</div>

<style lang="scss">
	.task {
		background-color: var(--background-secondary-alt);
		border-radius: var(--radius-m);
		border: var(--border-width) solid var(--background-modifier-border);
		padding: var(--size-4-2);
		display: grid;
		grid-template-columns: 1fr auto;

		p {
			margin-top: 0;

			&:last-child {
				margin-bottom: 0;
			}
		}
	}
</style>
