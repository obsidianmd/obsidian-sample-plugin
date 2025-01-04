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

	// noinspection JSUnusedGlobalSymbols
	async list(links: Link[]) {
		const div = document.createElement("div");
		div.addClass("dv-renderer");

		await this.dvApi.list(links, div, this.component,
			this.mdCtx.sourcePath // TODO maybe this in unnecessary
		);

		return div;
	}

	async table(headers: string[], rows: any[][]) {
		const div = document.createElement("div");
		div.addClass("dv-renderer");

		await this.dvApi.table(headers, rows, div, this.component,
			this.mdCtx.sourcePath // TODO maybe this in unnecessary
		);

		return div;
	}
}
