import {
	App,
	Plugin,
	PluginSettingTab,
	Setting,
	MarkdownPostProcessorContext,
	TFile,
	EditorSuggest,
	Editor,
	EditorPosition,
	EditorSuggestTriggerInfo,
	EditorSuggestContext,
	Notice,
	MarkdownView,
	ItemView,
	WorkspaceLeaf,
} from "obsidian";

import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";

// Constants
const DEBOUNCE_DELAY_MS = 100;
const EQUATION_SIDEBAR_VIEW_TYPE = "equation-sidebar-view";

/**
 * Sidebar view for displaying and navigating to equations in the active file
 */
class EquationSidebarView extends ItemView {
	plugin: MathReferencerPlugin;
	private listContainerEl: HTMLElement;

	constructor(leaf: WorkspaceLeaf, plugin: MathReferencerPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return EQUATION_SIDEBAR_VIEW_TYPE;
	}

	getDisplayText(): string {
		return "Equations";
	}

	getIcon(): string {
		return "sigma";
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		container.addClass("equation-sidebar");

		// Create header
		const header = container.createDiv({ cls: "equation-sidebar-header" });
		header.createEl("h4", { text: "Equations" });

		// Create content container for equation list
		this.listContainerEl = container.createDiv({ cls: "equation-sidebar-content" });

		// Register for active file changes
		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
				this.updateEquationList();
			})
		);

		// Register for file modifications to update the list
		this.registerEvent(
			this.app.metadataCache.on("changed", (file) => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile && file.path === activeFile.path) {
					this.updateEquationList();
				}
			})
		);

		// Initial update
		this.updateEquationList();
	}

	async onClose() {
		// Cleanup if needed
	}

	/**
	 * Update the equation list based on the active file
	 */
	async updateEquationList() {
		this.listContainerEl.empty();

		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			this.listContainerEl.createDiv({
				cls: "equation-sidebar-empty",
				text: "No file open",
			});
			return;
		}

		// Get equations from the plugin's cache
		let equations = this.plugin.getEquationsForFile(activeFile.path);

		// If not in cache, try to load them
		if (!equations) {
			try {
				const content = await this.app.vault.read(activeFile);
				equations = this.plugin.extractEquationsFromText(
					content,
					activeFile.path
				);
			} catch (e) {
				this.listContainerEl.createDiv({
					cls: "equation-sidebar-empty",
					text: "Error loading equations",
				});
				return;
			}
		}

		if (equations.length === 0) {
			this.listContainerEl.createDiv({
				cls: "equation-sidebar-empty",
				text: "No equations in this file",
			});
			return;
		}

		// Create list of equations
		const list = this.listContainerEl.createEl("ul", { cls: "equation-sidebar-list" });

		for (const equation of equations) {
			const item = list.createEl("li", { cls: "equation-sidebar-item" });

			// Create clickable element
			const link = item.createDiv({ cls: "equation-sidebar-link" });

			// Display name: use custom block ID if present, otherwise "Eq. x"
			const displayName = equation.blockId
				? `^${equation.blockId}`
				: `Eq. ${equation.equationNumber}`;

			// Create the main label
			const label = link.createSpan({ cls: "equation-sidebar-label" });
			label.textContent = displayName;

			// Add equation preview (truncated)
			const preview = link.createDiv({ cls: "equation-sidebar-preview" });
			const previewText =
				equation.content.length > 40
					? equation.content.substring(0, 40) + "..."
					: equation.content;
			preview.textContent = previewText;

			// Click handler to navigate to equation
			link.addEventListener("click", () => {
				this.navigateToEquation(equation);
			});
		}
	}

	/**
	 * Navigate to the equation's location in the editor
	 */
	private async navigateToEquation(equation: EquationInfo) {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) return;

		// Get the active markdown view
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) {
			// Try to open the file if not already open
			const leaf = this.app.workspace.getLeaf();
			await leaf.openFile(activeFile);
			const newView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (newView) {
				this.scrollToLine(newView, equation.lineNumber);
			}
			return;
		}

		this.scrollToLine(view, equation.lineNumber);
	}

	/**
	 * Scroll the editor to a specific line
	 */
	private scrollToLine(view: MarkdownView, lineNumber: number) {
		const editor = view.editor;

		// Set cursor to the start of the equation
		editor.setCursor({ line: lineNumber, ch: 0 });

		// Scroll to make the line visible and centered
		editor.scrollIntoView(
			{ from: { line: lineNumber, ch: 0 }, to: { line: lineNumber, ch: 0 } },
			true
		);

		// Focus the editor
		editor.focus();
	}
}

interface MathReferencerSettings {
	enableAutoNumbering: boolean;
	startNumberingFrom: number;
	numberingFormat: string; // e.g., "(${num})" or "[${num}]"
	showFileNameInEmbeds: boolean;
	linkRenderFormat: string; // e.g., "Equation ${num}", "${file} Equation ${num}"
	blockIdPrefix: string; // Prefix for block IDs (e.g., "eq")
	refTrigger: string; // Trigger for equation references (e.g., "\\ref")
	autoGenerateOnSave: boolean; // Auto-generate block IDs when saving a file
}

const DEFAULT_SETTINGS: MathReferencerSettings = {
	enableAutoNumbering: true,
	startNumberingFrom: 1,
	numberingFormat: "(${num})",
	showFileNameInEmbeds: true,
	linkRenderFormat: "Equation ${num}",
	blockIdPrefix: "eq",
	refTrigger: "\\ref",
	autoGenerateOnSave: false,
};

