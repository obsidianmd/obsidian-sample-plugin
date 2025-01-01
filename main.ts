import {Plugin} from 'obsidian';
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
	}
}
