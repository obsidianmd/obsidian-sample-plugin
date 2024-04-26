import React from 'react';
import { Editor, Plugin } from 'obsidian';
import MonacoEditor from 'react-monaco-editor';

import 'monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution';
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution';
import 'monaco-editor/esm/vs/basic-languages/html/html.contribution';
import 'monaco-editor/esm/vs/basic-languages/css/css.contribution';

interface CodeEditorProps {
	plugin: Plugin;
}

const options = {
	selectOnLineNumbers: true, // 显示行号（默认true）
	roundedSelection: false, //
	readOnly: false, // 是否切换只读（默认false）
	// cursorStyle: 'line', // 光标样式
	automaticLayout: true, // 自适应布局（默认为true）
	fontSize: 14, // 字体大小
	tabSize: 2, // tab 缩进长度(包括回车换行后的自动缩进)
	scrollBeyondLastLine: false, // 取消代码后面一大段空白（为true时，editor的高度会大于父容器）
	contextmenu: true, // 编辑器原生的右键菜单
};

const CodeEditor = (props: CodeEditorProps) => {
	const { plugin } = props;
	const [value, setValue] = React.useState<string>('');
	const [language, setLanguage] = React.useState<string>('');

	return (
		<MonacoEditor
			options={options}
			width="100%"
			height="600"
			language={language}
			theme="vs-dark"
			value={value}
			editorDidMount={() => {
				const obsidianEditor = plugin.app.workspace.activeEditor?.editor!;

				const [startLine, endLine, language] = getBoundaryLines(obsidianEditor, '```');
				const textContent = getEditorContent(obsidianEditor, startLine + 1, endLine - 1);

				setLanguage(language);
				setValue(textContent);
			}}
			editorWillUnmount={(monacoEditor) => {
				const obsidianEditor = plugin.app.workspace.activeEditor?.editor!;
				const [startLine, endLine, language] = getBoundaryLines(obsidianEditor, '```');
				const editorValue = monacoEditor.getValue();
				obsidianEditor?.replaceRange(
					`${editorValue}\n`,
					{ line: startLine + 1, ch: 0 }, // 替换代码块内容的起始位置
					{ line: endLine, ch: 0 }, // 替换代码块内容的结束位置
				);

				monacoEditor.dispose();
			}}
		/>
	);
};

export default CodeEditor;

function getBoundaryLines(editor: Editor, target: string): [number, number, string] {
	const cursor = editor.getCursor();
	let startLine = cursor.line;
	let endLine = cursor.line;

	// Find the upper boundary line
	for (let i = startLine; i >= 0; i--) {
		if (editor.getLine(i).includes(target)) {
			startLine = i;
			break;
		}
	}

	// Find the lower boundary line
	const lineCount = editor.lineCount();
	for (let i = endLine; i < lineCount; i++) {
		if (editor.getLine(i).includes(target)) {
			endLine = i;
			break;
		}
	}

	const languageKey = editor.getLine(startLine).split('```')[1].trim();
	const language = matchLanguage(languageKey)!;

	return [startLine, endLine, language];
}

function matchLanguage(languageKey: string) {
	switch (languageKey) {
		case 'js':
		case 'es6':
		case 'jsx':
		case 'cjs':
		case 'mjs':
			return 'javascript';
		case 'ts':
		case 'tsx':
		case 'cts':
		case 'mts':
			return 'typescript';
		case 'css':
			return 'css';
		case 'html':
		case 'htm':
		case 'shtml':
		case 'xhtml':
		case 'mdoc':
		case 'jsp':
		case 'asp':
		case 'aspx':
		case 'jshtm':
			return 'html';
		case 'json':
			return 'json';
	}
}

function getEditorContent(editor: Editor, startLine: number, endLine: number): string {
	const editorContent = editor.getRange({ line: startLine, ch: 0 }, { line: endLine + 1, ch: 0 });
	return editorContent.trimEnd();
	// 优化以下的代码
	// const lines = [];
	// for (let i = startLine; i <= endLine; i++) {
	// 	lines.push(editor.getLine(i));
	// }
	// return lines.join('\n');
}