interface EquationInfo {
	filePath: string;
	blockId: string | null;
	equationNumber: number;
	content: string;
	lineNumber: number;
	endLine: number;
}

interface FileCache {
	equations: EquationInfo[];
	contentHash: string;
	mtime: number;
}

/**
 * EditorSuggest for equation references
 */
class EquationReferenceSuggest extends EditorSuggest<EquationInfo> {
	plugin: MathReferencerPlugin;

	constructor(plugin: MathReferencerPlugin) {
		super(plugin.app);
		this.plugin = plugin;
	}

	onTrigger(
		cursor: EditorPosition,
		editor: Editor,
		file: TFile | null,
	): EditorSuggestTriggerInfo | null {
		if (!file) {
			return null;
		}

		const line = editor.getLine(cursor.line);
		const textBeforeCursor = line.substring(0, cursor.ch);

		// Check if we just typed the trigger
		const trigger = this.plugin.settings.refTrigger;
		const triggerIndex = textBeforeCursor.lastIndexOf(trigger);

		if (triggerIndex === -1) {
			return null;
		}

		// Get the text after the trigger
		const query = textBeforeCursor.substring(triggerIndex + trigger.length);

		// Make sure we're not in the middle of another word
		if (triggerIndex > 0) {
			const charBefore = textBeforeCursor[triggerIndex - 1];
			if (/[a-zA-Z0-9]/.test(charBefore)) {
				return null;
			}
		}

		return {
			start: { line: cursor.line, ch: triggerIndex },
			end: cursor,
			query: query,
		};
	}

	getSuggestions(
		context: EditorSuggestContext,
	): EquationInfo[] | Promise<EquationInfo[]> {
		const file = this.app.workspace.getActiveFile();
		if (!file) {
			return [];
		}

		// Get equations from cache using public method
		const equations = this.plugin.getEquationsForFile(file.path);
		if (!equations) {
			return [];
		}

		const query = context.query.toLowerCase();

		// Filter equations based on query
		if (!query) {
			return equations;
		}

		return equations.filter((eq) => {
			const eqNum = eq.equationNumber.toString();
			const blockId = eq.blockId || "";
			const content = eq.content.toLowerCase();

			return (
				eqNum.includes(query) ||
				blockId.toLowerCase().includes(query) ||
				content.includes(query)
			);
		});
	}

	renderSuggestion(equation: EquationInfo, el: HTMLElement): void {
		const container = el.createDiv({ cls: "equation-suggestion" });

		// Add equation number
		const numberSpan = container.createSpan({
			cls: "equation-suggestion-number",
		});
		numberSpan.textContent = `Equation ${equation.equationNumber}`;

		// Add block ID if available
		if (equation.blockId) {
			const blockIdSpan = container.createSpan({
				cls: "equation-suggestion-blockid",
			});
			blockIdSpan.textContent = ` ^${equation.blockId}`;
		}

		// Add a preview of the equation content
		const contentDiv = container.createDiv({
			cls: "equation-suggestion-content",
		});
		// Truncate long equations
		const preview =
			equation.content.length > 50
				? equation.content.substring(0, 50) + "..."
				: equation.content;
		contentDiv.textContent = preview;
	}

	selectSuggestion(
		equation: EquationInfo,
		evt: MouseEvent | KeyboardEvent,
	): void {
		const file = this.app.workspace.getActiveFile();
		if (!file || !this.context) {
			return;
		}

		const editor = this.context.editor;
		let blockId = equation.blockId;
		let insertedBlockId = false;
		let blockIdInsertLine = -1;

		// If equation doesn't have a block ID, generate one and insert it
		if (!blockId) {
			blockId = this.plugin.generateBlockIdForEquation(equation);

			// Find the closing $$ line and insert block ID after it
			const content = editor.getValue();
			const lines = content.split("\n");

			// Find the closing $$ for this equation
			for (let i = equation.lineNumber + 1; i < lines.length; i++) {
				if (lines[i].trim() === "$$") {
					blockIdInsertLine = i;
					break;
				}
			}

			if (blockIdInsertLine !== -1) {
				// Insert block ID on the line after closing $$
				const insertPos = {
					line: blockIdInsertLine,
					ch: lines[blockIdInsertLine].length,
				};
				editor.replaceRange(`\n^${blockId}`, insertPos);
				insertedBlockId = true;

				// Update the equation info in cache and block ID map
				equation.blockId = blockId;
				this.plugin.registerBlockId(file.path, blockId, equation);
			}
		}

		// Generate the link text
		const linkText = `[[${file.basename}#^${blockId}|Equation ${equation.equationNumber}]]`;

		// Calculate positions, adjusting if we inserted a block ID before the trigger
		let startPos = this.context.start;
		let endPos = this.context.end;

		if (insertedBlockId && blockIdInsertLine < this.context.start.line) {
			// Block ID insertion added a line before our trigger, adjust positions
			startPos = {
				line: this.context.start.line + 1,
				ch: this.context.start.ch,
			};
			endPos = {
				line: this.context.end.line + 1,
				ch: this.context.end.ch,
			};
		}

		// Replace the trigger text with the link
		editor.replaceRange(linkText, startPos, endPos);

		// Move cursor after the inserted link
		const newCursorPos = {
			line: startPos.line,
			ch: startPos.ch + linkText.length,
		};
		editor.setCursor(newCursorPos);
	}
}

