import { Plugin, Editor, MarkdownView, MarkdownRenderer } from "obsidian";
import { DEFFAULT_SETTINGS, TistoryPublisherSettings } from "./components/settings";
import PublishModal from "./components/modal";
import createPostApi from "./api/createPostApi";
import TistoryPublisherSettingTab from "./components/settingTab";

export default class TistoryPublisherPlugin extends Plugin {
	settings: TistoryPublisherSettings

	async onload() {
		// load default settings
		await this.loadSettings()
		this.addSettingTab(new TistoryPublisherSettingTab(this.app, this))

		// create publish-to-tistory custom command
		this.addCommand({
			id: "publish-to-tistory",
			name: "publish current note to tistory",
			editorCallback: (editor: Editor, view: MarkdownView) => {
				new PublishModal(this.app, async (tag: string) => {
					const el = document.createElement("div")
					await MarkdownRenderer.render(
						this.app,
						editor.getValue(),
						el,
						this.app.workspace.getActiveFile()?.path ?? "/",
						view
					)
					await createPostApi({
						"accessToken": this.settings.accessToken,
						"blogName": this.settings.blogName,
						"title": view.getDisplayText(),
						"tag": tag,
						"visibility": this.settings.visibility,
						"content": el.innerHTML
					})
				}).open()
			}
		});
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFFAULT_SETTINGS, await this.loadData())
	}

	async saveSettings() {
		await this.saveData(this.settings)
	}
}