<script lang="ts">
	import { Menu, setIcon } from "obsidian";
	import { columnTagTableStore, type ColumnTag } from "../columns/columns";
	import type { Task } from "../tasks/task";
	import type { TaskActions } from "../tasks/actions";

	export let task: Task;
	export let taskActions: TaskActions;

	let element: HTMLSpanElement;
	$: {
		if (element) {
			setIcon(element, "lucide-more-vertical");
		}
	}

	function showMenu(e: MouseEvent) {
		const menu = new Menu();

		menu.addItem((i) => {
			i.setTitle(`Go to file`).onClick(() =>
				taskActions.viewFile(task.id),
			);
		});

		menu.addSeparator();

		for (const [tag, label] of Object.entries($columnTagTableStore)) {
			menu.addItem((i) => {
				i.setTitle(`Move to ${label}`).onClick(() =>
					taskActions.changeColumn(task.id, tag as ColumnTag),
				);
				if (task.column === tag) {
					i.setDisabled(true);
				}
			});
		}

		menu.addSeparator();

		menu.addItem((i) => {
			i.setTitle(`Move to done`).onClick(() =>
				taskActions.markDone(task.id),
			);
			if (task.done) {
				i.setDisabled(true);
			}
		});

		menu.showAtMouseEvent(e);
	}
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<span
	bind:this={element}
	role="button"
	tabindex="0"
	on:click={(e) => showMenu(e)}
></span>

<style lang="scss">
	span {
		width: 24px;
		height: 24px;
		display: flex;
		justify-content: center;
		align-items: center;
		border-radius: var(--radius-s);
		transition: background linear 100ms;
		cursor: pointer;

		&:hover {
			background: var(--background-modifier-hover);
		}
	}
</style>
