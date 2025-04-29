/**

import LawRefPlugin from "./main";
import { Editor, EditorPosition, EditorSuggest, EditorSuggestContext, EditorSuggestTriggerInfo, TFile } from "obsidian";
import { OldpApi, OldpSearchResponseItem } from "./api/opld";

export default class LawSuggester extends EditorSuggest<OldpSearchResponseItem> {
    private readonly oldpApi = new OldpApi();
    plugin: LawRefPlugin;
    queryRegex = new RegExp(/(?:(?<=^|\n)|(?<=\s))(§\s\d+\s\w+)(?=\s|$)/gi);
    // Alte Fassung falls ich Scheiße gebaut habe /(?:(?<=^|\n)|(?<=\s))(§[-\w]+)(?=\s|$)/gi
    
    constructor(plugin: LawRefPlugin) {
        super(plugin.app);
        this.plugin = plugin;
    }

    onTrigger(cursor: EditorPosition, editor: Editor, _: TFile): EditorSuggestTriggerInfo | null {
		// TODO: fix previous match in same line not being detected
		const sub = editor.getLine(cursor.line).slice(0, cursor.ch);
        const matches = sub.match(this.queryRegex);
        if (matches === null || matches.length === 0) return null;

        const lastMatch = matches[matches.length - 1];
        const matchStart = sub.lastIndexOf(lastMatch);

        if (matchStart === -1) return null;

        return {
            end: cursor,
            start: {
                ch: matchStart,
                line: cursor.line,
            },
            query: lastMatch,
        }
    }

    async getSuggestions(context: EditorSuggestContext): Promise<OldpSearchResponseItem[]> {
        const query = context.query?.replace('§', '').replace('-', ' ').replace('_', ' ');

        if (query?.length < 2) return [];

        return await this.oldpApi.search(query);
    }

    renderSuggestion(suggestion: OldpSearchResponseItem, el: HTMLElement): void {
        const highlightMatch = (text: string, query: string) => {
            const regex = new RegExp(`(${query.replace(/\s/g, '|')})`, 'gi');
            return text.split(regex).map(part => {
                if (part.match(regex)) {
                    return `<strong>${part}</strong>`;
                } else {
                    return part;
                }
            }).join('');
        };

		// TODO: fix snippet not overflowing, needs to break out of container

        const query = this.context?.query?.replace('§', '').replace('-', ' ').replace('_', ' ') || '';

        const outer = el.createDiv({ cls: "lawRef-suggestion-container" });
    
        const titleDiv = createDiv({ cls: "lawRef-title" });
        titleDiv.innerHTML = highlightMatch(suggestion.title, query);
        outer.appendChild(titleDiv);
        
        const snippetDiv = createDiv({ cls: "lawRef-snippet" });
        snippetDiv.innerHTML = highlightMatch(suggestion.snippet, query);
        outer.appendChild(snippetDiv);
        
        outer.addEventListener('mouseenter', () => {
            snippetDiv.style.display = 'block';
        });
        outer.addEventListener('mouseleave', () => {
            snippetDiv.style.display = 'none';
        });
    }

    selectSuggestion(suggestion: OldpSearchResponseItem, evt: MouseEvent | KeyboardEvent): void {
        if (!this.context) return;

        const { start, end } = this.context;
        //console.log('suggestion', suggestion);
		// keep space at the end for hyper link
        const linkEl = `[${suggestion.title}](${suggestion.link}) `;
        this.context.editor.replaceRange(linkEl, start, end);
    }
}
 */