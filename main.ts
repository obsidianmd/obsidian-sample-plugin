import { Plugin, TFile, PluginSettingTab, Setting, Modal, Notice } from 'obsidian';

/**
 * Settings interface for the SummarizeThis plugin
 */
interface SummarizeThisPluginSettings {
	serverUrl: string;
	defaultModel: string;
}

const DEFAULT_SETTINGS: SummarizeThisPluginSettings = {
	serverUrl: 'http://localhost:11434',
	defaultModel: 'qwen3:8b'
};

/**
 * Default prompt template for generating summaries
 */
const DEFAULT_PROMPT = `You are a helpful assistant that summarizes notes. Think step by step to identify the main themes and key information before drafting the summary. Create an overview, key information, and a conclusion.`;

/**
 * Modal for customizing the prompt before generating a summary
 */
class PromptModal extends Modal {
  private plugin: SummarizeThisPlugin;
  private promptText: string;
  private content: string;
  private file: TFile;
  
  constructor(plugin: SummarizeThisPlugin, content: string, file: TFile) {
    super(plugin.app);
    this.plugin = plugin;
    this.promptText = DEFAULT_PROMPT;
    this.content = content;
    this.file = file;
  }
  
  onOpen() {
    const {contentEl} = this;
    
    contentEl.createEl('h2', {text: 'Customize Summary Prompt'});
    
    contentEl.createEl('p', {
      text: 'Edit the prompt below that will be sent to the model. This prompt will COMPLETELY REPLACE the default prompt - not combine with it.'
    });
    
    // Add preset buttons for common use cases
    const presetContainer = contentEl.createEl('div', {
      attr: {
        style: 'display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 15px;'
      }
    });
    
    const createPresetButton = (text: string, prompt: string) => {
      const btn = presetContainer.createEl('button', {text: text});
      btn.addEventListener('click', () => {
        promptTextArea.value = prompt;
        this.promptText = prompt;
      });
      return btn;
    };
    
    createPresetButton('Default Summary', DEFAULT_PROMPT);
    createPresetButton('Extract Tasks', 'You are a task extraction tool. Your ONLY job is to identify and list all tasks, todos, and action items from the provided text. Format each task as a bullet point. Do NOT include any explanations, summaries, or non-task content.');
    createPresetButton('Key Points', 'Extract only the key points and important facts from the text. Present them as a bulleted list with no additional commentary.');
    createPresetButton('Simplify', 'Simplify this text to make it easy to understand. Use plain language and short sentences.');
    
    // Example prompts section
    contentEl.createEl('p', {
      text: 'Examples of effective prompts:',
      attr: {style: 'margin-bottom: 5px; font-weight: bold;'}
    });
    
    const examplesList = contentEl.createEl('ul');
    [
      "Extract and list ONLY the tasks mentioned in this note. Format as bullet points.",
      "Identify the main topics and provide a 3-sentence summary for each.",
      "Create a timeline of events mentioned in this document."
    ].forEach(example => {
      examplesList.createEl('li', {text: example});
    });
    
    const promptTextArea = contentEl.createEl('textarea', {
      attr: {
        style: 'width: 100%; height: 200px; font-family: monospace;'
      }
    });
    promptTextArea.value = this.promptText;
    promptTextArea.addEventListener('input', () => {
      this.promptText = promptTextArea.value;
    });
    
    const buttonContainer = contentEl.createEl('div', {
      attr: {
        style: 'display: flex; justify-content: flex-end; gap: 10px; margin-top: 15px;'
      }
    });
    
    // Cancel button
    const cancelButton = buttonContainer.createEl('button', {text: 'Cancel'});
    cancelButton.addEventListener('click', () => {
      this.close();
    });
    
    // Submit button
    const submitButton = buttonContainer.createEl('button', {
      text: 'Generate Summary',
      cls: 'mod-cta'
    });
    submitButton.addEventListener('click', () => {
      this.plugin.streamSummaryToNote(
        this.content, 
        this.file,
        this.promptText
      );
      this.close();
    });
  }
  
  onClose() {
    const {contentEl} = this;
    contentEl.empty();
  }
}

/**
 * SummarizeThis plugin for Obsidian
 * Enables users to generate summaries of their notes using Ollama LLM
 */
export default class SummarizeThisPlugin extends Plugin {
  settings: SummarizeThisPluginSettings;

  async onload() {
    await this.loadSettings();
    
    // Register the command to summarize the current note
    this.addCommand({
      id: 'summarize-this-note',
      name: 'Summarize This Note',
      callback: () => this.summarizeNote()
    });
    
    // Add editor context menu
    this.registerEvent(
      this.app.workspace.on('editor-menu', (menu, editor) => {
        menu.addItem((item) => {
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
   * Loads saved plugin settings or uses defaults
   */
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  /**
   * Saves current plugin settings
   */
  async saveSettings() {
    await this.saveData(this.settings);
  }

  /**
   * Initiates the note summarization process
   * Gets the active file and opens the prompt customization modal
   */
  async summarizeNote() {
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
   * 
   * @param content - The content to summarize
   * @param file - The file to append the summary to
   * @param customPrompt - Optional custom prompt to override default
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
   * Non-streaming version of the Ollama query for simpler implementations
   * 
   * @param noteContent - The content to send to the LLM
   * @param customPrompt - Optional custom prompt to override default
   * @returns The model's response text
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
 * Settings tab for configuring the SummarizeThis plugin
 */
class SummarizeThisPluginSettingTab extends PluginSettingTab {
  plugin: SummarizeThisPlugin;
  private modelsList: string[] = [];

  constructor(app: any, plugin: SummarizeThisPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

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
        
    const refreshButton = new Setting(containerEl)
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
      this.modelsList = data.models?.map((model: any) => model.name) || [];
      
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
