import {KOC} from "../../../core/src/domain/KOC";

export default class KOCFactory {
	static create(tags: string[]) {
		if (tags.includes("IMS/MOC")) {
			return KOC.IMS_MOC
		} else if (tags.includes("EMS/Area")) {
			return KOC.EMS_AREA;
		} else if (tags.includes("EMS/Effort")) {
			return KOC.EMS_EFFORT;
		} else if (tags.includes("TMS/DailyNote")) {
			return KOC.TMS_DN;
		} else {
			return KOC.UNKNOWN;
		}
	}
}
