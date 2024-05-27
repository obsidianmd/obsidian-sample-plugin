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
	import { userStore } from "./users/users";
	import { kebab } from "src/kebab";
	import SelectUser from "./components/select/select_user.svelte";
	import SelectTag from "./components/select/select_tag.svelte";
	import IconButton from "./components/icon_button.svelte";
	import type { SettingValues } from "./settings/settings";

	export let vault: Vault;
	export let workspace: Workspace;
	export let registerEvent: (eventRef: EventRef) => void;
	export let columnConfig: ColumnConfig = {
		columns: [
			"Later",
			"Soonish",
			"Next week",
			"This week",
			"Today",
			"Pending",
		],
	};
	export let userConfig: string[];
	export let openSettings: () => Promise<SettingValues>;

	let selectableUsersList: { value: string; label: string }[] | undefined;
	$: selectableUsersList = userConfig.length
		? ["Unassigned", ...userConfig].map((label) => ({
				value: kebab(label),
				label,
			}))
		: undefined;

	let selectedUsers: string[] = userConfig.length
		? ["Unassigned", ...userConfig].map((label) => kebab(label))
		: [];
	$: selectedUsersSet = new Set(selectedUsers);

	$: userStore.set(
		userConfig.reduce<Record<string, string>>((acc, curr) => {
			acc[kebab(curr)] = curr;
			return acc;
		}, {}),
	);
	$: columnTagTableStore.set(createColumnTagTable(columnConfig));

	$: tags = $tasksStore.reduce((acc, curr) => {
		for (const tag of curr.tags) {
			acc.add(tag);
		}
		return acc;
	}, new Set<string>());

	let selectedTags: string[] = [];
	$: selectedTagsSet = new Set(selectedTags);

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
			if (task.done || task.column === "done") {
				output["done"] = output["done"].concat(task);
			} else if (task.column === "archived") {
				// ignored
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

	$: filteredByUser = selectedUsersSet.size
		? $tasksStore.filter((task) => {
				if (!task.owner) {
					return selectedUsersSet.has("unassigned");
				}

				return selectedUsersSet.has(task.owner);
			})
		: $tasksStore;

	$: filteredByTag = selectedTagsSet.size
		? filteredByUser.filter((task) => {
				for (const tag of task.tags) {
					if (selectedTagsSet.has(tag)) {
						return true;
					}
				}

				return false;
			})
		: filteredByUser;

	$: tasksByColumn = groupByColumnTag(filteredByTag);

	async function handleOpenSettings() {
		const newSettings = await openSettings();
	}
</script>

<div class="main">
	<div class="settings">
		<IconButton icon="lucide-settings" on:click={handleOpenSettings} />
	</div>
	<div class="controls">
		{#if userConfig.length}
			<SelectUser {userConfig} bind:value={selectedUsers} />
		{/if}
		<SelectTag tags={[...tags]} bind:value={selectedTags} />
	</div>

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
</div>

<style lang="scss">
	.main {
		height: 100%;
		display: flex;
		flex-direction: column;

		.settings {
			display: flex;
			justify-content: flex-end;
		}

		.controls {
			margin-bottom: var(--size-4-4);
			display: grid;
			gap: var(--size-4-8);
			grid-template-columns: 1fr 1fr;
		}

		.columns {
			height: 100%;
			flex-grow: 1;
			max-width: 100vw;
			overflow-x: scroll;
			padding-bottom: var(--size-4-3);

			> div {
				display: flex;
				gap: var(--size-4-3);
			}
		}
	}
</style>
