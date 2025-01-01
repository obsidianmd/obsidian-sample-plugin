import DailyNote from "../../domain/DailyNote";

export default interface GetCurrentDailyNoteUseCase {
	get(): Promise<DailyNote | null>;
}
