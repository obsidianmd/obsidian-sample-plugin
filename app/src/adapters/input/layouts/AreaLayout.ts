import Layout from "./Layout";
import ExoContext from "../../../../../common/ExoContext";
import Area from "../../../../../core/src/domain/Area";
import DvRenderer from "../../../utils/dv/DvRenderer";
import {Link} from "obsidian-dataview";
import Effort from "../../../../../core/src/domain/effort/Effort";

export default class AreaLayout implements Layout<Area> {
	constructor(private ctx: ExoContext, private dvRender: DvRenderer) {
	}

	async render(ko: Area, el: HTMLElement): Promise<void> {
		const unresolvedEfforts = await this.ctx.effortRepository.find(e => {
			if (e.area === null) {
				return false;
			}
			const sameArea = e.area.id == ko.id;
			const unresolved = e.isUnresolved();
			return sameArea && unresolved;
		});

		if (unresolvedEfforts.length > 0) {
			let header = this.createH1("Unresolved Efforts");
			el.appendChild(header);

			const dvTable = await this.createTable(unresolvedEfforts);
			el.appendChild(dvTable)
		}
	}

	private createH1(textContent: string) {
		const h1 = document.createElement("h1");
		h1.textContent = textContent;
		return h1;
	}

	private async createTable(unresolvedEfforts: Effort[]) {
		let effortsLinks: Link[] = unresolvedEfforts.map(e => {
			let file = this.ctx.appUtils.getObjectFileOrThrow(e);
			return this.dvRender.dvApi.fileLink(file.path);
		});
		const dvDiv = document.createElement("div");
		await this.dvRender.list(effortsLinks, dvDiv);
		return dvDiv;
	}
}
