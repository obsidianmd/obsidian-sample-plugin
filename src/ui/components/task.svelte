<script lang="ts">
	import type { ColumnTag, ColumnTagTable, DefaultColumns } from "../columns/columns";
	import { isDraggingStore } from "../dnd/store";
	import type { TaskActions } from "../tasks/actions";
	import type { Task } from "../tasks/task";
	import TaskMenu from "./task_menu.svelte";
	import Icon from "./icon.svelte";
	import { Component, MarkdownRenderer, type App } from "obsidian";
	import type { Readable } from "svelte/store";
	import { onDestroy } from "svelte";
	import { taskSelectionStore, toggleTaskSelection, isTaskSelected } from "../selection/task_selection_store";

	export let app: App;
	export let task: Task;
	export let taskActions: TaskActions;
	export let columnTagTableStore: Readable<ColumnTagTable>;
	export let showFilepath: boolean;
	export let consolidateTags: boolean;
	export let displayColumn: ColumnTag | DefaultColumns;
	export let isInSelectionMode: boolean = false;

	function handleContentBlur() {
		isEditing = false;

		const content = textAreaEl?.value;
		if (!content) return;

		const updatedContent = content.replaceAll("\n", "<br />");

		taskActions.updateContent(task.id, updatedContent);
	}

	function handleKeypress(e: KeyboardEvent) {
		if ((e.key === "Enter" && !e.shiftKey) || e.key === "Escape") {
			textAreaEl?.blur();
		}
	}

	function handleOpenKeypress(e: KeyboardEvent) {
		if (e.key === "Enter" || e.key === " ") {
			handleFocus();
		}
	}

	let isDragging = false;
	let isEditing = false;

	function handleDragStart(e: DragEvent) {
		handleContentBlur();
		isDragging = true;
		isDraggingStore.set({ fromColumn: displayColumn });
		if (e.dataTransfer) {
			e.dataTransfer.setData("text/plain", task.id);
			e.dataTransfer.dropEffect = "move";
		}
	}

	function handleDragEnd() {
		isDragging = false;
		isDraggingStore.set(null);
	}

	let textAreaEl: HTMLTextAreaElement | undefined;
	let previewContainerEl: HTMLDivElement | undefined;
	let markdownComponent: Component | undefined;

	function handleFocus(e?: MouseEvent) {
		// Check if the click was on a link by traversing the event path
		const path = e?.composedPath() || [];
		for (const element of path) {
			if (element instanceof HTMLElement && element.tagName.toLowerCase() === "a") {
				return;
			}
		}

		isEditing = true;

		setTimeout(() => {
			textAreaEl?.focus();
		}, 100);
	}

	// Render markdown content using Obsidian's MarkdownRenderer
	async function renderMarkdown() {
		if (!previewContainerEl) return;

		// Unload previous component before re-rendering
		if (markdownComponent) {
			markdownComponent.unload();
		}

		// Clear the container
		previewContainerEl.empty();

		// Create new component for this task
		markdownComponent = new Component();

		// Render the markdown with task.path as sourcePath for proper link resolution
		// Convert <br /> tags back to newlines for proper markdown parsing
		const contentToRender = (task.content + (task.blockLink ? ` ^${task.blockLink}` : ""))
			.replaceAll("<br />", "\n");
		await MarkdownRenderer.render(
			app,
			contentToRender,
			previewContainerEl,
			task.path,
			markdownComponent
		);

		// Set up event handlers after rendering
		setupLinkHandlers();
		postProcessRenderedContent();
	}

	// Set up click and hover handlers for internal links
	function setupLinkHandlers() {
		if (!previewContainerEl) return;

		const internalLinks = previewContainerEl.querySelectorAll("a.internal-link");
		
		internalLinks.forEach((link) => {
			const anchorEl = link as HTMLAnchorElement;
			
			// Click handler
			anchorEl.addEventListener("click", (e) => {
				e.preventDefault();
				e.stopPropagation();
				const linkTarget = anchorEl.getAttribute("data-href");
				if (linkTarget && app) {
					app.workspace.openLinkText(
						linkTarget,
						task.path,
						true, // Open in new tab
					);
				}
			});

			// Hover handler for preview
			anchorEl.addEventListener("mouseover", (e) => {
				const linkTarget = anchorEl.getAttribute("data-href");
				if (linkTarget && app && previewContainerEl) {
					app.workspace.trigger("hover-link", {
						event: e,
						source: "kanban-view",
						hoverParent: previewContainerEl,
						targetEl: anchorEl,
						linktext: linkTarget,
						sourcePath: task.path,
					});
				}
			});
		});
	}

	// Post-process rendered content for safety and compatibility
	function postProcessRenderedContent() {
		if (!previewContainerEl) return;

		// External links: open in new tab with security attributes
		previewContainerEl.querySelectorAll('a:not(.internal-link)').forEach((a) => {
			const anchor = a as HTMLAnchorElement;
			anchor.target = '_blank';
			anchor.rel = 'noopener noreferrer';
			// Prevent link activation from triggering edit mode
			anchor.addEventListener('click', (e) => e.stopPropagation());
			anchor.addEventListener('keypress', (e) => e.stopPropagation());
		});

		// Disable checkboxes to prevent unintended file edits
		previewContainerEl.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
			const el = cb as HTMLInputElement;
			el.disabled = true;
		});

		// Remove heavy/interactive embeds that don't work well in small cards
		previewContainerEl.querySelectorAll('iframe, audio, video').forEach((el) => {
			el.remove();
		});
	}

	// Re-render when task content changes
	$: if (task && !isEditing && previewContainerEl) {
		renderMarkdown();
	}

	// Cleanup on destroy
	onDestroy(() => {
		if (markdownComponent) {
			markdownComponent.unload();
		}
	});

	$: {
		if (textAreaEl) {
			textAreaEl.style.height = `0px`;
			textAreaEl.style.height = `${textAreaEl.scrollHeight}px`;
		}
	}

	function onInput(e: Event & { currentTarget: HTMLTextAreaElement }) {
		e.currentTarget.style.height = `0px`;
		e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
	}

	$: shouldconsolidateTags = consolidateTags && task.tags.size > 0;
	$: isSelected = isTaskSelected(task.id, $taskSelectionStore);
