import { Editor, Plugin } from 'obsidian';

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
            if (!ctx.sourcePath) {
                //codeblock rendered in page preview, no source path available.
                return;
            }
            let checkedTasks = 0;
            let totalTasks = 0;
            for (const listItem of this.app.metadataCache.getCache(ctx.sourcePath)?.listItems!!) {
                if(listItem.task) {
                    totalTasks++;
                    if(listItem.task === 'x') {
                        checkedTasks++;
                    }
                }
            }

            let completionPercentage = 0;

            if (source.trim() === 'auto') {
                completionPercentage = totalTasks > 0 ? Math.round((checkedTasks / totalTasks) * 100) : 0;
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
            if (!ctx.sourcePath) {
                //codeblock rendered in page preview, no source path available.
                return;
            }
            let checkedTasks = 0;
            let totalTasks = 0;
            for (const listItem of this.app.metadataCache.getCache(ctx.sourcePath)?.listItems!!) {
                if(listItem.task) {
                    totalTasks++;
                    if(listItem.task === 'x') {
                        checkedTasks++;
                    }
                }
            }

            let completionPercentage = 0;

            if (source.trim() === 'auto') {
                completionPercentage = totalTasks > 0 ? Math.round((checkedTasks / totalTasks) * 100) : 0;
            } else {
                if (parseInt(source.trim()) >= 0 && parseInt(source.trim()) <= 100) {
                    completionPercentage = Math.min(100, Math.max(0, Number(source.trim())));
                } else {
                    el.createEl('h4', { text: '[ERROR: Invalid Value]' }).addClass('e');
                    el.createEl('p', { text: 'NYANBAR-ERROR' }).addClass('e1');
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
