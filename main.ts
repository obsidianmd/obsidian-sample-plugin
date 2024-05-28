import {App, Editor, EditorPosition,  MarkdownView, SuggestModal, Notice, Plugin, PluginSettingTab, Setting} from 'obsidian';

// Remember to rename these classes and interfaces!



interface TextMoverPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: TextMoverPluginSettings = {
	mySetting: 'default'
}


interface Heading {
	heading: string;
	level: number;
	position: object;
  }



export class HeadingSuggestionModal extends SuggestModal<Heading> {
	// Returns all available suggestions.
	headings: Heading[];
	result: object
	onSubmit: (result: object) => void;

	constructor(app: App, headings: Heading[], onSubmit: (result: object) => void) {
		super(app);
		console.log("inside constructor");
		this.headings = headings;
		// console.log(this.headings);
		this.onSubmit = onSubmit;
		
	  }


	getSuggestions(query: string): Heading[] {
	  return this.headings.filter((item) =>
		item.heading.toLowerCase().includes(query.toLowerCase())
	  );
	}
  
	// Renders each suggestion item.
	renderSuggestion(heading: Heading, el: HTMLElement) {		
		el.createEl("div", { text: heading.heading });
	}
  
	// Perform action on the selected suggestion.
	onChooseSuggestion(heading: Heading, evt: MouseEvent | KeyboardEvent) {
		this.onSubmit(heading);
	}
  }


export default class TextMoverPlugin extends Plugin {
	settings: TextMoverPluginSettings;

	async onload() {

		// await this.loadSettings();
		console.log("loading")
		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu, editor, view) => {
				menu.addItem((item) => {					
					item
						.setTitle("Move text to heading")
						.setIcon("document")
						.onClick(async () => {
							let selection = editor.getSelection();
							const cursorposition = editor.getCursor()
								
							if (selection == "" ){
								// get clicked text
								selection = editor.getLine(cursorposition.line)
							}
							console.log(selection)
							// TODO: get cursor position

							let file = this.app.workspace.getActiveFile()
							// get headings from file
							const filecache = this.app.metadataCache.getFileCache(file)
							let headings: Heading[] = [];
							if (filecache && filecache.headings) {
								headings = filecache.headings.map(headingCache => {
									return {
										heading: headingCache.heading,
										level: headingCache.level,
										position: headingCache.position
									};
								});
							}

							let hmodal = new HeadingSuggestionModal(this.app, headings, (result) => {								
								const cursorposition = editor.getCursor()
								let targetPosition = {"line": result.position.end.line, "ch": result.position.end.ch}//editor.getCursor()								
								// insert selection under heading								  
								editor.replaceRange(`\n${selection}`, targetPosition)
								
								let start = {"line":cursorposition.line, "ch":0}  
								let end = {"line":cursorposition.line, "ch":selection.length+1}
								editor.replaceRange("", start, end)	
							  });
							  
							hmodal.open()
							
						});
							
			})

		}))
	}
		


	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
