<script lang="ts">
	import { setIcon } from "obsidian";

	export let icon: string;

	let element: HTMLSpanElement;
	$: {
		if (element) {
			setIcon(element, icon);
		}
	}
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<button bind:this={element} on:click></button>

<style lang="scss">
	button {
		width: 24px;
		height: 24px;
		display: flex;
		justify-content: center;
		align-items: center;
		border-radius: var(--radius-s);
		transition: background linear 100ms;
		cursor: pointer;
		background: unset;
		padding: 0;
	}
</style>
