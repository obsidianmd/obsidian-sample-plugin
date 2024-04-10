import test from "node:test";
import {
	App,
	ButtonComponent,
	Editor,
	MarkdownEditView,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	setIcon,
} from "obsidian";

interface BudgetSettings {
	expenseCategories: object;
	expenseAccounts: object;
	expenseValues: object;
}

const DEFAULT_SETTINGS: BudgetSettings = {
	expenseCategories: [
		{ name: "Eat", icon: "carrot" },
		{ name: "Home", icon: "home" },
		{ name: "Leisure", icon: "armchair" },
		{ name: "Beauty", icon: "glasses" },
		{ name: "Holidays", icon: "caravan" },
		{ name: "Transport", icon: "car" },
	],
	expenseAccounts: [
		{ name: "Cash", icon: "Cash" },
		{ name: "Credit Card", icon: "Credit Card" },
	],
	expenseValues: [
		{ name: "Basics", icon: "Basics" },
		{ name: "Medium", icon: "Medium" },
		{ name: "Luxury", icon: "Luxury" },
	],
};

export default class budgetPlugin extends Plugin {
	settings: BudgetSettings;

	async onload() {
		await this.loadSettings();

		const ribbonIconEl = this.addRibbonIcon(
			"dollar-sign",
			"New Expense",
			(evt: MouseEvent) => {
				new Notice("New Expense Modal");
				// need to start modal
				new ExpenseModal(
					this.app,
					this,
					(
						expenseAmount,
						expenseCategory,
						expenseAccount,
						expenseValue
					) => {
						new Notice(
							`${expenseAmount}, ${expenseCategory}, ${expenseAccount}, ${expenseValue}`
						);
					}
				).open();

				// need to set active md file to budget
				console.log("Debug: trigger new expense modal from ribbon");
			}
		);
		// Adds a setting tag so the user can configure the aspects of the plugin
		this.addSettingTab(new ExpenseSettingTab(this.app, this));
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	onunload(): void {}
}

export class ExpenseModal extends Modal {
	plugin: budgetPlugin;
	expenseAmount: string = "120";
	expenseCategory: string;
	expenseValue: string = "basics";

	onSubmit: (
		expenseAmount: string,
		expenseCategory: string,
		expenseAccount: string,
		expenseValue: string
	) => void;

	constructor(
		app: App,
		plugin: budgetPlugin,
		onSubmit: (
			expenseAmount: string,
			expenseCategory: string,
			expenseAccount: string,
			expenseValue: string
		) => void
	) {
		super(app);
		this.plugin = plugin;
		this.onSubmit = onSubmit;
	}

	async onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h1", { text: "Enter new Expense" });

		// get the data from the plugin settings
		const pluginData = await this.plugin.loadData();

		// input field for the expense amount
		new Setting(contentEl).setName("Amount").addText((text) =>
			text.onChange((value) => {
				this.expenseAmount = value;
			})
		);

		// create category button with icon and tooltip
		const categorySetting = new Setting(contentEl).setName("Category");

		Object.entries(pluginData.expenseCategories).forEach(
			([key, value]: [string, { icon: string; name: string }]) => {
				categorySetting.addButton((btn: ButtonComponent) =>
					btn
						.setButtonText(key)
						.setIcon(value.icon)
						.setTooltip(value.name)
						.onClick(() => {
							this.expenseCategory = value.name;
							new Notice(`Selected Category: ${value.name}`);
							btn.setCta();
						})
				);
			}
		);

		new Setting(contentEl).setName("Rating").addText((text) =>
			text.onChange((value) => {
				this.expenseValue = value;
			})
		);

