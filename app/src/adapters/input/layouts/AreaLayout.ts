import Layout from "./Layout";
import ExoContext from "../../../../../common/ExoContext";
import Area from "../../../../../core/src/domain/Area";
import DvRenderer from "../../../utils/dv/DvRenderer";
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
        const headers = ["Effort", "Area", "Status", "Votes"];
        const rows = unresolvedEfforts.map(e => {
            const effortLink = this.toLink(e);
            const aresStr = e.area?.name ?? "--"; // TODO use inherited area
            const statusStr = e.status;
            const votesStr = "--"; // TODO implement votes
            return [effortLink, aresStr, statusStr, votesStr];
        });
        return await this.dvRender.table(headers, rows);
    }

    private toLink(e: Effort) {
        let file = this.ctx.appUtils.getObjectFileOrThrow(e);
        return this.dvRender.dvApi.fileLink(file.path);
    }
}
