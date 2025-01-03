import ExoContext from "../../../common/ExoContext";
import Effort from "../../../core/src/domain/effort/Effort";

export default class EffortPathRulesHelper {
	constructor(private ctx: ExoContext) {
	}

	getEffortPath(effort: Effort) {
		if (effort.area !== null) {
			const areaFile = this.ctx.appUtils.getObjectFileOrThrow(effort.area);
			const areaFolder = areaFile.parent;
			if (!areaFolder) {
				throw new Error("Area file has no parent folder");
			}

			return areaFolder.path;
		}

		if (effort.parent !== null) {
			const parentFile = this.ctx.appUtils.getObjectFileOrThrow(effort.parent);
			const parentFolder = parentFile.parent;
			if (!parentFolder) {
				throw new Error("Effort parent file has no parent folder");
			}

			return parentFolder.path;
		}

		return "/0 Inbox/";
	}
}
