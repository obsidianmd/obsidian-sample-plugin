import { Plugin, TFile, PluginSettingTab, Setting, Modal, Notice, App, MenuItem } from 'obsidian';

/**
 * Configuration settings for the Summarize This plugin
 * @interface SummarizeThisPluginSettings
 */
interface SummarizeThisPluginSettings {
	/** The URL of the local Ollama server (e.g., http://localhost:11434) */
	serverUrl: string;
	/** The default Ollama model to use for generating summaries (e.g., gpt-oss:latest, llama3.2:latest) */
	defaultModel: string;
}

/**
 * Default settings for the plugin
 * @constant
 */
const DEFAULT_SETTINGS: SummarizeThisPluginSettings = {
	serverUrl: 'http://localhost:11434',
	defaultModel: 'gpt-oss:latest'
};

/**
 * Default prompt template for generating summaries
 * This prompt instructs the LLM to create structured summaries with an overview, key information, and conclusion
 * @constant
 */
const DEFAULT_PROMPT = `You are a helpful assistant that summarizes notes. Think step by step to identify the main themes and key information before drafting the summary. Create an overview, key information, and a conclusion.`;

/**
 * Interface for preset prompt templates
 * @interface PresetPrompt
 */
interface PresetPrompt {
	/** Unique identifier for the preset */
	id: string;
	/** Display label for the preset button */
	label: string;
	/** The actual prompt text to use */
	prompt: string;
	/** Icon/emoji to display on the preset button */
	icon: string;
}

/**
 * Modal dialog for customizing the prompt before generating a summary
 * Provides a rich UI with preset templates, examples, and a custom prompt editor
 * @class PromptModal
 * @extends {Modal}
 */
class PromptModal extends Modal {
  /** Reference to the parent plugin instance */
  private plugin: SummarizeThisPlugin;
  /** The current prompt text being edited */
  private promptText: string;
  /** The content of the note to be summarized */
  private content: string;
  /** The file that will receive the summary */
  private file: TFile;

  /**
   * Creates a new PromptModal instance
   * @param {SummarizeThisPlugin} plugin - The parent plugin instance
   * @param {string} content - The content to be summarized
   * @param {TFile} file - The file where the summary will be appended
   */
  constructor(plugin: SummarizeThisPlugin, content: string, file: TFile) {
    super(plugin.app);
    this.plugin = plugin;
    this.promptText = DEFAULT_PROMPT;
    this.content = content;
    this.file = file;
  }

