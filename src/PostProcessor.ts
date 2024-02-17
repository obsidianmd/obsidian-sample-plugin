import { MarkdownPostProcessorContext } from "obsidian";
import MyPlugin from "./main";
import { linkThumbnailWidgetParams } from "./EnbedDecoratiion";

export class PostProcessor {
	plugin: MyPlugin;

	constructor(plugin: MyPlugin) {
		this.plugin = plugin;
	}

	processor = async (
		element: HTMLElement,
		context: MarkdownPostProcessorContext
	) => {
		// 링크 변환
		const linkEls = element.findAll("a.external-link");
		for (const linkEl of linkEls) {
			// dataview 클래스를 가진 부모 요소를 확인합니다.
			if (linkEl.closest(".dataview") !== null) {
				continue;
			}

			const url = linkEl.innerHTML;
			const params = await linkThumbnailWidgetParams(url);
			if (params != null) {
				linkEl.innerHTML = params;
			}
		}
	};

	isDisabled = (el: Element) => {
		return false;
	};
}
