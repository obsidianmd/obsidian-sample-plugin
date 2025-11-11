import {
	App,
	Plugin,
	PluginSettingTab,
	Setting,
	MarkdownPostProcessorContext,
	TFile,
	CachedMetadata
} from 'obsidian';

interface MathReferencerSettings {
	enableAutoNumbering: boolean;
	startNumberingFrom: number;
	numberingFormat: string; // e.g., "(1)", "[1]", "Eq. 1"
}

const DEFAULT_SETTINGS: MathReferencerSettings = {
	enableAutoNumbering: true,
	startNumberingFrom: 1,
	numberingFormat: '(${num})'
}

interface EquationInfo {
	filePath: string;
	blockId: string | null;
	equationNumber: number;
	content: string;
	lineNumber: number;
}

interface FileCache {
	equations: EquationInfo[];
	contentHash: string;
	mtime: number;
}

export default class MathReferencerPlugin extends Plugin {
	settings: MathReferencerSettings;
	private fileCache: Map<string, FileCache> = new Map();
	private blockIdToEquation: Map<string, Map<string, EquationInfo>> = new Map();
	private updateInProgress: Set<string> = new Set();

	async onload() {
		await this.loadSettings();

		// Register markdown post-processor for equation numbering
		this.registerMarkdownPostProcessor(
			this.processEquations.bind(this),
			-100 // Run early to process before other processors
		);

		// Register markdown post-processor for block references
		this.registerMarkdownPostProcessor(
			this.processBlockReferences.bind(this),
			100 // Run later to process after equations are numbered
		);

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

				// Verify this math block matches the equation content
				// by comparing LaTeX content
				const mathContent = this.extractMathContent(mathEl);
				if (mathContent && !this.contentMatches(mathContent, equation.content)) {
					// Content mismatch, skip this one
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
	 * Extract math content from a rendered math element
	 */
	private extractMathContent(mathEl: HTMLElement): string | null {
		// Try to find MathJax content
		const mjxContainer = mathEl.querySelector('mjx-container');
		if (mjxContainer) {
			// Get the data-mjx-texclass or look for script tag
			const scriptTag = mjxContainer.querySelector('script[type="math/tex"]');
			if (scriptTag) {
				return scriptTag.textContent?.trim() || null;
			}
		}

		// Fallback: try to get text content
		const textContent = mathEl.textContent?.trim();
		return textContent || null;
	}

	/**
	 * Check if two math contents match (allowing for whitespace differences)
	 */
	private contentMatches(content1: string, content2: string): boolean {
		// Normalize whitespace for comparison
		const normalize = (str: string) => str.replace(/\s+/g, ' ').trim();
		return normalize(content1) === normalize(content2);
	}

	/**
	 * Process block references to equations
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
				await this.renderEquationReference(embedEl, equation, targetFile);
			}
		}
	}

	/**
	 * Render an equation reference
	 */
	private async renderEquationReference(
		element: HTMLElement,
		equation: EquationInfo,
		file: TFile
	) {
		// Create a container for the referenced equation
		const container = document.createElement('div');
		container.className = 'equation-reference';

		// Create a math block for the referenced equation
		const mathDiv = document.createElement('div');
		mathDiv.className = 'math math-block is-loaded';

		// Wrap the LaTeX content in display math delimiters for MathJax
		const latexContent = `\\[${equation.content}\\]`;
		mathDiv.textContent = latexContent;

		// Add equation number
		const numberSpan = document.createElement('span');
		numberSpan.className = 'equation-number';
		numberSpan.textContent = this.formatEquationNumber(equation.equationNumber);

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

				// Check if next line has block ID (must be on its own line)
				let blockId: string | null = null;
				if (i + 1 < lines.length) {
					const nextLine = lines[i + 1];
					const blockIdMatch = nextLine.match(/^\^([a-zA-Z0-9-_]+)\s*$/);
					if (blockIdMatch) {
						blockId = blockIdMatch[1];
					}
				}

				equations.push({
					filePath: filePath,
					blockId: blockId,
					equationNumber: equationNumber++,
					content: equationContent.trim(),
					lineNumber: equationStartLine
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
	 * Format equation number according to settings
	 */
	private formatEquationNumber(num: number): string {
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
	}
}
