import { App, Editor, MarkdownView, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

function getCheckboxCompletionPercentage(view: MarkdownView): number {
    const checkboxes = view.contentEl.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    const totalCheckboxes = checkboxes.length;
    let checkedCount = 0;

    checkboxes.forEach((checkbox) => {
        if (checkbox.checked) {
            checkedCount++;
        }
    });

    if (totalCheckboxes === 0) {
        return 0; // Return 0 if there are no checkboxes in the note
    }

    return Math.round((checkedCount / totalCheckboxes) * 100);
}

export default class NyanBar extends Plugin {
    async onload() {
        this.registerEvent(
            this.app.workspace.on('file-open', (file) => {
                const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (activeView) {
                    this.setupCheckboxListeners(activeView);
                }
            })
        );

		setInterval(()=>{
			this.app.workspace.activeEditor?.editor?.refresh()
		},200)

        this.registerMarkdownCodeBlockProcessor('nyanbar', async (source, el) => {
            const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (!markdownView) return;
            const view = markdownView;
            if (source.trim() === 'auto') {
				// Calculate completion percentage based on checkboxes
				const completionPercentage = getCheckboxCompletionPercentage(view);
				let div = el.createEl('div')
				div.style.display = 'flex'
				div.style.width = '750px'
				div.style.height = '70px'
				let rainbowCont = div.createEl('div')
				rainbowCont.style.backgroundColor = 'red'
				rainbowCont.style.backgroundImage = "url('./src/nyanbow.gif')"
				rainbowCont.style.backgroundSize = completionPercentage + '% 100%' // Ajuste del tamaño del fondo
				rainbowCont.style.width = '100%' // Asegurarse de que el contenedor ocupe todo el espacio
			} else {
                if (source.trim() === '0') {
                    el.createEl('p').textContent = '0%';
                    return;
                }
                if (parseInt(source.trim()) && parseInt(source.trim()) <= 100 && parseInt(source.trim()) >= 0) {
                    el.createEl('p').textContent = Math.min(100, Math.max(0, Number(source.trim()))) + '%';
                } else {
					el.createEl('p').textContent = source
				}
            }
        });

        this.addRibbonIcon('cat', 'NyanBar', () => {
            // Called when the user clicks the icon.
            new Notice(`${this.manifest.name}\nMade by ${this.manifest.author}\nv${this.manifest.version}`);
        });

        // This adds a simple command that can be triggered anywhere
        this.addCommand({
            id: 'add-nyanbar',
            name: 'Add NyanBar',
            hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'b' }],
            editorCallback: (editor: Editor) => {
                editor.setLine(editor.getCursor().line, '```nyanbar\nauto\n```');
            },
        });

        // This adds a settings tab so the user can configure various aspects of the plugin
        this.addSettingTab(new SettingTab(this.app, this));
    }

    setupCheckboxListeners(view: MarkdownView) {
        const checkboxes = view.contentEl.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
        checkboxes.forEach((checkbox) => {
            checkbox.addEventListener('change', () => {
				this.registerMarkdownCodeBlockProcessor('nyanbar', async (source, el) => {
					const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
					if (!markdownView) return;
					const view = markdownView;
					if (source.trim() === 'auto') {
						// Calculate completion percentage based on checkboxes
						const completionPercentage = getCheckboxCompletionPercentage(view);
						el.createEl('p').textContent = completionPercentage + '%';
					} else {
						if (source.trim() === '0') {
							el.createEl('p').textContent = '0%';
							return;
						}
						if (parseInt(source) && parseInt(source) <= 100 && parseInt(source) >= 0) {
							el.createEl('p').textContent = Math.min(100, Math.max(0, Number(source))) + '%';
						} else {
							el.createEl('p').textContent = source
						}
					}
				});
                this.app.workspace.trigger('markdown:reprocess', view);
            });
        });
    }
}

class SettingTab extends PluginSettingTab {
    plugin: NyanBar;

    constructor(app: App, plugin: NyanBar) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        new Setting(containerEl)
            .setName('NyanBar')
            .setDesc('Track your progress with NyanBar.');

			containerEl.createEl('h6').textContent = `Run "/add-nyanbar" then place a number from "0" to "100" or do "auto" for automatic progress according to the note's checked checkboxes.`;
			let e = containerEl.createEl('p')
			e.style.color = '#FF1445'
			e.textContent = 'WARNING: The progress bar update is WIP, switch between notes to update progress bar for now, if you know about obsidian API and want to help us finish the development of this Tool, please message @bonndubz on discord.'

		}
}