  /**
   * Called when the modal is opened
   * Builds the entire modal UI including preset buttons, examples, and custom prompt editor
   * @returns {void}
   */
  onOpen(): void {
    const {contentEl} = this;
    contentEl.empty();
    
    // Create modal container
    const modalContainer = contentEl.createDiv({
      attr: {
        style: 'position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center;'
      }
    });
    
    // Create modal card
    const modalCard = modalContainer.createDiv({
      attr: {
        style: 'width: 100%; max-width: 896px; max-height: 85vh; margin: 1rem; background-color: var(--background-primary); border: 1px solid var(--background-modifier-border); border-radius: 12px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); overflow: hidden; display: flex; flex-direction: column;'
      }
    });
    
    // Header
    const header = modalCard.createDiv({
      attr: {
        style: 'display: flex; align-items: center; justify-content: space-between; padding: 1.5rem; border-bottom: 1px solid var(--background-modifier-border); background-color: var(--background-primary-alt);'
      }
    });
    
    const headerContent = header.createDiv({
      attr: {
        style: 'display: flex; align-items: center; gap: 0.75rem;'
      }
    });
    
    const iconContainer = headerContent.createDiv({
      attr: {
        style: 'padding: 0.5rem; border-radius: 0.5rem; background-color: var(--interactive-accent-hover);'
      }
    });
    
    // Sparkles icon (using asterisk as placeholder)
    iconContainer.createEl('span', {
      text: '✨',
      attr: {
        style: 'font-size: 1.5rem;'
      }
    });
    
    const headerText = headerContent.createDiv();
    headerText.createEl('h2', {
      text: 'Customize Summary Prompt',
      attr: {
        style: 'font-size: 1.5rem; font-weight: 900; color: var(--text-normal);'
      }
    });
    
    // Close button
    const closeBtn = header.createEl('button', {
      text: '✕',
      attr: {
        style: 'padding: 0.5rem; border-radius: 9999px; background-color: transparent; border: none; cursor: pointer; font-size: 1.25rem; width: 2.5rem; height: 2.5rem; display: flex; align-items: center; justify-content: center; transition: background-color 0.2s;'
      }
    });
    
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.setAttribute('style', 'padding: 0.5rem; border-radius: 9999px; background-color: var(--background-modifier-hover); border: none; cursor: pointer; font-size: 1.25rem; width: 2.5rem; height: 2.5rem; display: flex; align-items: center; justify-content: center; transition: background-color 0.2s;');
    });
    
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.setAttribute('style', 'padding: 0.5rem; border-radius: 9999px; background-color: transparent; border: none; cursor: pointer; font-size: 1.25rem; width: 2.5rem; height: 2.5rem; display: flex; align-items: center; justify-content: center; transition: background-color 0.2s;');
    });
    
    closeBtn.addEventListener('click', () => {
      this.close();
    });
    
    // Scrollable content area
    const scrollableContent = modalCard.createDiv({
      attr: {
        style: 'flex: 1; overflow-y: auto; padding: 1rem;'
      }
    });
    
    // Description/info block
    const descriptionBlock = scrollableContent.createDiv({
      attr: {
        style: 'margin-bottom: 15px; padding: 0.5rem 0.75rem; border: 1px solid var(--background-modifier-border); border-radius: 0.5rem; background: var(--background-primary-alt);'
      }
    });
    descriptionBlock.createEl('p', {
      text: 'Edit the prompt below that will be sent to the model. This prompt will COMPLETELY REPLACE the default prompt — not combine with it.',
      attr: {
        style: 'margin: 0; font-size: 0.875rem; line-height: 1.5; color: var(--text-normal);'
      }
    });
    
    // Preset templates section
    const presetSection = scrollableContent.createDiv({
      attr: {
        style: 'margin-bottom: 15px;'
      }
    });
    
    presetSection.createEl('h3', {
      text: 'Quick Start Templates',
      attr: {
        style: 'margin-bottom: 10px; font-weight: bold; font-size: 1.2em;'
      }
    });
    
    const presetContainer = presetSection.createDiv({
      attr: {
        style: 'display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; margin-bottom: 15px;'
      }
    });
    
    // Preset prompt templates with icons
    const presetPrompts: PresetPrompt[] = [
      {
        id: "default",
        label: "Default Summary",
        prompt: DEFAULT_PROMPT,
        icon: "📝"
      },
      {
        id: "extract",
        label: "Extract Tasks",
        prompt: "You are a task extraction tool. Your ONLY job is to identify and list all tasks, todos, and action items from the provided text. Format each task as a bullet point. Do NOT include any explanations, summaries, or non-task content.",
        icon: "✅"
      },
      {
        id: "keypoints",
        label: "Key Points",
        prompt: "Extract only the key points and important facts from the text. Present them as a bulleted list with no additional commentary.",
        icon: "🔑"
      },
      {
        id: "simplify",
        label: "Simplify",
        prompt: "Simplify this text to make it easy to understand. Use plain language and short sentences.",
        icon: "✨"
      }
    ];
    
    /**
     * Creates a preset button element with hover and click functionality
     * @param {PresetPrompt} preset - The preset configuration object
     * @returns {HTMLButtonElement} The created button element
     */
    const createPresetButton = (preset: PresetPrompt): HTMLButtonElement => {
      const btn = presetContainer.createEl('button', {
        attr: {
          style: 'display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 0.75rem; border: 1px solid var(--background-modifier-border); border-radius: 0.5rem; background: var(--background-primary-alt); cursor: pointer; text-align: center; transition: all 0.2s ease; font-size: 0.7rem; height: auto;'
        }
      });
      
      // Add icon
      btn.createEl('span', {
        text: preset.icon,
        attr: {
          style: 'font-size: 1rem;'
        }
      });
      
      // Add label
      btn.createEl('span', {
        text: preset.label,
        attr: {
          style: 'font-size: 0.75rem; font-weight: 500;'
        }
      });
      
      btn.addEventListener('mouseenter', () => {
        btn.setAttribute('style', 'display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 0.75rem; border: 1px solid var(--background-modifier-border-hover); border-radius: 0.5rem; background: var(--background-modifier-hover); cursor: pointer; text-align: center; transition: all 0.2s ease; font-size: 0.7rem; height: auto; transform: scale(1.05);');
      });
      
      btn.addEventListener('mouseleave', () => {
        btn.setAttribute('style', 'display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 0.75rem; border: 1px solid var(--background-modifier-border); border-radius: 0.5rem; background: var(--background-primary-alt); cursor: pointer; text-align: center; transition: all 0.2s ease; font-size: 0.7rem; height: auto;');
      });
      
      btn.addEventListener('click', () => {
        promptTextArea.value = preset.prompt;
        this.promptText = preset.prompt;
        
        // Update button styles to show selection
        presetContainer.querySelectorAll('button').forEach(b => {
          b.setAttribute('style', 'display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 0.75rem; border: 1px solid var(--background-modifier-border); border-radius: 0.5rem; background: var(--background-primary-alt); cursor: pointer; text-align: center; transition: all 0.2s ease; font-size: 0.7rem; height: auto;');
        });
        btn.setAttribute('style', 'display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 0.75rem; border: 1px solid var(--interactive-accent); border-radius: 0.5rem; background: var(--interactive-accent); color: white; cursor: pointer; text-align: center; transition: all 0.2s ease; font-size: 0.7rem; height: auto;');
        
        // Clear example selection if any
        const baseExampleStyle = 'display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.75rem; margin-bottom: 0.5rem; border: 1px solid var(--background-modifier-border); border-radius: 0.5rem; background: var(--background-primary-alt); cursor: pointer; transition: all 0.2s ease;';
        examplesContainer?.querySelectorAll('[data-example-item="true"]').forEach((el) => {
          (el as HTMLElement).setAttribute('data-selected', 'false');
          (el as HTMLElement).setAttribute('style', baseExampleStyle);
        });
        
        // Update character count
        charCount.textContent = `${preset.prompt.length} characters`;
      });
      
      return btn;
    };
    
    // Create preset buttons
    const presetButtons: Record<string, HTMLButtonElement> = {};
    presetPrompts.forEach(preset => {
      const btn = createPresetButton(preset);
      presetButtons[preset.id] = btn;
    });
    // Mark default preset as selected initially
    const defaultBtn = presetButtons['default'];
    if (defaultBtn) {
      defaultBtn.setAttribute('style', 'display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 1rem; border: 1px solid var(--interactive-accent); border-radius: 0.5rem; background: var(--interactive-accent); color: white; cursor: pointer; text-align: center; transition: all 0.2s ease; font-size: 0.75rem; height: auto;');
    }
    
    // Examples section
    const examplesSection = scrollableContent.createDiv({
      attr: {
        style: 'margin-bottom: 15px;'
      }
    });

    // Create header with toggle button
    const examplesHeader = examplesSection.createDiv({
      attr: {
        style: 'display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;'
      }
    });

    examplesHeader.createEl('h3', {
      text: 'Examples of effective prompts:',
      attr: {
        style: 'margin: 0; font-weight: bold; font-size: 1.2em;'
      }
    });

    const toggleButton = examplesHeader.createEl('button', {
      text: '▼',
      attr: {
        style: 'background: none; border: none; cursor: pointer; font-size: 1rem; color: var(--text-muted);'
      }
    });

    const examplePrompts = [
      "Extract and list ONLY the tasks mentioned in this note. Format as bullet points.",
      "Identify the main topics and provide a 3-sentence summary for each.",
      "Create a timeline of events mentioned in this document."
    ];

    const examplesContainer = examplesSection.createDiv({
      attr: {
        style: 'margin-bottom: 15px;'
      }
    });

    // Add examples
    examplePrompts.forEach((example, _index) => {
      const exampleItem = examplesContainer.createDiv({
        attr: {
          style: 'display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.5rem; margin-bottom: 0.25rem; border: 1px solid var(--background-modifier-border); border-radius: 0.5rem; background: var(--background-primary-alt); cursor: pointer; transition: all 0.2s ease;',
          'data-example-item': 'true'
        }
      });

      // Dot indicator
      const dotIndicator = exampleItem.createDiv({
        attr: {
          style: 'width: 0.5rem; height: 0.5rem; border-radius: 9999px; background-color: var(--interactive-accent); margin-top: 0.5rem; transition: background-color 0.2s;'
        }
      });

      const exampleText = exampleItem.createEl('p', {
        text: example,
        attr: {
          style: 'margin: 0; font-size: 0.875rem; line-height: 1.5; color: var(--text-muted); transition: color 0.2s;'
        }
      });

      exampleItem.addEventListener('mouseenter', () => {
        if (exampleItem.getAttribute('data-selected') === 'true') return;
        exampleItem.setAttribute('style', 'display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.5rem; margin-bottom: 0.25rem; border: 1px solid var(--background-modifier-border-hover); border-radius: 0.5rem; background: var(--background-modifier-hover); cursor: pointer; transition: all 0.2s ease;');
        dotIndicator.setAttribute('style', 'width: 0.5rem; height: 0.5rem; border-radius: 9999px; background-color: var(--text-normal); margin-top: 0.5rem; transition: background-color 0.2s;');
        exampleText.setAttribute('style', 'margin: 0; font-size: 0.875rem; line-height: 1.5; color: var(--text-normal); transition: color 0.2s;');
      });

      exampleItem.addEventListener('mouseleave', () => {
        if (exampleItem.getAttribute('data-selected') === 'true') return;
        exampleItem.setAttribute('style', 'display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.5rem; margin-bottom: 0.25rem; border: 1px solid var(--background-modifier-border); border-radius: 0.5rem; background: var(--background-primary-alt); cursor: pointer; transition: all 0.2s ease;');
        dotIndicator.setAttribute('style', 'width: 0.5rem; height: 0.5rem; border-radius: 9999px; background-color: var(--interactive-accent); margin-top: 0.5rem; transition: background-color 0.2s;');
        exampleText.setAttribute('style', 'margin: 0; font-size: 0.875rem; line-height: 1.5; color: var(--text-muted); transition: color 0.2s;');
      });

      exampleItem.addEventListener('click', () => {
        promptTextArea.value = example;
        this.promptText = example;
        
        // Update preset button styles to clear selection
        presetContainer.querySelectorAll('button').forEach(b => {
          b.setAttribute('style', 'display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 1rem; border: 1px solid var(--background-modifier-border); border-radius: 0.5rem; background: var(--background-primary-alt); cursor: pointer; text-align: center; transition: all 0.2s ease; font-size: 0.75rem; height: auto;');
        });
        
        // Mark selected example and reset others
        const baseExampleStyle = 'display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.5rem; margin-bottom: 0.25rem; border: 1px solid var(--background-modifier-border); border-radius: 0.5rem; background: var(--background-primary-alt); cursor: pointer; transition: all 0.2s ease;';
        const selectedExampleStyle = 'display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.5rem; margin-bottom: 0.25rem; border: 1px solid var(--interactive-accent); border-radius: 0.5rem; background: var(--background-modifier-hover); cursor: pointer; transition: all 0.2s ease;';
        examplesContainer.querySelectorAll('[data-example-item="true"]').forEach((el) => {
          (el as HTMLElement).setAttribute('data-selected', 'false');
          (el as HTMLElement).setAttribute('style', baseExampleStyle);
        });
        exampleItem.setAttribute('data-selected', 'true');
        exampleItem.setAttribute('style', selectedExampleStyle);
        dotIndicator.setAttribute('style', 'width: 0.5rem; height: 0.5rem; border-radius: 9999px; background-color: var(--text-normal); margin-top: 0.5rem; transition: background-color 0.2s;');
        exampleText.setAttribute('style', 'margin: 0; font-size: 0.875rem; line-height: 1.5; color: var(--text-normal); transition: color 0.2s;');
        
        // Update character count
        charCount.textContent = `${example.length} characters`;
      });
    });

    // Toggle examples visibility
    let examplesVisible = true;
    toggleButton.addEventListener('click', () => {
      examplesVisible = !examplesVisible;
      examplesContainer.style.display = examplesVisible ? 'block' : 'none';
      toggleButton.textContent = examplesVisible ? '▼' : '▶';
      
      // Adjust modal height when examples are toggled
      const newMaxHeight = examplesVisible ? '85vh' : '75vh';
      modalCard.setAttribute('style', `width: 100%; max-width: 896px; max-height: ${newMaxHeight}; margin: 1rem; background-color: var(--background-primary); border: 1px solid var(--background-modifier-border); border-radius: 12px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); overflow: hidden; display: flex; flex-direction: column;`);
    });
    
    // Custom prompt input
    const promptSection = scrollableContent.createDiv({
      attr: {
        style: 'margin-bottom: 15px;'
      }
    });
    
    promptSection.createEl('h3', {
      text: 'Your Custom Prompt',
      attr: {
        style: 'margin-bottom: 10px; font-weight: bold; font-size: 1.2em;'
      }
    });
    
    const promptTextArea = promptSection.createEl('textarea', {
      attr: {
        style: 'width: 100%; height: 5rem; padding: 1rem; border: 1px solid var(--background-modifier-border); border-radius: 0.5rem; background: var(--background-modifier-form-field); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; resize: none; font-size: 0.875rem; line-height: 1.5; transition: all 0.2s;',
        placeholder: 'e.g. Summarize this document in 100 words or less, focusing on key decisions and action items.'
      }
    });
    promptTextArea.value = this.promptText;
    promptTextArea.addEventListener('focus', () => {
      promptTextArea.setAttribute('style', 'width: 100%; height: 5rem; padding: 1rem; border: 1px solid var(--interactive-accent); border-radius: 0.5rem; background: var(--background-modifier-form-field); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; resize: none; font-size: 0.875rem; line-height: 1.5; transition: all 0.2s; box-shadow: 0 0 0 3px var(--interactive-accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--interactive-accent) 25%, transparent);');
    });
    promptTextArea.addEventListener('blur', () => {
      promptTextArea.setAttribute('style', 'width: 100%; height: 5rem; padding: 1rem; border: 1px solid var(--background-modifier-border); border-radius: 0.5rem; background: var(--background-modifier-form-field); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; resize: none; font-size: 0.875rem; line-height: 1.5; transition: all 0.2s;');
    });
    promptTextArea.addEventListener('input', () => {
      this.promptText = promptTextArea.value;
      
      // Update preset button styles to clear selection
      presetContainer.querySelectorAll('button').forEach(b => {
        b.setAttribute('style', 'display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 1rem; border: 1px solid var(--background-modifier-border); border-radius: 0.5rem; background: var(--background-primary-alt); cursor: pointer; text-align: center; transition: all 0.2s ease; font-size: 0.75rem; height: auto;');
      });
      
      // Update character count
      charCount.textContent = `${promptTextArea.value.length} characters`;
    });
    
    // Character count
    const charCount = promptSection.createEl('div', {
      text: `${this.promptText.length} characters`,
      attr: {
        style: 'margin-top: 0.5rem; font-size: 0.75rem; color: var(--text-muted); display: block; text-align: right;'
      }
    });
    
    // Button container
    const buttonContainer = modalCard.createDiv({
      attr: {
        style: 'display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px; padding: 1.5rem; border-top: 1px solid var(--background-modifier-border); flex-shrink: 0;'
      }
    });
    
    // Cancel button
    const cancelButton = buttonContainer.createEl('button', {
      text: 'Cancel',
      attr: {
        style: 'padding: 0.625rem 2rem; border: 1px solid var(--background-modifier-border); border-radius: 0.375rem; background: transparent; cursor: pointer; font-size: 0.875rem; font-weight: 500; transition: all 0.2s;'
      }
    });
    cancelButton.addEventListener('mouseenter', () => {
      cancelButton.setAttribute('style', 'padding: 0.625rem 2rem; border: 1px solid var(--background-modifier-border-hover); border-radius: 0.375rem; background: var(--background-modifier-hover); cursor: pointer; font-size: 0.875rem; font-weight: 500; transition: all 0.2s;');
    });
    cancelButton.addEventListener('mouseleave', () => {
      cancelButton.setAttribute('style', 'padding: 0.625rem 2rem; border: 1px solid var(--background-modifier-border); border-radius: 0.375rem; background: transparent; cursor: pointer; font-size: 0.875rem; font-weight: 500; transition: all 0.2s;');
    });
    cancelButton.addEventListener('click', () => {
      this.close();
    });
    
    // Submit button
    const submitButton = buttonContainer.createEl('button', {
      attr: {
        style: 'display: flex; align-items: center; gap: 0.5rem; padding: 0.625rem 2rem; border: 1px solid var(--interactive-accent); border-radius: 0.375rem; background: var(--interactive-accent); color: white; cursor: pointer; font-size: 0.875rem; font-weight: 500; transition: all 0.2s; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);'
      }
    });
    
    // Add sparkles icon to submit button
    submitButton.createEl('span', {
      text: '✨',
      attr: {
        style: 'font-size: 1rem;'
      }
    });
    
    submitButton.createEl('span', {
      text: 'Generate Summary'
    });
    
    submitButton.addEventListener('mouseenter', () => {
      submitButton.setAttribute('style', 'display: flex; align-items: center; gap: 0.5rem; padding: 0.625rem 2rem; border: 1px solid var(--interactive-accent-hover); border-radius: 0.375rem; background: var(--interactive-accent-hover); color: white; cursor: pointer; font-size: 0.875rem; font-weight: 500; transition: all 0.2s; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);');
    });
    
    submitButton.addEventListener('mouseleave', () => {
      submitButton.setAttribute('style', 'display: flex; align-items: center; gap: 0.5rem; padding: 0.625rem 2rem; border: 1px solid var(--interactive-accent); border-radius: 0.375rem; background: var(--interactive-accent); color: white; cursor: pointer; font-size: 0.875rem; font-weight: 500; transition: all 0.2s; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);');
    });
    
    submitButton.addEventListener('click', async () => {
      new Notice('Generating summary...');
      this.close();
      await this.plugin.streamSummaryToNote(this.content, this.file, this.promptText);
    });
  }
}

