<script lang="ts">
	import { kebab } from "src/kebab";
	import BaseSelect from "./base_select.svelte";

	export let userConfig: string[];
	export let value: string[];

	let selectableUsersList: { value: string; label: string }[] | undefined;
	$: selectableUsersList = userConfig.length
		? ["Unassigned", ...userConfig].map((label) => ({
				value: kebab(label),
				label,
			}))
		: undefined;
</script>

{#if selectableUsersList}
	<BaseSelect label="Filter by user" items={selectableUsersList} bind:value />
{/if}
