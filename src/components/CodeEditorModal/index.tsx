import React from 'react';
import ReactDOM from 'react-dom';
import { Plugin, Modal } from 'obsidian';
import CodeEditor from './CodeEditor';

class CodeEditorModal extends Modal {
	plugin: Plugin;

	constructor(plugin: Plugin) {
		super(plugin.app);
		this.plugin = plugin;
	}

	// 调用 Modal 的 open 方法是触发的回调函数
	onOpen() {
		// 设置 Modal 的宽高
		this.modalEl.setCssProps({
			'--dialog-width': '80vw',
			'--dialog-height': '80vh',
		});
		// 将 CodeEditor 组件挂载到 Modal 的 contentEl
		ReactDOM.render(<CodeEditor plugin={this.plugin} />, this.contentEl);
	}
	// 调用 Modal 的 close 方法是触发的回调函数
	onClose() {
		ReactDOM.unmountComponentAtNode(this.contentEl);
		this.contentEl.empty();
	}
}

export default CodeEditorModal;
