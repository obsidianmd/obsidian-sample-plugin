import { Plugin } from 'obsidian';

export default class MyPlugin extends Plugin {
	async onload() {
		await this.loadSettings();
	}

	onunload() {
	}

	async loadSettings() {
	}

	async saveSettings() {
	}
}

