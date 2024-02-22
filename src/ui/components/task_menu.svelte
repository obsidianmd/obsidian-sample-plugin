<script lang="ts">
	import { Menu } from "obsidian";
	import { columnTagTableStore, type ColumnTag } from "../columns/columns";
	import type { Task } from "../tasks/task";
	import type { TaskActions } from "../tasks/actions";
	import IconButton from "./icon_button.svelte";

	export let task: Task;
	export let taskActions: TaskActions;

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

		menu.addSeparator();

		menu.addItem((i) => {
			i.setTitle(`Allocate to Kate`).onClick(() =>
				taskActions.changeOwner(task.id, "kate"),
			);
			if (task.owner === "kate") {
				i.setDisabled(true);
			}
		});

		menu.addItem((i) => {
			i.setTitle(`Allocate to Chris`).onClick(() =>
				taskActions.changeOwner(task.id, "chris"),
			);
			if (task.owner === "chris") {
				i.setDisabled(true);
			}
		});

		menu.showAtMouseEvent(e);
	}
</script>

<IconButton icon="lucide-more-vertical" on:click={showMenu} />
