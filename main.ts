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
	mySetting: string;
}

const DEFAULT_SETTINGS: BudgetSettings = {
	mySetting: "default",
};

export default class budgetPlugin extends Plugin {
	settings: BudgetSettings | "test" = DEFAULT_SETTINGS;

	async onload() {
		console.log(this.settings);
		///// starting the app
		// addRibbon icon
		const ribbonIconEl = this.addRibbonIcon(
			"dollar-sign",
			"New Expense",
			(evt: MouseEvent) => {
				new Notice("New Expense Modal");
				// need to start modal
				new ExpenseModal(
					this.app,
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
		// Adds a setting tag so the user ca configure the aspects of the plugin
		this.addSettingTab(new ExpenseSettingTab(this.app, this));
	}

	onunload(): void {}

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
}

export class ExpenseModal extends Modal {
	expenseAmount: string = "120";
	expenseCategory: string;
	expenseAccount: string = "cash";
	expenseValue: string = "basics";

	onSubmit: (
		expenseAmount: string,
		expenseCategory: string,
		expenseAccount: string,
		expenseValue: string
	) => void;

	constructor(
		app: App,
		onSubmit: (
			expenseAmount: string,
			expenseCategory: string,
			expenseAccount: string,
			expenseValue: string
		) => void
	) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h1", { text: "Enter new Expense" });

		new Setting(contentEl).setName("Amount").addText((text) =>
			text.onChange((value) => {
				this.expenseAmount = value;
			})
		);

		// move this to the setting
		const category = [
			{ categoryId: 1, categoryName: "Eat", categoryIcon: "carrot" },
			{
				categoryId: 2,
				categoryName: "Home",
				categoryIcon: "home",
			},
			{
				categoryId: 3,
				categoryName: "Leisure",
				categoryIcon: "armchair",
			},
			{
				categoryId: 4,
				categoryName: "Beauty",
				categoryIcon: "glasses",
			},
			{
				categoryId: 5,
				categoryName: "Holidays",
				categoryIcon: "caravan",
			},
			{
				categoryId: 6,
				categoryName: "Transport",
				categoryIcon: "car",
			},
		];

		const categorySetting = new Setting(contentEl).setName("Category");
		category.forEach((c) => {
			const setting = categorySetting.addButton((btn: ButtonComponent) =>
				btn
					.setButtonText(c.categoryName)
					.setIcon(c.categoryIcon)
					.setTooltip(c.categoryName)
					.onClick(() => {
						this.expenseCategory = c.categoryName;
						new Notice(`Selected Category: ${c.categoryName}`);
						btn.setCta();
					})
			);
		});

		new Setting(contentEl).setName("Account").addText((text) =>
			text.onChange((value = "cash") => {
				this.expenseAccount = value;
			})
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
		let { contentEl } = this;
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
		console.log(this.plugin.settings);
		containerEl.empty();

		new Setting(containerEl)
			.setName("MySetting.settings")
			.setDesc("Category 1")
			.addText((text) =>
				text
					.setPlaceholder("First setting = categories")
					.setValue(this.plugin.settings.mySetting)
					.onChange(async (value) => {
						this.plugin.settings.mySetting = value;
						await this.plugin.saveSettings();
						console.log("Secret: " + value);
					})
			);
	}
}
