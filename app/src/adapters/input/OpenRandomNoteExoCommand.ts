import ExoCommand from "./ExoCommand";
import {Notice} from "obsidian";
import ExoContext from "../../../../common/ExoContext";

export default class OpenRandomNoteExoCommand implements ExoCommand {
	name = "Рандомная заметка из прошлого";
	slug = "open-random-note";

	async execute(ctx: ExoContext): Promise<void> {
		const files = ctx.vaultAdapter.getAllMdFiles();
		const today = new Date();
		const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate()).setHours(0, 0, 0, 0); // Дата месяц назад без времени

		// Фильтрация заметок с датой изменения раньше прошлого месяца
		const oldNotes = files.filter(file => file.stat.mtime < lastMonth);

		if (oldNotes.length > 0) {
			// Выбираем случайную заметку
			const randomNote = oldNotes[Math.floor(Math.random() * oldNotes.length)];

			// Открываем её в активной панели
			await ctx.appUtils.openFile(randomNote);
		} else {
			new Notice("No old notes found.");
		}
	}
}