/**
 * Creates a view plugin for Live Preview equation numbering
 */
function createEquationNumberPlugin(plugin: MathReferencerPlugin) {
	return ViewPlugin.fromClass(
		class {
			debounceTimer: ReturnType<typeof setTimeout> | null = null;
			latestView: EditorView;

			constructor(view: EditorView) {
				this.latestView = view;
				// Initial processing after a delay
				this.scheduleNumbering();
			}

			destroy() {
				if (this.debounceTimer !== null) {
					clearTimeout(this.debounceTimer);
					this.debounceTimer = null;
				}
			}

			scheduleNumbering() {
				if (this.debounceTimer !== null) {
					clearTimeout(this.debounceTimer);
				}
				this.debounceTimer = setTimeout(() => {
					this.numberRenderedEquations(this.latestView);
				}, DEBOUNCE_DELAY_MS);
			}

			numberRenderedEquations(view: EditorView) {
				if (!plugin.settings.enableAutoNumbering) {
					return;
				}

				const file = plugin.app.workspace.getActiveFile();
				if (!file) {
					return;
				}

				const text = view.state.doc.toString();
				const equations = plugin.extractEquationsFromText(
					text,
					file.path,
				);

				// IMPORTANT: Remove ALL existing equation numbers first
				// This fixes the bug where equations >10 show wrong numbers
				// when the observer fires multiple times
				view.dom
					.querySelectorAll(".equation-number-live-preview")
					.forEach((el) => el.remove());

				// Find rendered math blocks (MathJax output in embed blocks)
				const mathBlocks = view.dom.querySelectorAll(
					'.cm-embed-block mjx-container[display="true"]',
				);

				mathBlocks.forEach((mathEl) => {
					const embedBlock = mathEl.closest(".cm-embed-block");
					if (!embedBlock) return;

					// Use posAtDOM to get actual document position
					let pos: number;
					try {
						pos = view.posAtDOM(embedBlock);
					} catch (e) {
						// Can happen if DOM element is not in the editor's DOM tree
						console.debug(
							"Math Referencer: Could not get position for embed block",
							e,
						);
						return;
					}

					// Get line number from document position
					const line = view.state.doc.lineAt(pos);
					const lineNumber = line.number - 1; // Convert to 0-indexed

					// Find the equation that contains this line
					const matchingEquation = equations.find((eq) => {
						return (
							lineNumber >= eq.lineNumber &&
							lineNumber <= eq.endLine
						);
					});

					if (!matchingEquation) return;

					const numberSpan = document.createElement("span");
					numberSpan.className =
						"equation-number equation-number-live-preview";
					numberSpan.textContent =
						plugin.formatEquationNumber(matchingEquation);

					embedBlock.classList.add("has-equation-number");
					embedBlock.appendChild(numberSpan);
				});
			}

			update(update: ViewUpdate) {
				// Always update the latest view reference
				this.latestView = update.view;
				if (update.docChanged || update.viewportChanged) {
					this.scheduleNumbering();
				}
			}
		},
	);
}

export default class MathReferencerPlugin extends Plugin {
	settings: MathReferencerSettings;
	private fileCache: Map<string, FileCache> = new Map();
	private blockIdToEquation: Map<string, Map<string, EquationInfo>> =
		new Map();
	private updateInProgress: Set<string> = new Set();

