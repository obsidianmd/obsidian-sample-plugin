import {
	App,
	Plugin,
	PluginSettingTab,
	Setting,
	MarkdownPostProcessorContext,
	TFile,
	CachedMetadata,
	MarkdownView,
	editorLivePreviewField,
	editorEditorField,
	EditorSuggest,
	Editor,
	EditorPosition,
	EditorSuggestTriggerInfo,
	EditorSuggestContext
} from 'obsidian';

import {
	EditorView,
	ViewPlugin,
	ViewUpdate,
	Decoration,
	DecorationSet,
	WidgetType
} from '@codemirror/view';

import { syntaxTree } from '@codemirror/language';
import { RangeSetBuilder } from '@codemirror/state';

interface MathReferencerSettings {
	enableAutoNumbering: boolean;
	startNumberingFrom: number;
	numberingFormat: string; // e.g., "(1)", "[1]", "Eq. 1"
	showFileNameInEmbeds: boolean;
	linkRenderFormat: string; // e.g., "Equation ${num}", "${file} Equation ${num}"
	enableAutoBlockIds: boolean; // Auto-generate block reference IDs
	blockIdPrefix: string; // Prefix for block IDs (e.g., "eq")
	refTrigger: string; // Trigger for equation references (e.g., "\\ref")
}

const DEFAULT_SETTINGS: MathReferencerSettings = {
	enableAutoNumbering: true,
	startNumberingFrom: 1,
	numberingFormat: '(${num})',
	showFileNameInEmbeds: true,
	linkRenderFormat: 'Equation ${num}',
	enableAutoBlockIds: true,
	blockIdPrefix: 'eq',
	refTrigger: '\\ref'
}

interface EquationInfo {
	filePath: string;
	blockId: string | null;
	equationNumber: number;
	content: string;
	lineNumber: number;
	sectionNumbers: number[]; // Hierarchical section numbers [2, 1, 2] for section 2.1.2
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

	onTrigger(cursor: EditorPosition, editor: Editor, file: TFile | null): EditorSuggestTriggerInfo | null {
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
			query: query
		};
	}

	getSuggestions(context: EditorSuggestContext): EquationInfo[] | Promise<EquationInfo[]> {
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

		return equations.filter(eq => {
			const eqNum = eq.equationNumber.toString();
			const blockId = eq.blockId || '';
			const content = eq.content.toLowerCase();

			return eqNum.includes(query) ||
			       blockId.toLowerCase().includes(query) ||
			       content.includes(query);
		});
	}

	renderSuggestion(equation: EquationInfo, el: HTMLElement): void {
		const container = el.createDiv({ cls: 'equation-suggestion' });

		// Add equation number
		const numberSpan = container.createSpan({ cls: 'equation-suggestion-number' });
		numberSpan.textContent = `Equation ${equation.equationNumber}`;

		// Add block ID if available
		if (equation.blockId) {
			const blockIdSpan = container.createSpan({ cls: 'equation-suggestion-blockid' });
			blockIdSpan.textContent = ` ^${equation.blockId}`;
		}

		// Add a preview of the equation content
		const contentDiv = container.createDiv({ cls: 'equation-suggestion-content' });
		// Truncate long equations
		const preview = equation.content.length > 50
			? equation.content.substring(0, 50) + '...'
			: equation.content;
		contentDiv.textContent = preview;
	}

	selectSuggestion(equation: EquationInfo, evt: MouseEvent | KeyboardEvent): void {
		const file = this.app.workspace.getActiveFile();
		if (!file || !this.context) {
			return;
		}

		const editor = this.context.editor;

		// Generate the link text
		const linkText = `[[${file.basename}#^${equation.blockId}|Equation ${equation.equationNumber}]]`;

		// Replace the trigger text with the link
		editor.replaceRange(
			linkText,
			this.context.start,
			this.context.end
		);

		// Move cursor after the inserted link
		const newCursorPos = {
			line: this.context.start.line,
			ch: this.context.start.ch + linkText.length
		};
		editor.setCursor(newCursorPos);
	}
}

/**
 * Widget to display equation numbers in Live Preview mode
 */
class EquationNumberWidget extends WidgetType {
	constructor(private equationNumber: string) {
		super();
	}

