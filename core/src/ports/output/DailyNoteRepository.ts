import DailyNote from "../../domain/DailyNote";

export default interface DailyNoteRepository {
	findCurrent(): Promise<DailyNote | null>;

	findAll(): Promise<DailyNote[]>;
}
