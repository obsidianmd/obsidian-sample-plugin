import ExoCommand from "./ExoCommand";
import {App, Notice} from "obsidian";

export default class OpenRandomNoteExoCommand implements ExoCommand {
	name: string = "Рандомная заметка из прошлого";

	async execute(app: App): Promise<void> {
		const files = app.vault.getFiles();
		const today = new Date();
		const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate()).setHours(0, 0, 0, 0); // Дата месяц назад без времени

		// Фильтрация заметок с датой изменения раньше прошлого месяца
		const oldNotes = files.filter(file => file.stat.mtime < lastMonth);

		if (oldNotes.length > 0) {
			// Выбираем случайную заметку
			const randomNote = oldNotes[Math.floor(Math.random() * oldNotes.length)];
			// Открываем её в активной панели
			const leaf = app.workspace.getLeaf(false);
			await leaf.openFile(randomNote);
		} else {
			new Notice("No old notes found.");
		}
	}
}
