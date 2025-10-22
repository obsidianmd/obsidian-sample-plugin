<script lang="ts">
	export let filterText: string;
	export let onConfirm: () => void;
	export let onCancel: () => void;
</script>

<div class="modal-backdrop" on:click={onCancel} role="presentation">
	<div class="modal" on:click|stopPropagation role="dialog" aria-modal="true" aria-labelledby="modal-title">
		<h3 id="modal-title">Delete saved filter?</h3>
		<div class="filter-preview">{filterText}</div>
		<div class="modal-actions">
			<button class="cancel-btn" on:click={onCancel}>Cancel</button>
			<button class="delete-btn" on:click={onConfirm}>Delete</button>
		</div>
	</div>
</div>

<style lang="scss">
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.modal {
		background: var(--background-primary);
		border: 1px solid var(--background-modifier-border);
		border-radius: var(--radius-m);
		padding: var(--size-4-4);
		min-width: 300px;
		max-width: 500px;
		box-shadow: var(--shadow-l);
		pointer-events: auto;
	}

	h3 {
		margin: 0 0 var(--size-4-3) 0;
		font-size: var(--font-ui-medium);
		font-weight: var(--font-semibold);
	}

	.filter-preview {
		padding: var(--size-4-2);
		background: var(--background-secondary);
		border-radius: var(--radius-s);
		margin-bottom: var(--size-4-4);
		font-family: var(--font-monospace);
		font-size: var(--font-ui-small);
	}

	.modal-actions {
		display: flex;
		gap: var(--size-4-2);
		justify-content: flex-end;
	}

	button {
		padding: var(--size-4-1) var(--size-4-3);
		border-radius: var(--radius-s);
		cursor: pointer;
		font-size: var(--font-ui-small);
		transition: background 100ms linear;
	}

	.cancel-btn {
		background: var(--background-secondary);
		border: 1px solid var(--background-modifier-border);
		color: var(--text-normal);
	}

	.cancel-btn:hover {
		background: var(--background-secondary-alt);
	}

	.delete-btn {
		background: var(--color-red);
		border: none;
		color: white;
	}

	.delete-btn:hover {
		background: var(--color-red);
		opacity: 0.8;
	}
</style>
