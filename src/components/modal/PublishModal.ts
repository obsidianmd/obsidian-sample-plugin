import { App, Modal, Setting } from "obsidian";

class PublishModal extends Modal {
    tags: string;
    onSubmit: (tags: string) => void;

    constructor(app: App, onSubmit: (tags: string) => void) {
        super(app)
        this.onSubmit = onSubmit
    }

    onOpen(): void {
        const {contentEl} = this
        contentEl.createEl("h1", {text: "Insert tag"})

        // create input tags box
        new Setting(contentEl)
        .setName("Tag")
        .setDesc("input tag separate by `,`")
        .addText((text) =>
            text.onChange((value) => {
                this.tags = value
            })
        )

        // create submit button
        new Setting(contentEl).addButton((button) => {
            button
            .setButtonText("Submit")
            .setCta()
            .onClick(() => {
                this.close()
                this.onSubmit(this.tags)
            })
        })
    }

    onClose(): void {
        const {contentEl} = this
        contentEl.empty()
    }
}

export default PublishModal