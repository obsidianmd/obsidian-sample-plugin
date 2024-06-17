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
        const renderBar = (el: HTMLElement, completionPercentage: number, catType: string) => {
            let div = el.createEl('div');
            div.addClass('divCont');
            let rainbowCont = div.createEl('div');
            if (catType === 'nyan') {
                rainbowCont.addClass('rainbowNyan');
            } else if (catType === 'pusheen') {
                rainbowCont.addClass('rainbowPusheen');
            }
            rainbowCont.style.width = completionPercentage + '%'; // Ensure the container takes full width
            let catImg = div.createEl('img');
            catImg.addClass('img' + catType.charAt(0).toUpperCase() + catType.slice(1));
            let txt = el.createEl('h4');
            txt.textContent = completionPercentage + '%';
            txt.addClass('txt');
            if (completionPercentage < 5) {
                catImg.addClass(catType + 'Transform1');
                catImg.removeClass(catType + 'Transform2');
            } else {
                catImg.addClass(catType + 'Transform2');
                catImg.removeClass(catType + 'Transform1');
            }
        };

        this.registerMarkdownCodeBlockProcessor('nyanbar', async (source, el, ctx) => {
            const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (!markdownView) return;

            let completionPercentage = 0;

            if (source.trim() === 'auto') {
                const checkboxes = markdownView.contentEl.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
                const totalCheckboxes = checkboxes.length;
                let checkedCount = 0;

                checkboxes.forEach((checkbox) => {
                    if (checkbox.checked) {
                        checkedCount++;
                    }
                });

                completionPercentage = totalCheckboxes > 0 ? Math.round((checkedCount / totalCheckboxes) * 100) : 0;
            } else {
                if (parseInt(source.trim()) >= 0 && parseInt(source.trim()) <= 100) {
                    completionPercentage = Math.min(100, Math.max(0, Number(source.trim())));
                } else {
                    el.createEl('h4', { text: '[ERROR: Invalid Value]' }).addClass('e');
                    el.createEl('p', { text: 'NYANBAR-ERROR' }).addClass('e1');
                    return;
                }
            }

            renderBar(el, completionPercentage, 'nyan');
        });

        this.registerMarkdownCodeBlockProcessor('pusheenbar', async (source, el, ctx) => {
            const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (!markdownView) return;

            let completionPercentage = 0;

            if (source.trim() === 'auto') {
                const checkboxes = markdownView.contentEl.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
                const totalCheckboxes = checkboxes.length;
                let checkedCount = 0;

                checkboxes.forEach((checkbox) => {
                    if (checkbox.checked) {
                        checkedCount++;
                    }
                });

                completionPercentage = totalCheckboxes > 0 ? Math.round((checkedCount / totalCheckboxes) * 100) : 0;
            } else {
                if (parseInt(source.trim()) >= 0 && parseInt(source.trim()) <= 100) {
                    completionPercentage = Math.min(100, Math.max(0, Number(source.trim())));
                } else {
                    el.createEl('h4', { text: '[ERROR: Invalid Value]' }).addClass('e');
                    el.createEl('p', { text: 'PUSHEENBAR-ERROR' }).addClass('e1');
                    return;
                }
            }

            renderBar(el, completionPercentage, 'pusheen');
        });

        // Optional: Commands and other onload setup
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
