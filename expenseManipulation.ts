import { App, MarkdownView } from "obsidian";

export async function playWithTable(app: App) {
	const file = app.workspace.getActiveFile();
	const fileContent = await this.app.vault.read(file);
	const lines = fileContent.split("\n");
	let inTable = false;
	const tableLines = lines
		.map((line: string) => {
			if (/^\|.*\|$/.test(line)) {
				if (line.includes("---")) {
					// This is the header line, start reading from next line
					inTable = true;
				} else if (inTable) {
					// This is a table line, read the cells
					const cells = line
						.split("|")
						.map((cell: string) => cell.trim())
						.filter((cell: string) => cell !== "");
					return cells.reduce(
						(
							acc: Record<string, string>,
							cell: string,
							index: number
						) => {
							acc["cell" + (index + 1)] = cell;
							return acc;
						},
						{ date: new Date(cells[0]), line }
					);
				}
			}
		})
		.filter(Boolean); // Remove undefined values

	// Sort table lines by date
	tableLines.sort((a, b) => a.date - b.date);
	const sortedLines = tableLines.map((obj) => obj.line);
	console.log(sortedLines);
	// set the cursor at the end of the document
	const editor = this.app.workspace.getActiveViewOfType(MarkdownView);
	// write hello in the start of the document
	editor.editor.setCursor(2, 0);
	editor.editor.replaceSelection(sortedLines.join("\n"));
	editor.editor.replaceSelection("\n\n");
}
