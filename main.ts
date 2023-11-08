import {
	MarkdownPostProcessorContext,
	Plugin,
	MarkdownRenderChild,
	TFile
} from 'obsidian';

interface IPluginSettings {
	customSetting: string;
}

const DEFAULT_SETTINGS: IPluginSettings = {
	customSetting: 'defaultValue',
};

class EnhancedMessagingPlugin extends Plugin {
	settings: IPluginSettings;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.registerMarkdownCodeBlockProcessor('gpt', async (source, element, context) => {
			await this.processGptBlocks(source, element, context);
		});
	}

	onunload(): void {
		console.log('Unloading EnhancedMessagingPlugin');
	}

	private async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	private async processGptBlocks(
		source: string,
		element: HTMLElement,
		context: MarkdownPostProcessorContext
	): Promise<void> {
		const messagesContainer = document.createElement('div');
		messagesContainer.classList.add('gpt-messages');

		const sectionInfo = await context.getSectionInfo(element);
		console.log(sectionInfo);

		const inputField = document.createElement('input');
		inputField.type = 'text';
		inputField.classList.add('gpt-input');

		element.appendChild(messagesContainer);
		element.appendChild(inputField);

		const messages = this.parseSource(source);

		messages.forEach((message: { role: string; content: string }) => {
			this.appendMessage(message, messagesContainer);
		});

		inputField.addEventListener('keyup', async (event) => {
			await this.handleKeyUp(event, messages, inputField, messagesContainer, context);
		});

		context.addChild(new MarkdownRenderChild(element));
	}

	private async handleKeyUp(
		event: KeyboardEvent,
		messages: { role: string; content: string }[],
		inputField: HTMLInputElement,
		messagesContainer: HTMLElement,
		context: MarkdownPostProcessorContext
	): Promise<void> {
		if (event.key === 'Enter') {
			const content = inputField.value.trim();
			if (content) {
				const newMessage = { role: 'user', content };
				messages.push(newMessage);
				this.appendMessage(newMessage, messagesContainer);

				await this.updateSource(messages, messagesContainer, context);

				inputField.value = '';
			}
		}
	}

	private appendMessage(message: { role: string; content: string }, container: HTMLElement): void {
		const messageElement = document.createElement('div');
		messageElement.classList.add('gpt-message', `gpt-message-${message.role}`);
		messageElement.textContent = message.content;
		container.appendChild(messageElement);
	}

	// The updateSource function now awaits the read operation
	private async updateSource(
		messages: { role: string; content: string }[],
		messagesContainer: HTMLElement,
		context: MarkdownPostProcessorContext
	): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(context.sourcePath) as TFile;
		if (!file) {
			return;
		}

		const content = await this.app.vault.read(file); // Await reading the file content
		const lines = content.split('\n');

		const sectionInfo = context.getSectionInfo(messagesContainer);
		if (!sectionInfo) {
			console.error('Section info is null.');
			return;
		}

		const { lineStart: startLine, lineEnd: endLine } = sectionInfo;

		// Remove the old messages
		lines.splice(startLine, endLine - startLine + 1);

		// Prepare new message lines in the correct format
		const messageLines = messages.map(message =>
			`{"role": "${message.role}", "content": "${message.content}" }`
		);
		const newLines = `\`\`\`gpt\n[${messageLines.join(',\n')}]\n\`\`\``;

		// Insert the new messages
		lines.splice(startLine, 0, newLines);

		// Join the lines back together and write the content
		await this.app.vault.modify(file, lines.join('\n'));
	}


	private parseSource(source: string): { role: string; content: string }[] {
		try {
			return JSON.parse(source) || [];
		} catch (error) {
			console.error('Error parsing GPT block source:', error);
			return [];
		}
	}
}

export default EnhancedMessagingPlugin;