	toDOM(): HTMLElement {
		const span = document.createElement('span');
		span.className = 'equation-number';
		span.textContent = this.equationNumber;
		return span;
	}

	eq(other: EquationNumberWidget): boolean {
		return other.equationNumber === this.equationNumber;
	}

	ignoreEvent(): boolean {
		return true;
	}
}

/**
 * Creates a view plugin for Live Preview mode equation numbering
 */
function createLivePreviewPlugin(plugin: MathReferencerPlugin) {
	return ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;

			constructor(view: EditorView) {
				this.decorations = this.buildDecorations(view);
			}

			update(update: ViewUpdate) {
				if (update.docChanged || update.viewportChanged) {
					this.decorations = this.buildDecorations(update.view);
				}
			}

			buildDecorations(view: EditorView): DecorationSet {
				if (!plugin.settings.enableAutoNumbering) {
					return Decoration.none;
				}

				// Check if we're in Live Preview mode
				const isLivePreview = view.state.field(editorLivePreviewField);
				if (!isLivePreview) {
					return Decoration.none;
				}

				const builder = new RangeSetBuilder<Decoration>();
				const text = view.state.doc.toString();

				// Get the current file
				const editor = view.state.field(editorEditorField);
				if (!editor) {
					return builder.finish();
				}

				const file = plugin.app.workspace.getActiveFile();
				if (!file) {
					return builder.finish();
				}

				// Extract equations from the document
				const equations = plugin.extractEquationsFromText(text, file.path);

				// Find all $$ blocks in the document
				let equationIndex = 0;
				const lines = text.split('\n');
				let pos = 0;
				let inEquation = false;
				let equationStartPos = -1;

				for (let i = 0; i < lines.length; i++) {
					const line = lines[i];
					const lineLength = line.length;

					if (line.trim() === '$$' && !inEquation) {
						inEquation = true;
						equationStartPos = pos;
					} else if (line.trim() === '$$' && inEquation) {
						inEquation = false;

						// Add decoration at the end of the closing $$
						const equation = equations[equationIndex];
						if (equation) {
							const decorationPos = pos + lineLength;
							const widget = Decoration.widget({
								widget: new EquationNumberWidget(
									plugin.formatEquationNumber(equation.equationNumber)
								),
								side: 1
							});
							builder.add(decorationPos, decorationPos, widget);
						}
						equationIndex++;
					}

					pos += lineLength + 1; // +1 for newline
				}

				return builder.finish();
			}
		},
		{
			decorations: (value) => value.decorations
		}
	);
}

export default class MathReferencerPlugin extends Plugin {
	settings: MathReferencerSettings;
	private fileCache: Map<string, FileCache> = new Map();
	private blockIdToEquation: Map<string, Map<string, EquationInfo>> = new Map();
	private updateInProgress: Set<string> = new Set();

	async onload() {
		await this.loadSettings();

		// Register EditorExtension for Live Preview mode
		this.registerEditorExtension(createLivePreviewPlugin(this));

		// Register EditorSuggest for equation references
		this.registerEditorSuggest(new EquationReferenceSuggest(this));

		// Register markdown post-processor for equation numbering (Reading mode)
		// Use priority to run early, and mark for live preview
		this.registerMarkdownPostProcessor(
			this.processEquations.bind(this),
			-100 // Run early to process before other processors
		);

		// Register markdown post-processor for block references (embeds)
		this.registerMarkdownPostProcessor(
			this.processBlockReferences.bind(this),
			100 // Run later to process after equations are numbered
		);

		// Register markdown post-processor for regular links to equations
		this.registerMarkdownPostProcessor(
			this.processEquationLinks.bind(this),
			150 // Run after block references
		);

		// Add command to insert block IDs
		this.addCommand({
			id: 'insert-equation-block-ids',
			name: 'Insert block IDs for equations',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				await this.insertBlockIds(editor, view);
			}
		});

		// Listen for file changes to update equation cache
		this.registerEvent(
			this.app.metadataCache.on('changed', (file: TFile) => {
				this.updateEquationCache(file);
			})
		);

		// Listen for file deletions to clean up cache
		this.registerEvent(
			this.app.vault.on('delete', (file) => {
				if (file instanceof TFile) {
					this.fileCache.delete(file.path);
					this.blockIdToEquation.delete(file.path);
				}
			})
		);

