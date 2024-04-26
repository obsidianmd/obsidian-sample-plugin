import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { TextFileView, TFile, WorkspaceLeaf } from 'obsidian';
import App from './components/App';

export class View extends TextFileView {
	root: Root;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewData(): string {
		throw new Error('Method not implemented.');
	}
	setViewData(data: string, clear: boolean): void {
		throw new Error('Method not implemented.');
	}
	clear(): void {
		throw new Error('Method not implemented.');
	}
	getViewType(): string {
		throw new Error('Method not implemented.');
	}

	async render(file: TFile) {
		this.root = this.root || createRoot(this.containerEl.children[1]);

		let fileData = await this.app.vault.read(file);

		console.log('fileData', fileData);

		this.root?.render(
			<React.StrictMode>
				<App />
			</React.StrictMode>,
		);
	}
}
