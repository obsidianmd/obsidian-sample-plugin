import { MarkdownPostProcessorContext } from "obsidian";
import LinkThumbnailPlugin from "./main";
import { LinkThumbnailWidgetParams } from "./LinkThumbnailWidgetParams";

export class PostProcessor {
	plugin: LinkThumbnailPlugin;

	constructor(plugin: LinkThumbnailPlugin) {
		this.plugin = plugin;
	}

	processor = async (
		element: HTMLElement,
		context: MarkdownPostProcessorContext
	) => {
		// 링크 변환
		const linkEls = element.findAll("a.external-link:not(.cm-formatting)");
		for (const linkEl of linkEls) {
			// dataview 클래스를 가진 부모 요소를 확인합니다.
			if (linkEl.closest(".dataview") !== null) {
				continue;
			}
			const url = linkEl.innerHTML;
			const params = await LinkThumbnailWidgetParams(url);
			if (params != null) {
				linkEl.innerHTML = params;
				linkEl.removeClass("external-link");
				linkEl.addClass("markdown-rendered");
			}
		}
	};

	isDisabled = (el: Element) => {
		return false;
	};
}
