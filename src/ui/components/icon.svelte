<script lang="ts">
	import { setIcon } from "obsidian";
	import { onMount } from "svelte";

	export let name: string;
	export let size: number = 16; // Default icon size in pixels
	export let opacity: number = 1;
	export let ariaLabel: string | undefined = undefined;

	let element: HTMLSpanElement;

	onMount(() => {
		if (element) {
			setIcon(element, name);
		}
	});

	$: {
		if (element && name) {
			setIcon(element, name);
		}
	}
</script>

<span
	bind:this={element}
	class="icon"
	style:width="{size}px"
	style:height="{size}px"
	style:opacity={opacity}
	aria-label={ariaLabel}
	role={ariaLabel ? "img" : undefined}
/>

<style lang="scss">
	.icon {
		display: inline-flex;
		justify-content: center;
		align-items: center;
		flex-shrink: 0;

		:global(svg) {
			width: 100%;
			height: 100%;
		}
	}
</style>
