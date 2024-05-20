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
                    // this.setupCheckboxListeners(activeView);
                }
            })
        );

        this.registerMarkdownCodeBlockProcessor('nyanbar', async (source, el) => {
            const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (!markdownView) return;
            const view = markdownView;
            if (source.trim() === 'auto') {
				// Calculate completion percentage based on checkboxes
				const completionPercentage = getCheckboxCompletionPercentage(view);
				el.createEl('h4').textContent = completionPercentage+'%'
				let div = el.createEl('div')
				div.style.display = 'flex'
				div.style.width = '750px'
				div.style.height = '47px'
				div.style.borderRadius = '5px'
				let rainbowCont = div.createEl('div')
				rainbowCont.style.marginTop = '2px'
				rainbowCont.style.height = '32px'
				rainbowCont.style.backgroundImage = "url('https://raw.githubusercontent.com/xhyabunny/nyanbar/1691651e2ca9c07d83d5bca7ebd99ed3ebd076a0/src/nyanbow.gif')"
				rainbowCont.style.backgroundSize = '97% 100%' // Ajuste del tamaño del fondo
				rainbowCont.style.width = completionPercentage+'%' // Asegurarse de que el contenedor ocupe todo el espacio
				rainbowCont.style.zIndex = '1'
				let nyancat = div.createEl('img')
				nyancat.src = 'https://raw.githubusercontent.com/xhyabunny/nyanbar/master/src/nyan-cat.gif'
				nyancat.style.height = '50px'
				nyancat.style.marginTop = '2px'
				nyancat.style.width = 'auto'
				nyancat.style.zIndex = '2'
				if(completionPercentage < 5) {
					nyancat.style.transform = 'translateX(-10px) translateY(-5px)'
				} else {
					nyancat.style.transform = 'translateX(-48px) translateY(-5px)'
				}
			} else {
                if (source.trim() === '0') {
					el.createEl('h4').textContent = '0%'
					let div = el.createEl('div')
					div.style.backgroundImage = ''
					div.style.display = 'flex'
					div.style.borderRadius = '5px'
					let nyancat = div.createEl('img')
					nyancat.src = 'https://raw.githubusercontent.com/xhyabunny/nyanbar/master/src/nyan-cat.gif'
					nyancat.style.height = '50px'
					nyancat.style.marginTop = '2px'
					nyancat.style.width = 'auto'
					nyancat.style.zIndex = '2'
					nyancat.style.transform = 'translateX(-10px) translateY(-5px)'
                    return;
                }
                if (parseInt(source.trim()) && parseInt(source.trim()) <= 100 && parseInt(source.trim()) >= 0) {
                    el.createEl('h4').textContent = Math.min(100, Math.max(0, Number(source.trim()))) + '%';
					let div = el.createEl('div')
					div.style.display = 'flex'
					div.style.width = '750px'
					div.style.height = '47px'
					div.style.borderRadius = '5px'
					let rainbowCont = div.createEl('div')
					rainbowCont.style.marginTop = '2px'
					rainbowCont.style.height = '32px'
					rainbowCont.style.backgroundImage = "url('https://raw.githubusercontent.com/xhyabunny/nyanbar/1691651e2ca9c07d83d5bca7ebd99ed3ebd076a0/src/nyanbow.gif')"
					rainbowCont.style.backgroundSize = '97% 100%' // Ajuste del tamaño del fondo
					rainbowCont.style.width = Math.min(100, Math.max(0, Number(source.trim())))+'%' // Asegurarse de que el contenedor ocupe todo el espacio
					rainbowCont.style.zIndex = '1'
					let nyancat = div.createEl('img')
					nyancat.src = 'https://raw.githubusercontent.com/xhyabunny/nyanbar/master/src/nyan-cat.gif'
					nyancat.style.height = '50px'
					nyancat.style.marginTop = '2px'
					nyancat.style.width = 'auto'
					nyancat.style.zIndex = '2'
					if(Math.min(100, Math.max(0, Number(source.trim()))) < 14) {
						nyancat.style.transform = 'translateX(-15px) translateY(-5px)'
					} else {
						nyancat.style.transform = 'translateX(-48px) translateY(-5px)'
					}
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

    /*
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
	*/
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
            .setDesc('Track your progress with NyanBar!');

			containerEl.createEl('img').src = 'https://github.com/xhyabunny/obsidian-sample-plugin/assets/106491722/262b2c04-c5bc-44a3-86d0-26967b9b4660'
			
			containerEl.createEl('h6').textContent = `Run "/add-nyanbar" then place a number from "0" to "100" or do "auto" for automatic progress according to the note's checked checkboxes.`;
			let e = containerEl.createEl('p')
			e.style.color = '#FF1445'
			e.textContent = 'WARNING: The progress bar update is WIP, switch between notes to update progress bar for now, if you know about obsidian API and want to help us finish the development of this Tool, please message @bonndubz on discord.'

		}
}
