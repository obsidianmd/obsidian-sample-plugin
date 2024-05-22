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
				div.addClass('divCont')
				let rainbowCont = div.createEl('div')
				rainbowCont.addClass('rainbowNyan')
				rainbowCont.style.width = completionPercentage+'%' // Asegurarse de que el contenedor ocupe todo el espacio
				let nyancat = div.createEl('img')
				nyancat.addClass('imgNyan')
				nyancat.src = './src/nyan-cat.gif'
				if(completionPercentage < 5) {
					nyancat.addClass('nyanTransform1')
					nyancat.removeClass('nyanTransform2')
				} else {
					nyancat.addClass('nyanTransform2')
					nyancat.removeClass('nyanTransform1')
				}
			} else {
                if (source.trim() === '0') {
					el.createEl('h4').textContent = '0%'
					let div = el.createEl('div')
					div.addClass('divCont')
					let nyancat = div.createEl('img')
					nyancat.src = './src/nyan-cat.gif'
					nyancat.addClasses(['imgNyan','nyanTransform1'])
                    return;
                }
                if (parseInt(source.trim()) && parseInt(source.trim()) <= 100 && parseInt(source.trim()) >= 0) {
                    el.createEl('h4').textContent = Math.min(100, Math.max(0, Number(source.trim()))) + '%';
					let div = el.createEl('div')
					div.addClass('divCont')
					let rainbowCont = div.createEl('div')
					rainbowCont.addClass('rainbowNyan')
					rainbowCont.style.width = Math.min(100, Math.max(0, Number(source.trim())))+'%' // Asegurarse de que el contenedor ocupe todo el espacio
					let nyancat = div.createEl('img')
					nyancat.src = './src/nyan-cat.gif'
					nyancat.addClass('imgNyan')
					if(Math.min(100, Math.max(0, Number(source.trim()))) < 14) {
						nyancat.addClass('nyanTransform1')
						nyancat.removeClass('nyanTransform2')
					} else {
						nyancat.addClass('nyanTransform2')
						nyancat.removeClass('nyanTransform1')
					}
                } else {
					let div = el.createDiv()
					let e = div.createEl('h4')
					e.addClass('e')
					e.textContent = '[ERROR: Invalid Value]'
					let e1 = div.createEl('p')
					e1.addClass('e1')
					e1.textContent = 'NYANBAR-ERROR'
				}
            }
        });

		this.registerMarkdownCodeBlockProcessor('pusheenbar', async (source, el) => {
            const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (!markdownView) return;
            const view = markdownView;
            if (source.trim() === 'auto') {
				// Calculate completion percentage based on checkboxes
				const completionPercentage = getCheckboxCompletionPercentage(view);
				el.createEl('h4').textContent = completionPercentage+'%'
				let div = el.createEl('div')
				div.addClass('divCont')
				let rainbowCont = div.createEl('div')
				rainbowCont.addClass('rainbowPusheen')
				rainbowCont.style.width = completionPercentage+'%' // Asegurarse de que el contenedor ocupe todo el espacio
				let pusheencat = div.createEl('img')
				pusheencat.addClass('imgPusheen')
				pusheencat.src = './src/pusheen-cat.gif'
				if(completionPercentage < 5) {
					pusheencat.removeClass('pusheenTransform3')
					pusheencat.removeClass('pusheenTransform2')
					pusheencat.addClass('pusheenTransform1')
				} else {
					pusheencat.removeClass('pusheenTransform3')
					pusheencat.removeClass('pusheenTransform1')
					pusheencat.addClass('pusheenTransform2')
				}
			} else {
                if (source.trim() === '0') {
					el.createEl('h4').textContent = '0%'
					let div = el.createEl('div')
					div.addClass('divCont')
					let pusheencat = div.createEl('img')
					pusheencat.src = './src/pusheen-cat.gif'
					pusheencat.addClasses(['imgPusheen', 'pusheenTransform3'])
					pusheencat.removeClass('pusheenTransform1')
					pusheencat.removeClass('pusheenTransform2')
                    return;
                }
                if (parseInt(source.trim()) && parseInt(source.trim()) <= 100 && parseInt(source.trim()) >= 0) {
                    el.createEl('h4').textContent = Math.min(100, Math.max(0, Number(source.trim()))) + '%';
					let div = el.createEl('div')
					div.addClass('divCont')
					let rainbowCont = div.createEl('div')
					rainbowCont.addClass('rainbowPusheen')
					rainbowCont.style.width = Math.min(100, Math.max(0, Number(source.trim())))+'%' // Asegurarse de que el contenedor ocupe todo el espacio
					let pusheencat = div.createEl('img')
					pusheencat.src = './src/pusheen-cat.gif'
					pusheencat.addClass('imgPusheen')
					if(Math.min(100, Math.max(0, Number(source.trim()))) < 5) {
						pusheencat.removeClass('pusheenTransform3')
						pusheencat.removeClass('pusheenTransform2')
						pusheencat.addClass('pusheenTransform1')
					} else {
						pusheencat.removeClass('pusheenTransform3')
						pusheencat.removeClass('pusheenTransform1')
						pusheencat.addClass('pusheenTransform2')
					}
                } else {
					let div = el.createDiv()
					let e = div.createEl('h4')
					e.addClass('e')
					e.textContent = '[ERROR: Invalid Value]'
					let e1 = div.createEl('p')
					e1.addClass('e1')
					e1.textContent = 'NYANBAR-ERROR'
				}
            }
        });

        // This adds a simple command that can be triggered anywhere
        this.addCommand({
            id: 'nyan',
            name: 'Add a nyan cat bar',
            editorCallback: (editor: Editor) => {
                editor.setLine(editor.getCursor().line, '```nyanbar\nauto\n```');
            },
        });

		this.addCommand({
            id: 'pusheen',
            name: 'Add a pusheen cat bar',
            editorCallback: (editor: Editor) => {
                editor.setLine(editor.getCursor().line, '```pusheenbar\nauto\n```');
            },
        });

    }
}