</script>

<div
	class="task"
	class:is-dragging={isDragging}
	role="group"
	draggable={!isEditing}
	on:dragstart={handleDragStart}
	on:dragend={handleDragEnd}
>
	<!-- Task row -->
	<div class="task-row">
		<div class="task-row-left">
			{#if isInSelectionMode}
				<!-- Selection checkbox (square) -->
				<button
					class="icon-button bulk-select"
					class:is-selected={isSelected}
					aria-label="Select for bulk actions"
					aria-pressed={isSelected}
					title="Select for bulk actions"
					on:click={() => toggleTaskSelection(task.id)}
					on:keydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							toggleTaskSelection(task.id);
						}
					}}
					tabindex="0"
				>
					<span class="default-icon">
						<Icon name={isSelected ? "lucide-check-square" : "lucide-square"} size={18} opacity={isSelected ? 1 : 0.5} />
					</span>
					<span class="hover-icon">
						<Icon name="lucide-check-square" size={18} opacity={1} />
					</span>
				</button>
			{:else}
				<!-- Mark done checkbox (circle) -->
				<button
					class="icon-button mark-done"
					class:is-done={task.done}
					aria-label={task.done ? "Mark as incomplete" : "Move to Done"}
					aria-pressed={task.done}
					title={task.done ? "Mark as incomplete" : "Move to Done"}
					on:click={() => taskActions.toggleDone(task.id)}
					on:keydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							taskActions.toggleDone(task.id);
						}
					}}
					tabindex="0"
				>
					<span class="default-icon">
						<Icon name={task.done ? "lucide-circle-check" : "lucide-circle"} size={18} opacity={0.5} />
					</span>
					<span class="hover-icon">
						<Icon name="lucide-circle-check" size={18} opacity={1} />
					</span>
				</button>
			{/if}
		</div>
		<div class="task-row-content">
			{#if isEditing}
				<textarea
					class:editing={isEditing}
					bind:this={textAreaEl}
					on:keypress={handleKeypress}
					on:blur={handleContentBlur}
					on:input={onInput}
					value={task.content.replaceAll("<br />", "\n")}
				/>
			{:else}
				<div
					role="button"
					class="content-preview markdown-rendered"
					bind:this={previewContainerEl}
					on:mouseup={handleFocus}
					on:keypress={handleOpenKeypress}
					tabindex="0"
				/>
			{/if}
		</div>
		<div class="task-row-right">
			<TaskMenu {task} {taskActions} {columnTagTableStore} />
		</div>
	</div>

	{#if showFilepath}
		<div class="task-footer">
			<button
				class="go-to-file-button"
				aria-label="Go to file"
				title="Go to file"
				on:click={() => taskActions.viewFile(task.id)}
				on:keydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						taskActions.viewFile(task.id);
					}
				}}
				tabindex="0"
			>
				<Icon name="lucide-arrow-up-right" size={18} opacity={0.5} />
				<span class="file-path">{task.path}</span>
			</button>
		</div>
	{/if}
	{#if shouldconsolidateTags}
		<div class="task-tags">
			{#each task.tags as tag}
				<span>
					<!-- prettier-ignore -->
					<span class="cm-formatting cm-formatting-hashtag cm-hashtag cm-hashtag-begin cm-list-1">#</span><span
						class="cm-hashtag cm-hashtag-end cm-list-1">{tag}</span
					>
				</span>
			{/each}
		</div>
	{/if}
</div>

<style lang="scss">
	.task {
		background-color: var(--background-secondary-alt);
		border-radius: var(--radius-m);
		border: var(--border-width) solid var(--background-modifier-border);
		cursor: grab;

		&.is-dragging {
			opacity: 0.15;
		}

		// Task row
		.task-row {
			padding: var(--size-4-2);
			display: flex;
			gap: var(--size-4-1);
			align-items: center;

			.task-row-left {
				display: flex;
				align-items: center;
				flex-shrink: 0;
			}

			.task-row-content {
				flex: 1;
				min-width: 0; // Allow text to wrap properly

				textarea {
					cursor: text;
					background-color: var(--color-base-25);
					width: 100%;
				}

				.content-preview {
					&:focus-within {
						box-shadow: 0 0 0 3px
							var(--background-modifier-border-focus);
					}
				}
			}

			.task-row-right {
				display: flex;
				align-items: center;
				flex-shrink: 0;
			}
		}

		// Icon button styling
		.icon-button {
			display: flex;
			justify-content: center;
			align-items: center;
			width: 24px;
			height: 24px;
			padding: 0;
			border: none;
			background: transparent;
			cursor: pointer;
			border-radius: var(--radius-s);
			transition: opacity 0.2s ease;
			position: relative;
			box-shadow: none;

			&:hover,
			&:active {
				background: transparent;
				box-shadow: none;
			}

			&:focus-visible {
				outline: 2px solid var(--background-modifier-border-focus);
				outline-offset: 2px;
			}

			.default-icon,
			.hover-icon {
				position: absolute;
				display: flex;
				align-items: center;
				justify-content: center;
				transition: opacity 0.2s ease;
			}

			// Hide hover icon by default
			.hover-icon {
				opacity: 0;
			}

			&.mark-done {
				// Show hover checkmark on hover
				&:hover {
					.hover-icon {
						opacity: 1;

						:global(svg) {
							color: var(--interactive-accent);
						}
					}

					// Hide default icon on hover
					.default-icon {
						opacity: 0;
					}
				}

				// If already done, show checkmark with default icon color
				&.is-done {
					.default-icon :global(svg) {
						opacity: 1;
						color: var(--icon-color);
					}
				}
			}

			&.bulk-select {
				.default-icon,
				.hover-icon {
					position: absolute;
					display: flex;
					align-items: center;
					justify-content: center;
					transition: opacity 0.2s ease;
				}

				.hover-icon {
					opacity: 0;
				}

				&:hover {
					.hover-icon {
						opacity: 1;
						
						:global(svg) {
							color: var(--interactive-accent);
						}
					}

					.default-icon {
						opacity: 0;
					}
				}

				// If selected, show checkmark with default icon color
				&.is-selected {
					.default-icon :global(svg) {
						opacity: 1;
						color: var(--icon-color);
					}
				}
			}
		}

		.task-footer {
			border-top: var(--border-width) solid
				var(--background-modifier-border);
			padding: var(--size-4-2);
			padding-top: var(--size-4-1);

			.go-to-file-button {
				display: flex;
				align-items: center;
				justify-content: flex-start;
				gap: var(--size-2-1);
				width: 100%;
				padding: 0;
				border: none;
				background: transparent;
				cursor: pointer;
				text-align: left;
				box-shadow: none;
				transition: opacity 0.2s ease;
				border-radius: var(--radius-s);

				&:hover {
					background: transparent;
					box-shadow: none;

					:global(svg) {
						opacity: 1 !important;
						color: var(--interactive-accent);
					}

					.file-path {
						color: var(--interactive-accent);
					}
				}

				&:focus-visible {
					outline: 2px solid var(--background-modifier-border-focus);
					outline-offset: 2px;
				}

				.file-path {
					margin: 0;
					font-size: var(--font-ui-smaller);
					color: var(--text-muted);
					transition: color 0.2s ease;
					overflow-wrap: anywhere;
					white-space: normal;
					flex: 1;
					min-width: 0;
					line-height: 1.3;
				}
			}
		}

		.task-tags {
			display: flex;
			flex-wrap: wrap;
			gap: var(--size-4-1) var(--size-2-1);
			padding: var(--size-4-2) var(--size-2-2);
			padding-top: 0;
		}
	}

	:global(.task-row-content *) {
		word-break: break-word;
		margin: 0;
	}

	:global(.task-row-content img) {
		max-width: 100%;
		max-height: 160px;
		object-fit: contain;
	}

	:global(.task-row-content code) {
		white-space: pre-wrap;
	}

	:global(.task-row-content input[type="checkbox"]) {
		pointer-events: none;
	}
</style>
