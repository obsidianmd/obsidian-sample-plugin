import { Modal, App, TAbstractFile, TFile } from 'obsidian'
import { Notes } from 'src/Models/Notes'
import { PromptView, LEARNING_TYPE } from 'src/PromptView';

export class PromptModal extends Modal {
    private notes: Array<Notes>
    private docs: Array<any>
    private file: TAbstractFile | null

    constructor(app: App, notes: Notes[]) {
        super(app);
        this.notes = notes

        this.docs =this.notes.flatMap((obj) => {
            const { id, title, tags, path } = obj;
            return tags?.map((tag) => ({
              id: `${id}-${tag}`,
              value: tag,
              titles: this.notes.filter((o) => o.tags?.includes(tag)).map((o) => o.title),
              paths: this.notes.filter((o) => o.tags?.includes(tag)).map((o) => o.path)
            }));
        });
    }

    calculateSuggestions(input: string): any[] {
        const suggestions: any[] = []

        this.docs.forEach((doc) => {
            const value = (doc as { value: String }).value
            const lowerCase = value.toLowerCase()
            const formattedValue = lowerCase.substring(1)

            if ((formattedValue.contains(input) || value.contains(input)) && !value.contains("learning-score")) {
                if(!suggestions.contains(value.toString())) {
                    suggestions.push({tag: value.toString(), titles: doc.titles, paths: doc.paths })
                }
            }
        })

        return suggestions
    }

    async onOpen() {
        this.docs = this.docs.filter((value, index, self) =>
            index === self.findIndex((t) => (
                t.value === value.value
            ))
        )

        this.titleEl.createEl('h1', { text: 'Search by tag'} )
        const searchInput = this.contentEl.createEl('input', { type: 'text' })
        this.contentEl.style.height = '500px'
        this.contentEl.style.maxHeight = '150px'

        const suggestionsContainer = this.contentEl.createDiv()
        suggestionsContainer.style.backgroundColor = '#2A2A2A'
        suggestionsContainer.style.border = '7px solid #2A2A2A'
        suggestionsContainer.style.borderRadius = '3px'
        suggestionsContainer.style.maxHeight = '150px'
        suggestionsContainer.style.overflow = 'auto'
        suggestionsContainer.style.visibility = 'hidden'
        suggestionsContainer.style.position = 'absolute'
        suggestionsContainer.style.width = '92%'
        searchInput.style.width = '100%'

        searchInput.addEventListener('input', async (e) => {
            suggestionsContainer.textContent = ''

            const query = (e.target as HTMLInputElement)?.value ?? ''

            const suggestions = this.calculateSuggestions(query)
            if (suggestions.length > 0) {
                suggestionsContainer.style.visibility = 'visible'
            } else {
                suggestionsContainer.style.visibility = 'hidden'
            }

            suggestions.forEach((suggestion) => {
                const item = document.createElement('div')
                item.textContent = suggestion.tag

                item.addEventListener('mouseenter', () => {
                    item.style.color = 'grey'
                })

                item.addEventListener('mouseleave', () => {
                    item.style.color = 'white'
                })

                item.addEventListener('click', async () => {
                    await this.app.workspace.getLeaf(false).setViewState({
                        type: LEARNING_TYPE,
                        active: true,
                    });

                    const leaf = this.app.workspace.getLeavesOfType(LEARNING_TYPE)[0]
                    this.app.workspace.getLeaf().open(new PromptView(leaf, suggestion))

                    this.app.workspace.onLayoutReady( () => {
                        this.close();
                    });
                })

                suggestionsContainer.appendChild(item)
            })
        })
    }
}
