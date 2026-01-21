import {
	App,
	ItemView,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	WorkspaceLeaf,
} from 'obsidian';

interface OpenAIChatSettings {
	apiEndpoint: string;
	apiKey: string;
	model: string;
}

interface ChatMessage {
	role: 'user' | 'assistant' | 'system';
	content: string;
}

const DEFAULT_SETTINGS: OpenAIChatSettings = {
	apiEndpoint: 'https://api.openai.com',
	apiKey: '',
	model: 'gpt-4o-mini',
};

const VIEW_TYPE = 'openai-chat-view';

export default class OpenAIChatPlugin extends Plugin {
	settings: OpenAIChatSettings;

	async onload() {
		await this.loadSettings();

		this.registerView(VIEW_TYPE, (leaf) => new OpenAIChatView(leaf, this));

		this.addCommand({
			id: 'open-openai-chat',
			name: 'Open AI Chat Sidebar',
			callback: () => {
				void this.activateView();
			},
		});

		this.addSettingTab(new OpenAIChatSettingTab(this.app, this));
	}

	onunload() {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE);
	}

	async activateView() {
		const leaf = this.app.workspace.getRightLeaf(false);
		await leaf.setViewState({ type: VIEW_TYPE, active: true });
		this.app.workspace.revealLeaf(leaf);
	}

	async sendChat(messages: ChatMessage[]): Promise<string> {
		const { apiEndpoint, apiKey, model } = this.settings;

		if (!apiEndpoint || !apiKey || !model) {
			throw new Error('Missing API settings');
		}

		const trimmedEndpoint = apiEndpoint.replace(/\/$/, '');
		const url = trimmedEndpoint.endsWith('/v1')
			? `${trimmedEndpoint}/chat/completions`
			: `${trimmedEndpoint}/v1/chat/completions`;

		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify({
				model,
				messages,
				temperature: 0.2,
			}),
		});

		const data = await response.json();

		if (!response.ok) {
			const message = data?.error?.message || 'Chat request failed';
			throw new Error(message);
		}

		return data?.choices?.[0]?.message?.content?.trim() || '';
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class OpenAIChatView extends ItemView {
	plugin: OpenAIChatPlugin;
	messages: ChatMessage[] = [];
	messageListEl: HTMLDivElement;
	inputEl: HTMLTextAreaElement;
	sendButtonEl: HTMLButtonElement;
	statusEl: HTMLDivElement;

	constructor(leaf: WorkspaceLeaf, plugin: OpenAIChatPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType() {
		return VIEW_TYPE;
	}

	getDisplayText() {
		return 'AI Chat';
	}

	getIcon() {
		return 'message-square';
	}

	async onOpen() {
		this.render();
	}

	async onClose() {
		this.messages = [];
	}

	render() {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.addClass('oa-chat-view');

		this.messageListEl = containerEl.createDiv('oa-chat-messages');
		this.statusEl = containerEl.createDiv('oa-chat-status');

		const inputWrap = containerEl.createDiv('oa-chat-input');
		this.inputEl = inputWrap.createEl('textarea', {
			cls: 'oa-chat-textarea',
			attr: {
				placeholder: 'Type a message...',
			},
		});

		this.sendButtonEl = inputWrap.createEl('button', {
			text: 'Send',
			cls: 'oa-chat-send',
		});

		this.sendButtonEl.addEventListener('click', () => {
			void this.handleSend();
		});

		this.inputEl.addEventListener('keydown', (event) => {
			if (event.key === 'Enter' && !event.shiftKey) {
				event.preventDefault();
				void this.handleSend();
			}
		});

		this.renderMessages();
	}

	setStatus(text: string) {
		this.statusEl.setText(text);
	}

	setInputEnabled(enabled: boolean) {
		this.inputEl.disabled = !enabled;
		this.sendButtonEl.disabled = !enabled;
	}

	renderMessages() {
		this.messageListEl.empty();

		for (const message of this.messages) {
			const messageEl = this.messageListEl.createDiv({
				cls: `oa-chat-message ${message.role}`,
			});
			messageEl.setText(message.content);
		}

		this.messageListEl.scrollTop = this.messageListEl.scrollHeight;
	}

	async handleSend() {
		const content = this.inputEl.value.trim();
		if (!content) {
			return;
		}

		this.inputEl.value = '';
		this.messages.push({ role: 'user', content });
		this.renderMessages();

		this.setStatus('Sending...');
		this.setInputEnabled(false);

		try {
			const reply = await this.plugin.sendChat(this.messages);
			if (reply) {
				this.messages.push({ role: 'assistant', content: reply });
			}
		} catch (error) {
			console.error('Chat request failed:', error);
			new Notice('Chat request failed. Check settings or console.');
		} finally {
			this.setStatus('');
			this.setInputEnabled(true);
			this.renderMessages();
		}
	}
}

class OpenAIChatSettingTab extends PluginSettingTab {
	plugin: OpenAIChatPlugin;

	constructor(app: App, plugin: OpenAIChatPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('API Endpoint')
			.setDesc('Base URL for OpenAI-compatible APIs.')
			.addText((text) =>
				text
					.setPlaceholder('https://api.openai.com')
					.setValue(this.plugin.settings.apiEndpoint)
					.onChange(async (value) => {
						this.plugin.settings.apiEndpoint = value.trim();
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('API Key')
			.setDesc('Stored locally in Obsidian settings.')
			.addText((text) => {
				text
					.setPlaceholder('sk-...')
					.setValue(this.plugin.settings.apiKey)
					.onChange(async (value) => {
						this.plugin.settings.apiKey = value.trim();
						await this.plugin.saveSettings();
					});
				text.inputEl.type = 'password';
			});

		new Setting(containerEl)
			.setName('Model')
			.setDesc('Model name for chat completions.')
			.addText((text) =>
				text
					.setPlaceholder('gpt-4o-mini')
					.setValue(this.plugin.settings.model)
					.onChange(async (value) => {
						this.plugin.settings.model = value.trim();
						await this.plugin.saveSettings();
					})
			);
	}
}