	async onload() {
		await this.loadSettings();

		// Register the equation sidebar view
		this.registerView(
			EQUATION_SIDEBAR_VIEW_TYPE,
			(leaf) => new EquationSidebarView(leaf, this)
		);

		// Add ribbon icon to toggle equation sidebar
		this.addRibbonIcon("sigma", "Equation Navigator", () => {
			this.toggleEquationSidebar();
		});

		// Add command to toggle equation sidebar
		this.addCommand({
			id: "toggle-equation-sidebar",
			name: "Toggle equation sidebar",
			callback: () => {
				this.toggleEquationSidebar();
			},
		});

		// Register EditorExtension for Live Preview equation numbering
		this.registerEditorExtension(createEquationNumberPlugin(this));

		// Register EditorSuggest for equation references
		this.registerEditorSuggest(new EquationReferenceSuggest(this));

		// Register markdown post-processor for equation numbering (Reading mode)
		// Use priority to run early, and mark for live preview
		this.registerMarkdownPostProcessor(
			this.processEquations.bind(this),
			-100, // Run early to process before other processors
		);

		// Register markdown post-processor for block references (embeds)
		this.registerMarkdownPostProcessor(
			this.processBlockReferences.bind(this),
			100, // Run later to process after equations are numbered
		);

		// Register markdown post-processor for regular links to equations
		this.registerMarkdownPostProcessor(
			this.processEquationLinks.bind(this),
			150, // Run after block references
		);

		// Listen for file changes to update equation cache
		this.registerEvent(
			this.app.metadataCache.on("changed", (file: TFile) => {
				this.updateEquationCache(file);
			}),
		);

		// Listen for file deletions to clean up cache
		this.registerEvent(
			this.app.vault.on("delete", (file) => {
				if (file instanceof TFile) {
					this.fileCache.delete(file.path);
					this.blockIdToEquation.delete(file.path);
				}
			}),
		);

		// Listen for file renames to update cache
		this.registerEvent(
			this.app.vault.on("rename", (file, oldPath) => {
				if (file instanceof TFile) {
					const cache = this.fileCache.get(oldPath);
					if (cache) {
						this.fileCache.delete(oldPath);
						this.fileCache.set(file.path, cache);

						// Update block ID mappings
						const blockMap = this.blockIdToEquation.get(oldPath);
						if (blockMap) {
							this.blockIdToEquation.delete(oldPath);
							this.blockIdToEquation.set(file.path, blockMap);

							// Update file path in equations
							blockMap.forEach((eq) => {
								eq.filePath = file.path;
							});
						}
					}
				}
			}),
		);

		// Initial cache build
		this.app.workspace.onLayoutReady(() => {
			this.buildInitialCache();
		});

		// Add settings tab
		this.addSettingTab(new MathReferencerSettingTab(this.app, this));

		// Add command to generate block IDs for all equations in current file
		this.addCommand({
			id: "generate-all-block-ids",
			name: "Generate block IDs for all equations in current file",
			editorCallback: async (editor: Editor, ctx) => {
				if (!ctx.file) {
					return;
				}
				await this.generateAllBlockIds(editor, ctx.file);
			},
		});

		// Add command to toggle auto-generate on save
		this.addCommand({
			id: "toggle-auto-generate-on-save",
			name: "Toggle auto-generate block IDs on save",
			callback: async () => {
				this.settings.autoGenerateOnSave =
					!this.settings.autoGenerateOnSave;
				await this.saveSettings();
				new Notice(
					`Auto-generate block IDs on save: ${this.settings.autoGenerateOnSave ? "enabled" : "disabled"}`,
				);
			},
		});

		// Register event listener for auto-generate on save
		this.registerEvent(
			this.app.vault.on("modify", async (file) => {
				if (!this.settings.autoGenerateOnSave) {
					return;
				}
				if (!(file instanceof TFile) || file.extension !== "md") {
					return;
				}
				// Only process if the file is currently open in an editor
				const activeView =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!activeView || activeView.file?.path !== file.path) {
					return;
				}
				const editor = activeView.editor;
				// Use a small delay to avoid running during rapid edits
				// and to ensure we process after the save is complete
				setTimeout(async () => {
					await this.generateAllBlockIds(editor, file, true);
				}, 100);
			}),
		);

