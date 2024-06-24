import LawRefPlugin from "./main";
import { Editor, EditorPosition, EditorSuggest, EditorSuggestContext, EditorSuggestTriggerInfo, TFile } from "obsidian";
import { OldpApi, OldpSearchResponseItem } from "./api/opld";

export default class LawSuggester extends EditorSuggest<OldpSearchResponseItem> {
    private readonly oldpApi = new OldpApi();
	plugin: LawRefPlugin;
	// todo: probably refactor this?
	queryRegex = new RegExp(/(?:(?<=^|\n)|(?<=\s))§[-\w]+(?=\s|$)/gi);

	constructor(plugin: LawRefPlugin) {
		super(plugin.app);
		this.plugin = plugin;
	}

	onTrigger(cursor: EditorPosition, editor: Editor, _: TFile): EditorSuggestTriggerInfo | null {
		// todo: probably refactor selection
		const sub = editor.getLine(cursor.line).slice(0, cursor.ch);
		const matches = sub.match(this.queryRegex);
		if (matches === null || matches.groups === null || matches.groups?.sc === null) return null;

		if (matches != null) console.log('matches', matches);

		return {
			end: cursor,
			start: {
				ch: sub.lastIndexOf(matches.groups?.sc ?? ''),
				line: cursor.line,
			},
            // always get latest
			query: matches[matches.length - 1],
		}
	}

	async getSuggestions(context: EditorSuggestContext): Promise<OldpSearchResponseItem[]> {
        // TODO: fix bug where when you change something in the string at e.g. char 2 it only triggers rerender for substring
		console.log('query', context.query?.replace('§', '').replace('-', ' ').replace('_', ' '))

        const query = context.query?.replace('§', '').replace('-', ' ').replace('_', ' ');

        // don't execute if input  length is under 2
        if(query?.length < 2) return [];

		return await this.oldpApi.search(query);
	}

    renderSuggestion(suggestion: OldpSearchResponseItem, el: HTMLElement): void {
		// TODO refactor appearence and hover
        const outer = el.createDiv({ cls: "lawRef-suggestion-container" });
		let shortcodeDiv = createDiv({ title: `${suggestion.snippet}` })
		shortcodeDiv.setText(suggestion.title);
		outer.appendChild(shortcodeDiv)
    }

    selectSuggestion(suggestion: OldpSearchResponseItem, evt: MouseEvent | KeyboardEvent): void {
        // TODO: implement me
		/*		if(!this.context) return;
		const { start, end } = this.context;
		const shortcode = suggestion.names.includes(suggestion.matchedName) ? suggestion.matchedName : suggestion.names[0]
		const outEm = suggestion.names.some(n => windowsSupportedFirstChar.includes(n)) && suggestion.emoji.split("").length > 1 
			? suggestion.emoji.split("")[0] 
			: suggestion.emoji;
		const repl = this.plugin.settings.immediateReplace ? outEm : `:${shortcode}: `;

		this.context.editor.replaceRange(repl, start, end);
		this.plugin.updateHistory(suggestion.matchedName); */
    }
}