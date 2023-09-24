import { App, Modal, Setting } from "obsidian";

class ModifyModal extends Modal {
    tags: string
    postId: string
    onSubmit: (tags: string, postId: string) => void;

    constructor(app: App, onSubmit: (tags: string, postId: string) => void) {
        super(app)
        this.onSubmit = onSubmit
    }

    onOpen(): void {
        const {contentEl} = this
        contentEl.createEl("h1", {text: "Modify Post"})

        new Setting(contentEl)
        .setName("Tag")
        .setDesc("enter tag separate by `,`")
        .addText((text) =>
            text.onChange((value) => {
                this.tags = value
            })
        )

        new Setting(contentEl)
        .setName("Post ID")
        .setDesc("enter post id to modifiy ")
        .addText((text) =>
            text.onChange((value) => {
                this.postId = value
            })
        )

        new Setting(contentEl).addButton((button) => {
            button
            .setButtonText("Submit")
            .setCta()
            .onClick(() => {
                this.close()
                this.onSubmit(this.tags, this.postId)
            })
        })
    }

    onClose(): void {
        const {contentEl} = this
        contentEl.empty()
    }
}

export default ModifyModal