		console.log("Math Referencer plugin loaded");
	}

	onunload() {
		// Clean up caches
		this.fileCache.clear();
		this.blockIdToEquation.clear();
		this.updateInProgress.clear();
		// Detach sidebar views
		this.app.workspace.detachLeavesOfType(EQUATION_SIDEBAR_VIEW_TYPE);
		console.log("Math Referencer plugin unloaded");
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/**
	 * Toggle the equation sidebar visibility
	 */
	async toggleEquationSidebar() {
		const existing = this.app.workspace.getLeavesOfType(EQUATION_SIDEBAR_VIEW_TYPE);
		if (existing.length > 0) {
			// Close the sidebar if it's already open
			existing.forEach((leaf) => leaf.detach());
		} else {
			// Open the sidebar
			await this.activateEquationSidebar();
		}
	}

	/**
	 * Activate (open) the equation sidebar in the right panel
	 */
	async activateEquationSidebar() {
		const { workspace } = this.app;

		let leaf = workspace.getLeavesOfType(EQUATION_SIDEBAR_VIEW_TYPE)[0];

		if (!leaf) {
			// Create the leaf in the right sidebar
			const rightLeaf = workspace.getRightLeaf(false);
			if (rightLeaf) {
				leaf = rightLeaf;
				await leaf.setViewState({
					type: EQUATION_SIDEBAR_VIEW_TYPE,
					active: true,
				});
			}
		}

		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}

	/**
	 * Process equations in the rendered markdown
	 */
	private async processEquations(
		element: HTMLElement,
		context: MarkdownPostProcessorContext,
	) {
		if (!this.settings.enableAutoNumbering) {
			return;
		}

		const sourcePath = context.sourcePath;

		// Find all MathJax display equations (block equations)
		// Obsidian renders math blocks as <div class="math math-block">
		const mathBlocks = element.querySelectorAll(".math.math-block");

		if (mathBlocks.length === 0) {
			return;
		}

		// Get the source file to access block IDs
		const file = this.app.vault.getAbstractFileByPath(sourcePath);
		if (!(file instanceof TFile)) {
			return;
		}

		try {
			// Get equations from cache or parse them
			const equations = await this.getEquations(file);

			// Get section info to determine which lines this element covers
			const sectionInfo = context.getSectionInfo(element);

			// Number the equations in the rendered output
			let mathBlockIndex = 0;
			mathBlocks.forEach((mathBlock) => {
				const mathEl = mathBlock as HTMLElement;

				// Check if already in a wrapper (skip if already processed)
				if (mathEl.closest(".equation-container")) {
					return;
				}

				// Find the matching equation by line number
				let matchingEquation: EquationInfo | null = null;

				if (sectionInfo) {
					// We have section info - find equation within this section's line range
					// Find equations that start within the section's line range
					const sectionEquations = equations.filter(
						(eq) =>
							eq.lineNumber >= sectionInfo.lineStart &&
							eq.lineNumber <= sectionInfo.lineEnd,
					);

					// Match by index within this section
					if (mathBlockIndex < sectionEquations.length) {
						matchingEquation = sectionEquations[mathBlockIndex];
					}
				} else {
					// Fallback: match by global index (less reliable)
					if (mathBlockIndex < equations.length) {
						matchingEquation = equations[mathBlockIndex];
					}
				}

				if (!matchingEquation) {
					mathBlockIndex++;
					return;
				}

				// Add equation number
				const numberSpan = document.createElement("span");
				numberSpan.className = "equation-number";
				numberSpan.textContent =
					this.formatEquationNumber(matchingEquation);

				// Wrap the math block in a container for proper layout
				const wrapper = document.createElement("div");
				wrapper.className = "equation-container";

				// Move math block into wrapper
				const parent = mathEl.parentElement;
				if (!parent) {
					console.warn(
						"Math element has no parent, skipping numbering",
					);
					mathBlockIndex++;
					return;
				}

				parent.insertBefore(wrapper, mathEl);
				wrapper.appendChild(mathEl);
				wrapper.appendChild(numberSpan);

				// Store block ID reference if available
				if (matchingEquation.blockId) {
					wrapper.setAttribute(
						"data-block-id",
						matchingEquation.blockId,
					);
				}

				mathBlockIndex++;
			});
		} catch (error) {
			console.error(
				`Error processing equations in ${sourcePath}:`,
				error,
			);
		}
	}

	/**
	 * Process block references to equations (embeds: ![[file#^block]])
	 */
	private async processBlockReferences(
		element: HTMLElement,
		context: MarkdownPostProcessorContext,
	) {
		// Find all internal embeds (block references)
		const embeds = element.querySelectorAll(".internal-embed");

		for (const embed of Array.from(embeds)) {
			const embedEl = embed as HTMLElement;
			const src = embedEl.getAttribute("src");

			if (!src || !src.includes("^")) {
				continue;
			}

			// Parse the block reference
			const parts = src.split("#^");
			const filePart = parts[0];
			const blockPart = parts.slice(1).join("#^");

			if (!blockPart) {
				continue;
			}

			// Resolve the file path
			const sourceFile = this.app.vault.getAbstractFileByPath(
				context.sourcePath,
			);
			if (!(sourceFile instanceof TFile)) {
				continue;
			}

			const targetFile = this.app.metadataCache.getFirstLinkpathDest(
				filePart || context.sourcePath,
				sourceFile.path,
			);

			if (!targetFile) {
				console.warn(
					`Could not resolve file: ${filePart || context.sourcePath}`,
				);
				continue;
			}

			// Check if this block reference points to an equation
			const blockMap = this.blockIdToEquation.get(targetFile.path);
			const equation = blockMap?.get(blockPart);

			if (equation) {
				// Render the equation reference
				await this.renderEquationReference(
					embedEl,
					equation,
					targetFile,
					context.sourcePath,
				);
			}
		}
	}

	/**
	 * Process regular links to equations (not embeds: [[file#^block]])
	 */
	private async processEquationLinks(
		element: HTMLElement,
		context: MarkdownPostProcessorContext,
	) {
		// Find all internal links (not embeds)
		const links = element.querySelectorAll("a.internal-link");

		for (const link of Array.from(links)) {
			const linkEl = link as HTMLAnchorElement;
			const href =
				linkEl.getAttribute("data-href") || linkEl.getAttribute("href");

			if (!href || !href.includes("^")) {
				continue;
			}

			// Parse the link
			const parts = href.split("#^");
			const filePart = parts[0];
			const blockPart = parts.slice(1).join("#^");

			if (!blockPart) {
				continue;
			}

			// Resolve the file path
			const sourceFile = this.app.vault.getAbstractFileByPath(
				context.sourcePath,
			);
			if (!(sourceFile instanceof TFile)) {
				continue;
			}

			const targetFile = this.app.metadataCache.getFirstLinkpathDest(
				filePart || context.sourcePath,
				sourceFile.path,
			);

			if (!targetFile) {
				continue;
			}

			// Check if this link points to an equation
			const blockMap = this.blockIdToEquation.get(targetFile.path);
			const equation = blockMap?.get(blockPart);

			if (equation) {
				// Replace link text with formatted equation reference
				linkEl.textContent = this.formatEquationLink(
					equation,
					targetFile,
					context.sourcePath,
				);
				linkEl.addClass("equation-link");
			}
		}
	}

	/**
	 * Format an equation link
	 */
	private formatEquationLink(
		equation: EquationInfo,
		targetFile: TFile,
		currentPath: string,
	): string {
		const fileName = targetFile.basename;
		const isSameFile = targetFile.path === currentPath;

		let format = this.settings.linkRenderFormat;

		// If in different file and format doesn't include file name, add it
		if (!isSameFile && !format.includes("${file}")) {
			format = "${file} " + format;
		}

		// Get formatted equation number
		return format
			.replace("${num}", equation.equationNumber.toString())
			.replace("${file}", fileName);
	}

	/**
	 * Render an equation reference (embed)
	 */
	private async renderEquationReference(
		element: HTMLElement,
		equation: EquationInfo,
		file: TFile,
		currentPath: string,
	) {
		// Create a container for the referenced equation
		const container = document.createElement("div");
		container.className = "equation-reference";

		// Add file name badge if from different file and setting enabled
		if (this.settings.showFileNameInEmbeds && file.path !== currentPath) {
			const fileLabel = document.createElement("div");
			fileLabel.className = "equation-file-label";
			fileLabel.textContent = file.basename;
			container.appendChild(fileLabel);
		}

		// Create a math block for the referenced equation
		const mathDiv = document.createElement("div");
		mathDiv.className = "math math-block is-loaded";

		// Wrap the LaTeX content in display math delimiters for MathJax
		const latexContent = `\\[${equation.content}\\]`;
		mathDiv.textContent = latexContent;

		// Add equation number with optional file prefix
		const numberSpan = document.createElement("span");
		numberSpan.className = "equation-number";

		const formattedNumber = this.formatEquationNumber(equation);
		if (this.settings.showFileNameInEmbeds && file.path !== currentPath) {
			numberSpan.textContent = `${file.basename} ${formattedNumber}`;
		} else {
			numberSpan.textContent = formattedNumber;
		}

		container.appendChild(mathDiv);
		container.appendChild(numberSpan);

		// Replace the embed content
		element.empty();
		element.appendChild(container);

		// Request MathJax to process this element
		// @ts-ignore - MathJax is available globally in Obsidian
		if (window.MathJax && window.MathJax.typesetPromise) {
			try {
				// @ts-ignore
				await window.MathJax.typesetPromise([mathDiv]);
			} catch (err) {
				console.error("MathJax rendering error:", err);
			}
		}
	}

	/**
	 * Get equations for a file (from cache or by parsing)
	 */
	private async getEquations(file: TFile): Promise<EquationInfo[]> {
		const cached = this.fileCache.get(file.path);

		// Check if cache is valid
		if (cached && cached.mtime === file.stat.mtime) {
			return cached.equations;
		}

		// Parse equations
		try {
			const content = await this.app.vault.read(file);
			const contentHash = this.hashContent(content);

			// Double-check hash in case mtime is unreliable
			if (cached && cached.contentHash === contentHash) {
				// Update mtime
				cached.mtime = file.stat.mtime;
				return cached.equations;
			}

			const equations = this.extractEquationsFromContent(
				content,
				file.path,
			);

			// Store in cache
			this.fileCache.set(file.path, {
				equations,
				contentHash,
				mtime: file.stat.mtime,
			});

			// Update block ID mappings
			const blockMap = new Map<string, EquationInfo>();
			equations.forEach((eq) => {
				if (eq.blockId) {
					blockMap.set(eq.blockId, eq);
				}
			});
			this.blockIdToEquation.set(file.path, blockMap);

			return equations;
		} catch (error) {
			console.error(`Failed to read file ${file.path}:`, error);
			return [];
		}
	}

	/**
	 * Simple hash function for content
	 */
	private hashContent(content: string): string {
		let hash = 0;
		for (let i = 0; i < content.length; i++) {
			const char = content.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // Convert to 32bit integer
		}
		return hash.toString();
	}

	/**
	 * Public method to extract equations from text (used by Live Preview plugin)
	 */
	public extractEquationsFromText(
		text: string,
		filePath: string,
	): EquationInfo[] {
		return this.extractEquationsFromContent(text, filePath);
	}

	/**
	 * Register a block ID mapping (used when generating new block IDs)
	 */
	public registerBlockId(
		filePath: string,
		blockId: string,
		equation: EquationInfo,
	): void {
		let blockMap = this.blockIdToEquation.get(filePath);
		if (!blockMap) {
			blockMap = new Map<string, EquationInfo>();
			this.blockIdToEquation.set(filePath, blockMap);
		}
		blockMap.set(blockId, equation);
	}

	/**
	 * Public method to get equations for a file from cache
	 */
	public getEquationsForFile(filePath: string): EquationInfo[] | null {
		const cache = this.fileCache.get(filePath);
		return cache ? cache.equations : null;
	}

	/**
	 * Extract equations from markdown content
	 */
	private extractEquationsFromContent(
		content: string,
		filePath: string,
	): EquationInfo[] {
		const equations: EquationInfo[] = [];
		const lines = content.split("\n");

		// Identify code block regions to skip
		const codeBlockRegions: Array<{ start: number; end: number }> = [];
		let inCodeBlock = false;
		let codeBlockStart = -1;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const trimmedLine = line.trim();
			if (
				trimmedLine.startsWith("```") ||
				trimmedLine.startsWith("~~~")
			) {
				if (!inCodeBlock) {
					inCodeBlock = true;
					codeBlockStart = i;
				} else {
					inCodeBlock = false;
					codeBlockRegions.push({ start: codeBlockStart, end: i });
				}
			}
		}

		// Helper to check if a line is in a code block
		const isInCodeBlock = (lineNum: number): boolean => {
			return codeBlockRegions.some(
				(region) => lineNum >= region.start && lineNum <= region.end,
			);
		};

		let equationNumber = this.settings.startNumberingFrom;
		let inEquation = false;
		let equationStartLine = -1;
		let equationContent = "";

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			// Skip if we're in a code block
			if (isInCodeBlock(i)) {
				continue;
			}

			// Start of display equation
			if (line.trim() === "$$" && !inEquation) {
				inEquation = true;
				equationStartLine = i;
				equationContent = "";
				continue;
			}

			// End of display equation
			if (line.trim() === "$$" && inEquation) {
				inEquation = false;

				// Skip empty equations
				if (equationContent.trim().length === 0) {
					continue;
				}

				// Check if the equation should be numbered
				// Skip if it contains \nonumber or \notag (LaTeX commands to skip numbering)
				const shouldNumber = !this.shouldSkipNumbering(equationContent);

				if (!shouldNumber) {
					continue;
				}

				// Check if next line has block ID (must be on its own line)
				let blockId: string | null = null;
				if (i + 1 < lines.length) {
					const nextLine = lines[i + 1];
					const blockIdMatch = nextLine.match(
						/^\^([a-zA-Z0-9-_]+)\s*$/,
					);
					if (blockIdMatch) {
						blockId = blockIdMatch[1];
					}
				}

				// Each $$ $$ block is ONE equation, even if it contains
				// align or other multi-line environments
				equations.push({
					filePath: filePath,
					blockId: blockId,
					equationNumber: equationNumber++,
					content: equationContent.trim(),
					lineNumber: equationStartLine,
					endLine: i,
				});
				continue;
			}

			// Collect equation content
			if (inEquation) {
				equationContent += line + "\n";
			}
		}

		// Warn about unclosed equations
		if (inEquation) {
			console.warn(
				`Unclosed equation found in ${filePath} starting at line ${equationStartLine}`,
			);
		}

		return equations;
	}

	/**
	 * Check if an equation should skip numbering based on LaTeX commands
	 */
	private shouldSkipNumbering(content: string): boolean {
		// Check for \nonumber or \notag commands
		// These are standard LaTeX commands to prevent equation numbering
		return /\\(nonumber|notag)/.test(content);
	}

	/**
	 * Format equation number according to settings
	 */
	public formatEquationNumber(equation: EquationInfo): string {
		return this.settings.numberingFormat.replace(
			"${num}",
			equation.equationNumber.toString(),
		);
	}

	/**
	 * Update equation cache when a file changes
	 */
	private async updateEquationCache(file: TFile) {
		// Debounce concurrent updates
		if (this.updateInProgress.has(file.path)) {
			return;
		}

		this.updateInProgress.add(file.path);
		try {
			// Force cache refresh by calling getEquations
			await this.getEquations(file);
		} finally {
			this.updateInProgress.delete(file.path);
		}
	}

	/**
	 * Build initial equation cache for all files
	 */
	private async buildInitialCache() {
		const files = this.app.vault.getMarkdownFiles();

		// Process in batches to avoid overwhelming the system
		const batchSize = 10;
		for (let i = 0; i < files.length; i += batchSize) {
			const batch = files.slice(i, i + batchSize);
			await Promise.all(
				batch.map((file) => this.updateEquationCache(file)),
			);
		}

		console.log(`Built equation cache for ${files.length} files`);
	}

	/**
	 * Generate a block ID for an equation based on its section numbers
	 * Public method used by EquationReferenceSuggest for on-demand generation
	 */
	public generateBlockIdForEquation(equation: EquationInfo): string {
		return `${this.settings.blockIdPrefix}-${equation.equationNumber}`;
	}

	/**
	 * Generate block IDs for all equations in the current file that don't already have one
	 */
	/**
	 * Check if a block ID matches the auto-generated pattern (prefix-number or prefix-number-suffix)
	 */
	private isAutoGeneratedBlockId(blockId: string): boolean {
		const prefix = this.settings.blockIdPrefix;
		// Match pattern: prefix-number or prefix-number-number (with uniqueness suffix)
		const autoGeneratedPattern = new RegExp(`^${prefix}-\\d+(-\\d+)?$`);
		return autoGeneratedPattern.test(blockId);
	}

	public async generateAllBlockIds(
		editor: Editor,
		file: TFile,
		silent = false,
	): Promise<void> {
		const content = editor.getValue();
		const equations = this.extractEquationsFromContent(content, file.path);

		// Categorize equations:
		// - No block ID: needs new ID
		// - Auto-generated block ID (matches prefix-number pattern): needs refresh
		// - Custom block ID: leave untouched
		const equationsToProcess = equations.filter(
			(eq) => !eq.blockId || this.isAutoGeneratedBlockId(eq.blockId),
		);
		const equationsWithCustomIds = equations.filter(
			(eq) => eq.blockId && !this.isAutoGeneratedBlockId(eq.blockId),
		);

		if (equationsToProcess.length === 0) {
			if (!silent) {
				new Notice(
					"All equations have custom block IDs (nothing to generate)",
				);
			}
			return;
		}

		// Sort by line number in descending order to process from bottom to top
		// This prevents line number shifts from affecting earlier modifications
		equationsToProcess.sort((a, b) => b.endLine - a.endLine);

		// Track generated IDs to ensure uniqueness within this batch
		// Also include custom IDs to avoid conflicts
		const usedIds = new Set<string>(
			equationsWithCustomIds.map((eq) => eq.blockId as string),
		);

		let generatedCount = 0;
		let refreshedCount = 0;

		for (const equation of equationsToProcess) {
			// Generate the new block ID based on current equation number
			let newBlockId = this.generateBlockIdForEquation(equation);

			// Ensure uniqueness by appending a suffix if needed
			let suffix = 1;
			let uniqueBlockId = newBlockId;
			while (usedIds.has(uniqueBlockId)) {
				uniqueBlockId = `${newBlockId}-${suffix}`;
				suffix++;
			}
			newBlockId = uniqueBlockId;
			usedIds.add(newBlockId);

			const lines = editor.getValue().split("\n");
			const closingLine = equation.endLine;

			if (closingLine >= 0 && closingLine < lines.length) {
				if (equation.blockId) {
					// Equation has an auto-generated block ID that needs refresh
					// The block ID is on the line after the closing $$
					const blockIdLine = closingLine + 1;
					if (blockIdLine < lines.length) {
						const oldBlockIdLineContent = lines[blockIdLine];
						// Replace the entire block ID line
						const startPos = { line: blockIdLine, ch: 0 };
						const endPos = {
							line: blockIdLine,
							ch: oldBlockIdLineContent.length,
						};
						editor.replaceRange(`^${newBlockId}`, startPos, endPos);
						refreshedCount++;
					}
				} else {
					// Equation doesn't have a block ID, insert new one
					const insertPos = {
						line: closingLine,
						ch: lines[closingLine].length,
					};
					editor.replaceRange(`\n^${newBlockId}`, insertPos);
					generatedCount++;
				}

				// Update the equation info and register the block ID
				equation.blockId = newBlockId;
				this.registerBlockId(file.path, newBlockId, equation);
			}
		}

		// Update the cache after all modifications
		await this.updateEquationCache(file);

		// Build notice message (only show if not silent or if there were changes)
		if (!silent || generatedCount > 0 || refreshedCount > 0) {
			const parts: string[] = [];
			if (generatedCount > 0) {
				parts.push(`generated ${generatedCount}`);
			}
			if (refreshedCount > 0) {
				parts.push(`refreshed ${refreshedCount}`);
			}
			if (parts.length > 0) {
				new Notice(`Block IDs: ${parts.join(", ")}`);
			} else if (!silent) {
				new Notice("No block ID changes needed");
			}
		}
	}
}

