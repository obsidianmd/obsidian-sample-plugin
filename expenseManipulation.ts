import { App, TFile } from "obsidian";

export async function playWithTable(app: App) {
	const file = await this.app.workspace.getActiveFile();
	// trigger if something changed in the file (ex. new expense added)
	app.vault.on("modify", async (changedFile: TFile) => {
		if (changedFile.path === file.path) {
			if (file) {
				const fileContent = await this.app.vault.read(file);
				const lines = fileContent.split("\n");
				let inTable = false;
				lines.forEach((line) => {
					if (line.startsWith("|")) {
						if (line.includes("---")) {
							// This is the header line, start reading from next line
							inTable = true;
						} else if (inTable) {
							// This is a table line, read the cells
							const cells = line
								.split("|")
								.map((cell) => cell.trim());
							console.log(cells);
						}
					} else {
						inTable = false;
					}
				});
			}
		}
	});
}
