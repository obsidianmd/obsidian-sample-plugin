export interface ArticleScraperSettings {
	defaultCategory: string;
	defaultReadStatus: string;
	defaultNoteStatus: string;
	templateFolder: string;
	dateFormat: string;
}

export const DEFAULT_SETTINGS: ArticleScraperSettings = {
	defaultCategory: "Article",
	defaultReadStatus: "In progress",
	defaultNoteStatus: "baby",
	templateFolder: "",
	dateFormat: "YYYY-MM-DD"
}