/**
 * Main plugin class for Summarize This
 * Provides functionality to generate AI-powered summaries of notes using a local Ollama LLM server
 * @class SummarizeThisPlugin
 * @extends {Plugin}
 */
export default class SummarizeThisPlugin extends Plugin {
  /** Plugin settings instance */
  settings!: SummarizeThisPluginSettings;

  /**
   * Called when the plugin is loaded
   * Initializes settings, registers commands, and sets up the UI
   * @returns {Promise<void>}
   */
  async onload(): Promise<void> {
    await this.loadSettings();
    
    // Register the command to summarize the current note
    this.addCommand({
      id: 'summarize-this-note',
      name: 'Summarize This Note',
      callback: () => this.summarizeNote()
    });
    
    // Add editor context menu
    this.registerEvent(
      this.app.workspace.on('editor-menu', (menu, _editor) => {
        menu.addItem((item: MenuItem) => {
          item
            .setTitle('Summarize This Note')
            .setIcon('list-ordered')
            .onClick(() => this.summarizeNote());
        });
      })
    );
    
    // Add styles for model selection
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      .models-list-items {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      
      .model-item {
        padding: 6px 10px;
        margin: 2px 0;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.15s ease;
      }
      
      .model-item:hover {
        background-color: var(--background-modifier-hover);
      }
      
      .model-item-selected {
        background-color: var(--interactive-accent);
        color: var(--text-on-accent);
      }
      
      .model-item-selected:hover {
        background-color: var(--interactive-accent-hover);
      }
      
      .error-text {
        color: var(--text-error);
      }
    `;
    document.head.appendChild(styleEl);
    
    this.register(() => styleEl.remove());
    
    this.addSettingTab(new SummarizeThisPluginSettingTab(this.app, this));
  }

  /**
   * Loads saved plugin settings from disk or initializes with defaults
   * Merges saved settings with DEFAULT_SETTINGS to ensure all required properties exist
   * @returns {Promise<void>}
   */
  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  /**
   * Persists current plugin settings to disk
   * @returns {Promise<void>}
   */
  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  /**
   * Initiates the note summarization process
   * Retrieves the active file, reads its content, and opens the prompt customization modal
   * Shows an error if no file is currently active
   * @returns {Promise<void>}
   */
  async summarizeNote(): Promise<void> {
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      new Notice("No active file to summarize");
      return;
    }

    const content = await this.app.vault.read(file);
    
    try {
      new Notice("Opening prompt customization...");
      const modal = new PromptModal(this, content, file);
      modal.open();
    } catch (error) {
      console.error("Error opening modal:", error);
      new Notice("Error opening modal. Check console for details.");
    }
  }
  
  /**
   * Streams a summary from the LLM to the note using Ollama's streaming API
   * Displays a persistent notice with a cancel button during generation
   * Updates the note in real-time as tokens are received from the LLM
   * Handles errors gracefully and allows user cancellation
   *
   * @param {string} content - The note content to summarize
   * @param {TFile} file - The Obsidian file to append the summary to
   * @param {string} [customPrompt] - Optional custom prompt to override DEFAULT_PROMPT
   * @returns {Promise<void>}
   * @throws {Error} If the API request fails or streaming encounters an error
   */
  async streamSummaryToNote(content: string, file: TFile, customPrompt?: string): Promise<void> {
    // Flag to track if generation has been canceled
    let isCanceled = false;
    
    try {
      // Create notice with proper DOM elements
      const loadingNotice = new Notice("", 0);
      
      // Create container for notice content
      const noticeContent = document.createElement('div');
      
      // Create text and cancel button container
      const textContainer = document.createElement('div');
      textContainer.textContent = "Generating summary... ";
      
      // Create cancel button
      const cancelLink = document.createElement('a');
      cancelLink.textContent = "Cancel";
      cancelLink.href = "#";
      cancelLink.className = "cancel-generation";
      cancelLink.addEventListener('click', () => {
        isCanceled = true;
        loadingNotice.hide();
        new Notice("Summary generation canceled");
      });
      textContainer.appendChild(cancelLink);
      
      // Add all elements to notice content
      noticeContent.appendChild(textContainer);
      
      // Replace the notice content with our DOM structure
      loadingNotice.noticeEl.empty();
      loadingNotice.noticeEl.appendChild(noticeContent);
      
      // Prepare the summary section
      const summaryMarker = "\n\n## Summary\n";
      const updatedContent = content + summaryMarker;
      
      // Add the summary section to the note
      await this.app.vault.modify(file, updatedContent);
      
      const promptToUse = customPrompt || DEFAULT_PROMPT;
      
      // Set up streaming request to Ollama
      const controller = new AbortController();
      const signal = controller.signal;
      
      const response = await fetch(`${this.settings.serverUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.settings.defaultModel,
          prompt: `${promptToUse}\n\nContext:\n${content}`,
          stream: true
        }),
        signal
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status} - ${await response.text()}`);
      }
      
      // Process the stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Failed to get stream reader");
      }
      
      let fullText = '';
      const decoder = new TextDecoder();
      
      let streaming = true;
      while (streaming) {
        // Check if canceled
        if (isCanceled) {
          controller.abort();
          reader.cancel("User canceled the operation");
          await this.app.vault.modify(file, content + summaryMarker + fullText + "\n\n[Summary generation canceled by user]");
          return;
        }
        
        const { done, value } = await reader.read();
        if (done) {
          streaming = false;
          break;
        }
        
        // Decode the chunk
        const chunk = decoder.decode(value, { stream: true });
        
        // Parse JSON response (each line is a JSON object)
        const lines = chunk.split('\n').filter(line => line.trim() !== '');
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.response) {
              fullText += data.response;
              // Update the note with the latest content
              await this.app.vault.modify(file, content + summaryMarker + fullText);
            }
          } catch (e) {
            console.error("Error parsing JSON from stream:", e, "Raw line:", line);
          }
        }
      }
      
      // Close the loading notice
      loadingNotice.hide();
      new Notice("Summary complete");
    } catch (error) {
      if (isCanceled) return; // Don't show error for canceled operations
      
      console.error("Error streaming summary:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await this.app.vault.modify(
        file, 
        content + "\n\n## Summary\n[Error generating summary: " + errorMessage + "]"
      );
      new Notice("Failed to generate summary: " + errorMessage, 10000);
    }
  }

  /**
   * Non-streaming version of the Ollama API query
   * Sends a complete request and waits for the full response
   * Useful for simple implementations that don't need real-time streaming
   *
   * @param {string} noteContent - The note content to send to the LLM
   * @param {string} [customPrompt] - Optional custom prompt to override DEFAULT_PROMPT
   * @returns {Promise<string>} The complete model response text, or an error message if the request fails
   */
  async queryOllama(noteContent: string, customPrompt?: string): Promise<string> {
    const promptToUse = customPrompt || DEFAULT_PROMPT;
    
    try {
      const response = await fetch(`${this.settings.serverUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.settings.defaultModel,
          prompt: `${promptToUse}\n\nContext:\n${noteContent}`,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status} - ${await response.text()}`);
      }

      const data = await response.json();
      return data.response ?? '[No summary returned]';
    } catch (error) {
      console.error("Error querying Ollama:", error);
      return `[Error: ${error instanceof Error ? error.message : "Unknown error"}]`;
    }
  }
}

/**
 * Settings tab for configuring the Summarize This plugin
 * Provides UI for server URL configuration, model selection, and connection testing
 * @class SummarizeThisPluginSettingTab
 * @extends {PluginSettingTab}
 */
class SummarizeThisPluginSettingTab extends PluginSettingTab {
  /** Reference to the parent plugin instance */
  plugin: SummarizeThisPlugin;
  /** Cached list of available models from the Ollama server */
  private modelsList: string[] = [];

  /**
   * Creates a new settings tab instance
   * @param {App} app - The Obsidian app instance
   * @param {SummarizeThisPlugin} plugin - The parent plugin instance
   */
  constructor(app: App, plugin: SummarizeThisPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  /**
   * Renders the settings UI
   * Creates input fields for server URL, default model, and a button to fetch available models
   * @returns {Promise<void>}
   */
  async display(): Promise<void> {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('Local Server URL')
      .setDesc('The URL of your local Ollama server')
      .addText(text => text
        .setPlaceholder('http://localhost:11434')
        .setValue(this.plugin.settings.serverUrl)
        .onChange(async (value) => {
          this.plugin.settings.serverUrl = value.trim();
          await this.plugin.saveSettings();
        }))
      .addButton(button => button
        .setIcon('checkmark')
        .setTooltip('Test connection')
        .onClick(async () => {
          button.setDisabled(true);
          button.setIcon('loader');
          
          try {
            const response = await fetch(`${this.plugin.settings.serverUrl}/api/version`, {
              method: 'GET',
              cache: 'no-store'
            });
            
            if (response.ok) {
              const data = await response.json();
              new Notice(`Connected successfully to Ollama ${data.version}`);
            } else {
              new Notice(`Connection failed: ${response.status} - ${response.statusText}`);
            }
          } catch (error) {
            new Notice(`Connection failed: ${error instanceof Error ? error.message : String(error)}`);
          } finally {
            button.setDisabled(false);
            button.setIcon('checkmark');
          }
        }));

    new Setting(containerEl)
      .setName('Default Model')
      .setDesc('The default Ollama model to use for summaries')
      .addText(text => text
        .setPlaceholder('llama3.2:latest')
        .setValue(this.plugin.settings.defaultModel)
        .onChange(async (value) => {
          this.plugin.settings.defaultModel = value.trim();
          await this.plugin.saveSettings();
        }));
        
    new Setting(containerEl)
      .setName('Available Models')
      .setDesc('Fetch available models from your Ollama server')
      .addButton(button => button
        .setButtonText('Refresh Models')
        .onClick(async () => {
          button.setButtonText('Refreshing...');
          button.setDisabled(true);
          await this.refreshModelsList();
          button.setButtonText('Refresh Models');
          button.setDisabled(false);
        }));
        
    // Create a container for the models list
    const modelsContainer = containerEl.createDiv();
    modelsContainer.addClass('models-list');
    modelsContainer.style.marginTop = '10px';
    
    // Try to fetch models on initial load
    this.refreshModelsList(modelsContainer);
  }

  /**
   * Fetches the list of available models from the Ollama server
   * Updates the UI with clickable model items that can be selected as the default
   * Handles errors gracefully and displays appropriate messages
   *
   * @param {HTMLDivElement} [container] - Optional container element to render models into
   * @returns {Promise<void>}
   */
  async refreshModelsList(container?: HTMLDivElement): Promise<void> {
    try {
      const modelsContainer = container || document.querySelector('.models-list');
      if (!modelsContainer) return;
      
      modelsContainer.empty();
      modelsContainer.createEl('p', {text: 'Fetching available models...', cls: 'loading-text'});
      
      const response = await fetch(`${this.plugin.settings.serverUrl}/api/tags`, {
        method: 'GET'
      });
      
      modelsContainer.empty();
      
      if (!response.ok) {
        modelsContainer.createEl('p', {text: `Error: ${response.status} - ${response.statusText}`, cls: 'error-text'});
        return;
      }
      
      const data = await response.json();
      this.modelsList = (data as { models?: Array<{ name: string }> }).models?.map((model) => model.name) || [];
      
      if (this.modelsList.length === 0) {
        modelsContainer.createEl('p', {text: 'No models found. Please install models through Ollama.'});
        return;
      }
      
      modelsContainer.createEl('p', {text: 'Click a model to set as default:', cls: 'models-header'});
      
      const modelListEl = modelsContainer.createEl('ul');
      modelListEl.addClass('models-list-items');
      
      this.modelsList.forEach(modelName => {
        const modelItem = modelListEl.createEl('li');
        
        modelItem.addClass('model-item');
        if (modelName === this.plugin.settings.defaultModel) {
          modelItem.addClass('model-item-selected');
        }
        
        modelItem.createEl('span', {text: modelName});
        
        modelItem.addEventListener('click', async () => {
          this.plugin.settings.defaultModel = modelName;
          await this.plugin.saveSettings();
          
          // Update UI to show selected model
          document.querySelectorAll('.model-item').forEach(el => el.removeClass('model-item-selected'));
          modelItem.addClass('model-item-selected');
          
          new Notice(`Default model set to: ${modelName}`);
        });
      });
    } catch (error) {
      const modelsContainer = container || document.querySelector('.models-list');
      if (modelsContainer) {
        modelsContainer.empty();
        modelsContainer.createEl('p', {
          text: `Error fetching models: ${error instanceof Error ? error.message : String(error)}`,
          cls: 'error-text'
        });
      }
      console.error("Error fetching models:", error);
    }
  }
}