class MathReferencerSettingTab extends PluginSettingTab {
	plugin: MathReferencerPlugin;

	constructor(app: App, plugin: MathReferencerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h2", { text: "Math Referencer Settings" });

		new Setting(containerEl)
			.setName("Enable automatic numbering")
			.setDesc("Automatically number all block equations in your notes")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enableAutoNumbering)
					.onChange(async (value) => {
						this.plugin.settings.enableAutoNumbering = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Start numbering from")
			.setDesc("The number to start equation numbering from")
			.addText((text) =>
				text
					.setPlaceholder("1")
					.setValue(
						this.plugin.settings.startNumberingFrom.toString(),
					)
					.onChange(async (value) => {
						const num = parseInt(value);
						if (!isNaN(num) && num > 0) {
							this.plugin.settings.startNumberingFrom = num;
							await this.plugin.saveSettings();
						}
					}),
			);

		new Setting(containerEl)
			.setName("Numbering format")
			.setDesc(
				'Format for equation numbers. Use ${num} as placeholder (e.g., "(${num})", "[${num}]", "Eq. ${num}")',
			)
			.addText((text) =>
				text
					.setPlaceholder("(${num})")
					.setValue(this.plugin.settings.numberingFormat)
					.onChange(async (value) => {
						if (!value.includes("${num}")) {
							// Invalid format, keep current value
							text.setValue(this.plugin.settings.numberingFormat);
							return;
						}
						this.plugin.settings.numberingFormat = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Show file name in embeds")
			.setDesc(
				"Show the source file name when embedding equations from other files",
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showFileNameInEmbeds)
					.onChange(async (value) => {
						this.plugin.settings.showFileNameInEmbeds = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Link render format")
			.setDesc(
				'Format for rendering links to equations. Use ${num} for number, ${file} for file name (e.g., "Equation ${num}", "${file} Equation ${num}")',
			)
			.addText((text) =>
				text
					.setPlaceholder("Equation ${num}")
					.setValue(this.plugin.settings.linkRenderFormat)
					.onChange(async (value) => {
						if (!value.includes("${num}")) {
							// Invalid format, keep current value
							text.setValue(
								this.plugin.settings.linkRenderFormat,
							);
							return;
						}
						this.plugin.settings.linkRenderFormat = value;
						await this.plugin.saveSettings();
					}),
			);

		containerEl.createEl("h3", { text: "Block Reference Settings" });

		new Setting(containerEl)
			.setName("Block ID prefix")
			.setDesc(
				'Prefix for generated block IDs when using \\ref (e.g., "eq" generates "^eq-1", "^eq-2")',
			)
			.addText((text) =>
				text
					.setPlaceholder("eq")
					.setValue(this.plugin.settings.blockIdPrefix)
					.onChange(async (value) => {
						if (value.trim().length === 0) {
							text.setValue(this.plugin.settings.blockIdPrefix);
							return;
						}
						this.plugin.settings.blockIdPrefix = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Auto-generate block IDs on save")
			.setDesc(
				"Automatically generate and refresh block IDs for equations when saving a file. Custom block IDs (not matching the prefix-number pattern) are preserved.",
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.autoGenerateOnSave)
					.onChange(async (value) => {
						this.plugin.settings.autoGenerateOnSave = value;
						await this.plugin.saveSettings();
					}),
			);

		containerEl.createEl("h3", { text: "Equation Reference Settings" });

		new Setting(containerEl)
			.setName("Reference trigger")
			.setDesc(
				'Text to type to trigger equation reference suggestions (e.g., "\\ref")',
			)
			.addText((text) =>
				text
					.setPlaceholder("\\ref")
					.setValue(this.plugin.settings.refTrigger)
					.onChange(async (value) => {
						if (value.trim().length === 0) {
							text.setValue(this.plugin.settings.refTrigger);
							return;
						}
						this.plugin.settings.refTrigger = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
