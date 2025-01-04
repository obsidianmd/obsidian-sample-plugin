import ExoContext from "../../../../common/ExoContext";
import {Component, MarkdownPostProcessorContext} from "obsidian";
import {DataviewApi} from "api/plugin-api";
import {getAPI, Link} from "obsidian-dataview";

/**
 * Dataview renderer for MarkdownPostProcessing
 */
export default class DvRenderer {
	public readonly dvApi: DataviewApi;

	constructor(private exoCtx: ExoContext,
				private mdCtx: MarkdownPostProcessorContext,
				private component: Component) {
		const dvApi: DataviewApi | undefined = getAPI(this.exoCtx.app);
		if (!dvApi) {
			throw new Error('Dataview API not available.');
		}
		this.dvApi = dvApi;
	}

	async list(links: Link[], el: HTMLElement) {
		await this.dvApi.list(
			links,
			el,
			this.component,
			this.mdCtx.sourcePath // TODO maybe this in unnecessary
		);
	}
}
