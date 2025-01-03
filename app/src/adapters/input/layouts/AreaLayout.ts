import Layout from "./Layout";
import ExoContext from "../../../../../common/ExoContext";
import Area from "../../../../../core/src/domain/Area";

export default class AreaLayout implements Layout<Area> {
	constructor(private ctx: ExoContext) {
	}

	async render(ko: Area): Promise<HTMLDivElement> {
		const renderText = document.createElement("div");

		const unresolvedEfforts = await this.ctx.effortRepository.find(e => {
			if (e.area === null) {
				return false;
			}
			const sameArea = e.area.id == ko.id;
			const unresolved = e.isUnresolved();
			return sameArea && unresolved;
		});

		if (unresolvedEfforts.length > 0) {
			let h1 = document.createElement("h1");
			h1.textContent = "Unresolved Efforts";
			renderText.appendChild(h1);

			let table = document.createElement("table");
			renderText.appendChild(table);

			const headerRow = document.createElement("tr");
			const th = document.createElement("th");
			th.innerText = "Name";
			headerRow.appendChild(th);
			table.appendChild(headerRow);

			for (let effort of unresolvedEfforts) {
				const tr = document.createElement("tr");
				let td = document.createElement("td");
				td.textContent = "[[" + effort.title + "]]";
				tr.appendChild(td);
				table.appendChild(tr);
			}
		}

		return renderText;
	}
}
