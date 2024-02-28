<script lang="ts">
	import { Menu } from "obsidian";
	import { columnTagTableStore, type ColumnTag } from "../columns/columns";
	import type { Task } from "../tasks/task";
	import type { TaskActions } from "../tasks/actions";
	import IconButton from "./icon_button.svelte";
	import { userStore } from "../users/users";

	export let task: Task;
	export let taskActions: TaskActions;

	function showMenu(e: MouseEvent) {
		const menu = new Menu();

		const target = e.target as HTMLButtonElement | undefined;
		if (!target) {
			return;
		}

		const boundingRect = target.getBoundingClientRect();
		const y = boundingRect.top + boundingRect.height / 2;
		const x = boundingRect.left + boundingRect.width / 2;

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

		menu.addItem((i) => {
			i.setTitle(`Move to Done`).onClick(() =>
				taskActions.markDone(task.id),
			);
			if (task.done) {
				i.setDisabled(true);
			}
		});

		menu.addSeparator();

		Object.entries($userStore).map(([id, label]) => {
			menu.addItem((i) => {
				i.setTitle(`Allocate to ${label}`).onClick(() =>
					taskActions.changeOwner(task.id, id),
				);
				if (task.owner === id) {
					i.setDisabled(true);
				}
			});
		});

		menu.addSeparator();

		menu.addItem((i) => {
			i.setTitle(`Archive task`).onClick(() =>
				taskActions.archiveTasks([task.id]),
			);
		});

		menu.addItem((i) => {
			i.setTitle(`Delete task`).onClick(() =>
				taskActions.deleteTask(task.id),
			);
		});

		menu.showAtPosition({ x, y });
	}
</script>

<IconButton icon="lucide-more-vertical" on:click={showMenu} />
