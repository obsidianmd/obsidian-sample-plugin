<script lang="ts">
	import { setIcon } from "obsidian";

	export let icon: string;

	let element: HTMLSpanElement;
	$: {
		if (element) {
			setIcon(element, icon);
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			element?.click();
		}
	}
</script>

<button 
	bind:this={element} 
	on:click 
	on:keydown={handleKeydown}
	tabindex="0"
	{...$$restProps}
></button>

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

		&:focus-visible {
			outline: 2px solid var(--background-modifier-border-focus);
			outline-offset: 2px;
		}
	}
</style>
