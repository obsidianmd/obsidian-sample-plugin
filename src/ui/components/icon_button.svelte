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
<span bind:this={element} role="button" tabindex="0" on:click></span>

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
