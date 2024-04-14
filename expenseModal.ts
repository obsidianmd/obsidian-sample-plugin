// this modal opens a new modal to add a new expense and write it down on the budgetMarkdownFile

import {
	App,
	Modal,
	Notice,
	ButtonComponent,
	MarkdownView,
	Setting,
} from "obsidian";
import budgetPlugin from "./main";
import { DEFAULT_SETTINGS } from "./main";

export class ExpenseModal extends Modal {
	plugin: budgetPlugin = DEFAULT_SETTINGS;
	expenseAmount: string;
	expenseAccount: string;
	expenseCategory: string;
	expenseValue: string;

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

		// create a currency formatter
		// to do : get regional settings from obsidian
		const formatter = new Intl.NumberFormat("fr-FR", {
			style: "currency",
			currency: pluginData.currency,
		});

		// input field for the expense amount
		new Setting(contentEl).setName("Amount").addText((text) =>
			text.onChange((value) => {
				// convert comma to dot (need to check this if internationalizing)
				if (value.includes(",")) {
					value = value.replace(",", ".");
				}
				this.expenseAmount = value;
			})
		);

		// focus on the input field expense
		const inputElement = contentEl.querySelector("input");
		if (inputElement) {
			inputElement.focus();
		}

		// create category button with icon and tooltip
		const categorySetting = new Setting(contentEl).setName("Category");

		let selectedButton: ButtonComponent | null = null;

		Object.entries(pluginData.expenseCategories).forEach(
			([key, value]: [string, { icon: string; name: string }]) => {
				categorySetting.addButton((btn: ButtonComponent) =>
					btn
						.setButtonText(key)
						.setIcon(value.icon)
						.setTooltip(value.name)
						.onClick(() => {
							// remove the cta from the previous button
							if (selectedButton) {
								selectedButton.removeCta();
							}
							selectedButton = btn;
							this.expenseCategory = value.name;
							new Notice(`Selected Category: ${value.name}`);
							btn.setCta();
						})
				);
			}
		);

		// create account button with icon and tooltip
		const accountSetting = new Setting(contentEl).setName("Account");

		let selectedButton2: ButtonComponent | null = null;

		Object.entries(pluginData.expenseAccounts).forEach(
			([key, value]: [string, { icon: string; name: string }]) => {
				accountSetting.addButton((btn: ButtonComponent) =>
					btn
						.setButtonText(key)
						.setIcon(value.icon)
						.setTooltip(value.name)
						.onClick(() => {
							// remove the cta from the previous button
							if (selectedButton2) {
								selectedButton2.removeCta();
							}
							selectedButton2 = btn;
							this.expenseAccount = value.name;
							new Notice(`Selected Account: ${value.name}`);
							btn.setCta();
						})
				);
			}
		);

		const valueSetting = new Setting(contentEl).setName("Value");

		let selectedButton3: ButtonComponent | null = null;

		Object.entries(pluginData.expenseValues).forEach(
			([key, value]: [string, { icon: string; name: string }]) => {
				valueSetting.addButton((btn: ButtonComponent) =>
					btn
						.setButtonText(key)
						.setIcon(value.icon)
						.setTooltip(value.name)
						.onClick(() => {
							// remove the cta from the previous button
							if (selectedButton3) {
								selectedButton3.removeCta();
							}
							selectedButton3 = btn;
							this.expenseValue = value.name;
							new Notice(`Selected Value: ${value.name}`);
							btn.setCta();
						})
				);
			}
		);

		// submit button
		new Setting(contentEl).addButton((btn) =>
			btn
				.setButtonText("Submit")
				.setCta()
				.onClick(() => {
					// check if all fields are filled
					if (
						this.expenseAmount &&
						this.expenseCategory &&
						this.expenseAccount &&
						this.expenseValue
					) {
						new Notice("Expense added");
						this.close();
						this.onSubmit(
							this.expenseAmount,
							this.expenseCategory,
							this.expenseAccount,
							this.expenseValue
						);
						const file = this.app.workspace.getActiveFile();
						if (file) {
							const editor =
								this.app.workspace.getActiveViewOfType(
									MarkdownView
								);
							if (editor) {
								// get today date and format YYYY-MM-DD
								const today = new Date();
								const todayFormatted = today
									.toISOString()
									.split("T")[0];

								// move the cursor on start of line 3
								editor.editor.setCursor(2, 0);
								// insert the new expense on line 3
								editor.editor.replaceSelection(
									`| ${todayFormatted} | ${formatter.format(
										Number(this.expenseAmount)
									)} | ${this.expenseCategory} | ${
										this.expenseAccount
									} | ${this.expenseValue} | \n`
								);
							}
						} else {
							console.log("Debug: no active file");
						}
					} else {
						new Notice("Please fill all the fields");
						return;
					}
				})
		);
	}
	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
