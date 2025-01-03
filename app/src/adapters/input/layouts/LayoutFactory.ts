import AreaLayout from "./AreaLayout";
import {KOC} from "../../../../../core/src/domain/KOC";
import ExoContext from "../../../../../common/ExoContext";
import KObject from "../../../../../core/src/domain/KObject";
import Layout from "./Layout";

export default class LayoutFactory {
	constructor(private ctx: ExoContext) {
	}

	create(ko: KObject): Layout<KObject> | null {
		switch (ko.koc) {
			case KOC.EMS_AREA:
				return new AreaLayout(this.ctx);
			default:
				return null;
		}
	}
}