		new Setting(contentEl).addButton((btn) =>
			btn
				.setButtonText("Submit")
				.setCta()
				.onClick(() => {
					this.close();
					this.onSubmit(
						this.expenseAmount,
						this.expenseCategory,
						this.expenseAccount,
						this.expenseValue
					);
					const file = this.app.workspace.getActiveFile();
					if (file) {
						console.log("Debug: active file", file.basename);
						const editor =
							this.app.workspace.getActiveViewOfType(
								MarkdownView
							);
						if (editor) {
							console.log("Debug: active editor", editor);
							// get today date and format YYYY-MM-DD
							const today = new Date();
							const todayFormatted = today
								.toISOString()
								.split("T")[0];

							// move the cursor on start of line 3
							editor.editor.setCursor(2, 0);
							// insert the new expense on line 3
							editor.editor.replaceSelection(
								`| ${todayFormatted} | ${this.expenseAmount} | ${this.expenseCategory} | ${this.expenseAccount} | ${this.expenseValue} | \n`
							);
						}
					} else {
						console.log("Debug: no active file");
					}
				})
		);
	}
	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class ExpenseSettingTab extends PluginSettingTab {
	plugin: budgetPlugin;

	constructor(app: App, plugin: budgetPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		const expenseCategories = this.plugin.settings.expenseCategories;
		console.log(expenseCategories);
		const expenseAccounts = this.plugin.settings.expenseAccounts;
		const expenseValues = this.plugin.settings.expenseValues;

		new Setting(containerEl).setName("Expense Categories");
		if (Array.isArray(expenseCategories)) {
			expenseCategories.forEach((item, index) => {
				new Setting(containerEl)
					.setDesc(`Category number ${index + 1}`)
					.addText((text) =>
						text
							.setPlaceholder(`Name = ${item.name}`)
							.setValue(item.name)
							.onChange(async (value) => {
								console.log("Updated name: " + value);
								this.plugin.settings.expenseCategories[
									index
								].name = value;
								await this.plugin.saveSettings();
							})
					)
					.addText((text) =>
						text
							.setPlaceholder(`Icon = ${item.icon}`)
							.setValue(item.icon)
							.onChange(async (value) => {
								console.log("Updated icon: " + value);
								this.plugin.settings.expenseCategories[
									index
								].icon = value;
								await this.plugin.saveSettings();
							})
					);
			});
		}

		new Setting(containerEl).setName("Expense Accounts");
		if (Array.isArray(expenseAccounts)) {
			expenseAccounts.forEach((item, index) => {
				new Setting(containerEl)
					.setDesc(`Account number ${index + 1}`)
					.addText((text) =>
						text
							.setPlaceholder(`Name = ${item.name}`)
							.setValue(item.name)
							.onChange(async (value) => {
								console.log("Updated name: " + value);
								this.plugin.settings.expenseAccounts[
									index
								].name = value;
								await this.plugin.saveSettings();
							})
					)
					.addText((text) =>
						text
							.setPlaceholder(`Icon = ${item.icon}`)
							.setValue(item.icon)
							.onChange(async (value) => {
								console.log("Updated icon: " + value);
								this.plugin.settings.expenseAccounts[
									index
								].icon = value;
								await this.plugin.saveSettings();
							})
					);
			});
		}

		new Setting(containerEl).setName("Expense Values");
		if (Array.isArray(expenseValues)) {
			expenseValues.forEach((item, index) => {
				new Setting(containerEl)
					.setDesc(`Account number ${index + 1}`)
					.addText((text) =>
						text
							.setPlaceholder(`Name = ${item.name}`)
							.setValue(item.name)
							.onChange(async (value) => {
								console.log("Updated name: " + value);
								this.plugin.settings.expenseValues[index].name =
									value;
								await this.plugin.saveSettings();
							})
					)
					.addText((text) =>
						text
							.setPlaceholder(`Icon = ${item.icon}`)
							.setValue(item.icon)
							.onChange(async (value) => {
								console.log("Updated icon: " + value);
								this.plugin.settings.expenseValues[index].icon =
									value;
								await this.plugin.saveSettings();
							})
					);
			});
		}
	}
}
