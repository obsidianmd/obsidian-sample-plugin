import MyPlugin from "./main";
import { App, PluginManifest } from "obsidian";

jest.mock("obsidian");
(window.setInterval as unknown) = jest.fn();

describe("MyPlugin", () => {
	let plugin: MyPlugin;
	beforeEach(async () => {
		plugin = new MyPlugin(new App(), {} as PluginManifest);
	});

	it("Should register two open modal commands", async () => {
		const addCommandSpy = jest.spyOn(plugin, "addCommand");
		await plugin.onload();
		expect(addCommandSpy).toHaveBeenCalledWith({
			id: "open-sample-modal-simple",
			name: "Open sample modal (simple)",
			callback: expect.any(Function),
		});
		expect(addCommandSpy).toHaveBeenCalledWith({
			id: "open-sample-modal-complex",
			name: "Open sample modal (complex)",
			checkCallback: expect.any(Function),
		});
	});

	it("Should register a settings tab", async () => {
		const addSettingSpy = jest.spyOn(plugin, "addSettingTab");
		await plugin.onload();
		expect(addSettingSpy).toHaveBeenCalledWith(expect.any(Object));
	});

	it("Should load data and save as settings", async () => {
		const loadDataSpy = jest.spyOn(plugin, "loadData");
		await plugin.onload();
		expect(loadDataSpy).toHaveBeenCalled();
	});
});
