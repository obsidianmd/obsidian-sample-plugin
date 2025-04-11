import { Plugin, TFile, PluginSettingTab, Setting, Modal, Notice } from 'obsidian';

/**
 * Settings interface for the SummarizeThis plugin
 */
interface SummarizeThisPluginSettings {
	serverUrl: string;
}

const DEFAULT_SETTINGS: SummarizeThisPluginSettings = {
	serverUrl: 'http://localhost:11434'
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
    try {
      // Prepare the summary section
      const summaryMarker = "\n\n## Summary\n";
      const updatedContent = content + summaryMarker;
      
      // Add the summary section to the note
      await this.app.vault.modify(file, updatedContent);
      
      const promptToUse = customPrompt || DEFAULT_PROMPT;
      
      // Set up streaming request to Ollama
      const response = await fetch(`${this.settings.serverUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3.2:latest',
          prompt: `${promptToUse}\n\nContext:\n${content}`,
          stream: true
        })
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
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
            console.error("Error parsing JSON from stream:", e);
          }
        }
      }
      
      new Notice("Summary complete");
    } catch (error) {
      console.error("Error streaming summary:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await this.app.vault.modify(
        file, 
        content + "\n\n## Summary\n[Error generating summary: " + errorMessage + "]"
      );
      new Notice("Failed to generate summary: " + errorMessage);
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
          model: 'llama3.2:latest',
          prompt: `${promptToUse}\n\nContext:\n${noteContent}`,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
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

  constructor(app: any, plugin: SummarizeThisPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
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
        }));
  }
}
