import { Plugin, TFile } from 'obsidian';

export default class SummarizeThisPlugin extends Plugin {
  async onload() {
    this.addCommand({
      id: 'summarize-this-note',
      name: 'Summarize This Note',
      callback: () => this.summarizeNote()
    });
  }

  async summarizeNote() {
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      console.warn("No active file.");
      return;
    }

    const content = await this.app.vault.read(file);
    
    // Start streaming the summary directly to the note
    await this.streamSummaryToNote(content, file);
  }
  
  async streamSummaryToNote(content: string, file: TFile): Promise<void> {
    try {
      // Prepare the summary section
      const summaryMarker = "\n\n## Summary\n";
      const updatedContent = content + summaryMarker;
      
      // Add the summary section to the note
      await this.app.vault.modify(file, updatedContent);
      
      // Set up streaming request to Ollama
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3.2:latest',
          prompt: `You are a helpful assistant that summarizes notes. Think step by step to identify the main themes and key information before drafting the summary. Create an overview, key information, and a conclusion.\n\nContext:\n${content}`,
          stream: true
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
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
            console.warn("Error parsing JSON from stream:", e);
          }
        }
      }
      
      console.log("Streaming completed");
    } catch (error) {
      console.error("Error streaming summary:", error);
      // If there was an error, update the note with an error message
      await this.app.vault.modify(file, content + "\n\n## Summary\n[Error generating summary: " + (error.message || "Unknown error") + "]");
    }
  }

  // Kept for compatibility or non-streaming use if needed
  async queryOllama(noteContent: string): Promise<string> {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2:latest',
        prompt: `You are a helpful assistant that summarizes notes. Think step by step to identify the main themes and key information before drafting the summary. Create an overview, key information, and a conclusion.\n\nContext:\n${noteContent}`,
        stream: false
      })
    });

    const data = await response.json();
    return data.response ?? '[No summary returned]';
  }
}
