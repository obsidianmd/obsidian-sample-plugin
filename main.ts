import {Plugin, TFile} from 'obsidian';
import {ExoMainModal} from "./app/src/ExoMainModal";
import "localforage";
import ExoApi from "./core/src/ExoApi";
import ExoContext from "./common/ExoContext";

export default class ExoPlugin extends Plugin {
	private api: ExoApi;
	private ctx: ExoContext;

	async onload() {
		this.ctx = new ExoContext(this.app);
		this.api = new ExoApi(this.ctx);

		this.addRibbonIcon('star', 'Exocortex commands List', () => {
			new ExoMainModal(this.ctx).open();
		});

		this.registerMarkdownPostProcessor(async (el, ctx) => {
			if (!ctx.frontmatter || !ctx.frontmatter.tags) {
				return;
			}

			if (el.classList.contains("mod-ui")) {
				const file: TFile = this.ctx.appUtils.getFileByPathOrThrow(ctx.sourcePath);
				console.log(file)
				const ko = await this.ctx.kObjectCreator.createFromTFileTyped(file);
				const layout = this.ctx.layoutFactory.create(ko);
				if (!layout) {
					return;
				}

				const renderText = await layout.render(ko);
				el.prepend(renderText);
			}
		});
	}
}