		// Listen for file renames to update cache
		this.registerEvent(
			this.app.vault.on('rename', (file, oldPath) => {
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
							blockMap.forEach(eq => {
								eq.filePath = file.path;
							});
						}
					}
				}
			})
		);

		// Initial cache build
		this.app.workspace.onLayoutReady(() => {
			this.buildInitialCache();
		});

		// Add settings tab
		this.addSettingTab(new MathReferencerSettingTab(this.app, this));

		console.log('Math Referencer plugin loaded');
	}

	onunload() {
		// Clean up caches
		this.fileCache.clear();
		this.blockIdToEquation.clear();
		this.updateInProgress.clear();
		console.log('Math Referencer plugin unloaded');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/**
	 * Process equations in the rendered markdown
	 */
	private async processEquations(
		element: HTMLElement,
		context: MarkdownPostProcessorContext
	) {
		if (!this.settings.enableAutoNumbering) {
			return;
		}

		const sourcePath = context.sourcePath;

		// Find all MathJax display equations (block equations)
		// Obsidian renders math blocks as <div class="math math-block">
		const mathBlocks = element.querySelectorAll('.math.math-block');

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

			// Number the equations in the rendered output
			let equationIndex = 0;
			mathBlocks.forEach((mathBlock) => {
				const mathEl = mathBlock as HTMLElement;

				// Check if already in a wrapper (skip if already processed)
				if (mathEl.closest('.equation-container')) {
					return;
				}

				const equation = equations[equationIndex];
				if (!equation) {
					equationIndex++;
					return;
				}

				// Add equation number
				const numberSpan = document.createElement('span');
				numberSpan.className = 'equation-number';
				numberSpan.textContent = this.formatEquationNumber(equation.equationNumber);

				// Wrap the math block in a container for proper layout
				const wrapper = document.createElement('div');
				wrapper.className = 'equation-container';

				// Move math block into wrapper
				const parent = mathEl.parentElement;
				if (!parent) {
					console.warn('Math element has no parent, skipping numbering');
					equationIndex++;
					return;
				}

				parent.insertBefore(wrapper, mathEl);
				wrapper.appendChild(mathEl);
				wrapper.appendChild(numberSpan);

				// Store block ID reference if available
				if (equation.blockId) {
					wrapper.setAttribute('data-block-id', equation.blockId);
				}

				equationIndex++;
			});
		} catch (error) {
			console.error(`Error processing equations in ${sourcePath}:`, error);
		}
	}

	/**
	 * Process block references to equations (embeds: ![[file#^block]])
	 */
	private async processBlockReferences(
		element: HTMLElement,
		context: MarkdownPostProcessorContext
	) {
		// Find all internal embeds (block references)
		const embeds = element.querySelectorAll('.internal-embed');

		for (const embed of Array.from(embeds)) {
			const embedEl = embed as HTMLElement;
			const src = embedEl.getAttribute('src');

			if (!src || !src.includes('^')) {
				continue;
			}

			// Parse the block reference
			const parts = src.split('#^');
			const filePart = parts[0];
			const blockPart = parts.slice(1).join('#^');

			if (!blockPart) {
				continue;
			}

			// Resolve the file path
			const sourceFile = this.app.vault.getAbstractFileByPath(context.sourcePath);
			if (!(sourceFile instanceof TFile)) {
				continue;
			}

			const targetFile = this.app.metadataCache.getFirstLinkpathDest(
				filePart || context.sourcePath,
				sourceFile.path
			);

			if (!targetFile) {
				console.warn(`Could not resolve file: ${filePart || context.sourcePath}`);
				continue;
			}

			// Check if this block reference points to an equation
			const blockMap = this.blockIdToEquation.get(targetFile.path);
			const equation = blockMap?.get(blockPart);

			if (equation) {
				// Render the equation reference
				await this.renderEquationReference(embedEl, equation, targetFile, context.sourcePath);
			}
		}
	}

	/**
	 * Process regular links to equations (not embeds: [[file#^block]])
	 */
	private async processEquationLinks(
		element: HTMLElement,
		context: MarkdownPostProcessorContext
	) {
		// Find all internal links (not embeds)
		const links = element.querySelectorAll('a.internal-link');

		for (const link of Array.from(links)) {
			const linkEl = link as HTMLAnchorElement;
			const href = linkEl.getAttribute('data-href') || linkEl.getAttribute('href');

			if (!href || !href.includes('^')) {
				continue;
			}

			// Parse the link
			const parts = href.split('#^');
			const filePart = parts[0];
			const blockPart = parts.slice(1).join('#^');

			if (!blockPart) {
				continue;
			}

			// Resolve the file path
			const sourceFile = this.app.vault.getAbstractFileByPath(context.sourcePath);
			if (!(sourceFile instanceof TFile)) {
				continue;
			}

			const targetFile = this.app.metadataCache.getFirstLinkpathDest(
				filePart || context.sourcePath,
				sourceFile.path
			);

			if (!targetFile) {
				continue;
			}

			// Check if this link points to an equation
			const blockMap = this.blockIdToEquation.get(targetFile.path);
			const equation = blockMap?.get(blockPart);

			if (equation) {
				// Replace link text with formatted equation reference
				linkEl.textContent = this.formatEquationLink(equation, targetFile, context.sourcePath);
				linkEl.addClass('equation-link');
			}
		}
	}

	/**
	 * Format an equation link
	 */
	private formatEquationLink(equation: EquationInfo, targetFile: TFile, currentPath: string): string {
		const fileName = targetFile.basename;
		const isSameFile = targetFile.path === currentPath;

		let format = this.settings.linkRenderFormat;

		// If in different file and format doesn't include file name, add it
		if (!isSameFile && !format.includes('${file}')) {
			format = '${file} ' + format;
		}

		return format
			.replace('${num}', equation.equationNumber.toString())
			.replace('${file}', fileName);
	}

	/**
	 * Render an equation reference (embed)
	 */
	private async renderEquationReference(
		element: HTMLElement,
		equation: EquationInfo,
		file: TFile,
		currentPath: string
	) {
		// Create a container for the referenced equation
		const container = document.createElement('div');
		container.className = 'equation-reference';

		// Add file name badge if from different file and setting enabled
		if (this.settings.showFileNameInEmbeds && file.path !== currentPath) {
			const fileLabel = document.createElement('div');
			fileLabel.className = 'equation-file-label';
			fileLabel.textContent = file.basename;
			container.appendChild(fileLabel);
		}

		// Create a math block for the referenced equation
		const mathDiv = document.createElement('div');
		mathDiv.className = 'math math-block is-loaded';

		// Wrap the LaTeX content in display math delimiters for MathJax
		const latexContent = `\\[${equation.content}\\]`;
		mathDiv.textContent = latexContent;

		// Add equation number with optional file prefix
		const numberSpan = document.createElement('span');
		numberSpan.className = 'equation-number';

		if (this.settings.showFileNameInEmbeds && file.path !== currentPath) {
			numberSpan.textContent = `${file.basename} ${this.formatEquationNumber(equation.equationNumber)}`;
		} else {
			numberSpan.textContent = this.formatEquationNumber(equation.equationNumber);
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
				console.error('MathJax rendering error:', err);
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

			const cache = this.app.metadataCache.getFileCache(file);
			const equations = this.extractEquationsFromContent(content, cache, file.path);

			// Store in cache
			this.fileCache.set(file.path, {
				equations,
				contentHash,
				mtime: file.stat.mtime
			});

			// Update block ID mappings
			const blockMap = new Map<string, EquationInfo>();
			equations.forEach(eq => {
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
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash; // Convert to 32bit integer
		}
		return hash.toString();
	}

	/**
	 * Public method to extract equations from text (used by Live Preview plugin)
	 */
	public extractEquationsFromText(text: string, filePath: string): EquationInfo[] {
		return this.extractEquationsFromContent(text, null, filePath);
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
		cache: CachedMetadata | null,
		filePath: string
	): EquationInfo[] {
		const equations: EquationInfo[] = [];
		const lines = content.split('\n');

		// Identify code block regions to skip
		const codeBlockRegions: Array<{start: number, end: number}> = [];
		let inCodeBlock = false;
		let codeBlockStart = -1;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (line.trim().startsWith('```')) {
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
			return codeBlockRegions.some(region =>
				lineNum >= region.start && lineNum <= region.end
			);
		};

		// Track heading hierarchy for section numbering
		const headingStack: number[] = []; // Stack of section counters
		const headingLevels: Map<number, number> = new Map(); // Maps line number to heading level

		// First pass: identify all headings and their positions
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (isInCodeBlock(i)) {
				continue;
			}

			const headingMatch = line.match(/^(#{1,6})\s+/);
			if (headingMatch) {
				const level = headingMatch[1].length;
				headingLevels.set(i, level);
			}
		}

		// Helper to get current section numbers at a given line
		const getCurrentSectionNumbers = (lineNum: number): number[] => {
			const sectionNumbers: number[] = [];
			let currentStack: number[] = [];
			let lastLevel = 0;

			// Process all headings up to this line
			for (const [headingLine, level] of headingLevels.entries()) {
				if (headingLine >= lineNum) {
					break;
				}

				// Adjust stack based on heading level
				if (level <= lastLevel) {
					// Pop stack to current level
					currentStack = currentStack.slice(0, level - 1);
				}

				// Ensure stack has enough levels
				while (currentStack.length < level - 1) {
					currentStack.push(0);
				}

				// Increment or add counter at current level
				if (currentStack.length === level - 1) {
					currentStack.push(1);
				} else {
					currentStack[level - 1]++;
				}

				lastLevel = level;
			}

			return currentStack;
		};

		let equationNumber = this.settings.startNumberingFrom;
		let inEquation = false;
		let equationStartLine = -1;
		let equationContent = '';

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			// Skip if we're in a code block
			if (isInCodeBlock(i)) {
				continue;
			}

			// Start of display equation
			if (line.trim() === '$$' && !inEquation) {
				inEquation = true;
				equationStartLine = i;
				equationContent = '';
				continue;
			}

			// End of display equation
			if (line.trim() === '$$' && inEquation) {
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

				// Get section numbers at this equation's position
				const sectionNumbers = getCurrentSectionNumbers(i);

				// Check if next line has block ID (must be on its own line)
				let blockId: string | null = null;
				if (i + 1 < lines.length) {
					const nextLine = lines[i + 1];
					const blockIdMatch = nextLine.match(/^\^([a-zA-Z0-9-_]+)\s*$/);
					if (blockIdMatch) {
						blockId = blockIdMatch[1];
					}
				}

				// Generate block ID if auto-generation is enabled and no existing ID
				if (!blockId && this.settings.enableAutoBlockIds) {
					if (sectionNumbers.length > 0) {
						blockId = `${this.settings.blockIdPrefix}-${sectionNumbers.join('-')}-${equationNumber - this.settings.startNumberingFrom + 1}`;
					} else {
						blockId = `${this.settings.blockIdPrefix}-${equationNumber}`;
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
					sectionNumbers: sectionNumbers
				});
				continue;
			}

			// Collect equation content
			if (inEquation) {
				equationContent += line + '\n';
			}
		}

		// Warn about unclosed equations
		if (inEquation) {
			console.warn(`Unclosed equation found in ${filePath} starting at line ${equationStartLine}`);
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
	public formatEquationNumber(num: number): string {
		return this.settings.numberingFormat.replace('${num}', num.toString());
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
			await Promise.all(batch.map(file => this.updateEquationCache(file)));
		}

		console.log(`Built equation cache for ${files.length} files`);
	}

	/**
	 * Insert block IDs for equations that don't have them
	 */
	private async insertBlockIds(editor: Editor, view: MarkdownView) {
		const file = view.file;
		if (!file) {
			return;
		}

		const content = editor.getValue();
		const equations = this.extractEquationsFromContent(content, null, file.path);

		// Find equations that need block IDs inserted
		const lines = content.split('\n');
		let insertions: Array<{line: number, text: string}> = [];

		for (const eq of equations) {
			// Check if block ID already exists in the file
			const equationEndLine = eq.lineNumber;

			// Find the closing $$ line
			let closingLine = -1;
			for (let i = eq.lineNumber + 1; i < lines.length; i++) {
				if (lines[i].trim() === '$$') {
					closingLine = i;
					break;
				}
			}

			if (closingLine === -1) {
				continue; // Skip unclosed equations
			}

			// Check if next line has a block ID
			const nextLine = closingLine + 1;
			if (nextLine < lines.length) {
				const existingBlockId = lines[nextLine].match(/^\^([a-zA-Z0-9-_]+)\s*$/);
				if (existingBlockId) {
					continue; // Already has a block ID
				}
			}

			// Add block ID insertion
			if (eq.blockId) {
				insertions.push({
					line: closingLine + 1,
					text: `^${eq.blockId}`
				});
			}
		}

		// Sort insertions in reverse order to maintain line numbers
		insertions.sort((a, b) => b.line - a.line);

		// Insert block IDs
		for (const insertion of insertions) {
			editor.replaceRange(
				`\n^${insertion.text.substring(1)}`,
				{ line: insertion.line - 1, ch: lines[insertion.line - 1].length }
			);
		}

		if (insertions.length > 0) {
			console.log(`Inserted ${insertions.length} block IDs`);
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
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Math Referencer Settings'});

		new Setting(containerEl)
			.setName('Enable automatic numbering')
			.setDesc('Automatically number all block equations in your notes')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableAutoNumbering)
				.onChange(async (value) => {
					this.plugin.settings.enableAutoNumbering = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Start numbering from')
			.setDesc('The number to start equation numbering from')
			.addText(text => text
				.setPlaceholder('1')
				.setValue(this.plugin.settings.startNumberingFrom.toString())
				.onChange(async (value) => {
					const num = parseInt(value);
					if (!isNaN(num) && num > 0) {
						this.plugin.settings.startNumberingFrom = num;
						await this.plugin.saveSettings();
					}
				}));

		new Setting(containerEl)
			.setName('Numbering format')
			.setDesc('Format for equation numbers. Use ${num} as placeholder (e.g., "(${num})", "[${num}]", "Eq. ${num}")')
			.addText(text => text
				.setPlaceholder('(${num})')
				.setValue(this.plugin.settings.numberingFormat)
				.onChange(async (value) => {
					if (!value.includes('${num}')) {
						// Invalid format, keep current value
						text.setValue(this.plugin.settings.numberingFormat);
						return;
					}
					this.plugin.settings.numberingFormat = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Show file name in embeds')
			.setDesc('Show the source file name when embedding equations from other files')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showFileNameInEmbeds)
				.onChange(async (value) => {
					this.plugin.settings.showFileNameInEmbeds = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Link render format')
			.setDesc('Format for rendering links to equations. Use ${num} for number, ${file} for file name (e.g., "Equation ${num}", "${file} Equation ${num}")')
			.addText(text => text
				.setPlaceholder('Equation ${num}')
				.setValue(this.plugin.settings.linkRenderFormat)
				.onChange(async (value) => {
					if (!value.includes('${num}')) {
						// Invalid format, keep current value
						text.setValue(this.plugin.settings.linkRenderFormat);
						return;
					}
					this.plugin.settings.linkRenderFormat = value;
					await this.plugin.saveSettings();
				}));

		containerEl.createEl('h3', {text: 'Block Reference Settings'});

		new Setting(containerEl)
			.setName('Auto-generate block IDs')
			.setDesc('Automatically generate block reference IDs for equations based on section hierarchy')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableAutoBlockIds)
				.onChange(async (value) => {
					this.plugin.settings.enableAutoBlockIds = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Block ID prefix')
			.setDesc('Prefix for auto-generated block IDs (e.g., "eq" generates "^eq-2-1-2")')
			.addText(text => text
				.setPlaceholder('eq')
				.setValue(this.plugin.settings.blockIdPrefix)
				.onChange(async (value) => {
					if (value.trim().length === 0) {
						text.setValue(this.plugin.settings.blockIdPrefix);
						return;
					}
					this.plugin.settings.blockIdPrefix = value;
					await this.plugin.saveSettings();
				}));

		containerEl.createEl('h3', {text: 'Equation Reference Settings'});

		new Setting(containerEl)
			.setName('Reference trigger')
			.setDesc('Text to type to trigger equation reference suggestions (e.g., "\\ref")')
			.addText(text => text
				.setPlaceholder('\\ref')
				.setValue(this.plugin.settings.refTrigger)
				.onChange(async (value) => {
					if (value.trim().length === 0) {
						text.setValue(this.plugin.settings.refTrigger);
						return;
					}
					this.plugin.settings.refTrigger = value;
					await this.plugin.saveSettings();
				}));
	}
}
