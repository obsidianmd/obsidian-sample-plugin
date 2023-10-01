import { App, PluginSettingTab, Setting } from "obsidian";
import BlogPublisherPlugin from "src/main";

class BlogPublisherSettingTab extends PluginSettingTab {
    plugin: BlogPublisherPlugin

    constructor(app: App, plugin: BlogPublisherPlugin) {
        super(app, plugin)
        this.plugin = plugin
    }

    display() {
        const {containerEl: settingContainerEl} = this
        const defaultPlatformOptions = {"tistory": "tistory", "medium": "medium"}
        settingContainerEl.empty()
        settingContainerEl.createEl("h2", {text: "Blog Publisher"})

        new Setting(settingContainerEl)
        .setName("Access Token")
        .setDesc("enter the access token that used to publish the posts.")
        .addText((text) => {
            text.setPlaceholder("Enter your access token")
            .setValue(this.plugin.settings.accessToken)
            .onChange(async (value) => {
                this.plugin.settings.accessToken = value
                await this.plugin.saveSettings()
            })
        })

        new Setting(settingContainerEl)
        .setName("Blog Name")
        .setDesc("enter the blog name that you want to publish.")
        .addText((text) => {
            text.setPlaceholder("Enter your blog name")
            .setValue(this.plugin.settings.blogName)
            .onChange(async (value) => {
                this.plugin.settings.blogName = value
                await this.plugin.saveSettings()
            })
        })

        new Setting(settingContainerEl)
        .setName("Post Visibility")
        .setDesc("enter the visibilty of the post. (0: Private - Default, 1: Protection, 3: Issue)")
        .addText((text) => {
            text.setPlaceholder("Enter your visibility")
            .setValue(this.plugin.settings.visibility)
            .onChange(async (value) => {
                this.plugin.settings.visibility = value
                await this.plugin.saveSettings()
            })
        })

        new Setting(settingContainerEl)
        .setName("Platform")
        .setDesc("select the platform want to publish.")
        .addDropdown((cb) => {
            cb.addOptions(defaultPlatformOptions)
            .setValue(this.plugin.settings.platform)
            .onChange(async (value) => {
                this.plugin.settings.platform = value
                await this.plugin.saveSettings()
            })
        })
    }
}

export default BlogPublisherSettingTab