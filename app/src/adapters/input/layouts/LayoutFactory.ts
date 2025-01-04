import {KOC} from "../../../../../core/src/domain/KOC";
import ExoContext from "../../../../../common/ExoContext";
import KObject from "../../../../../core/src/domain/KObject";
import AreaLayoutDv from "./AreaLayout";
import DvRenderer from "../../../utils/dv/DvRenderer";
import Layout from "./Layout";

export default class LayoutFactory {
	constructor(private ctx: ExoContext) {
	}

	create(ko: KObject, dvRender: DvRenderer): Layout<KObject> | null {
		switch (ko.koc) {
			case KOC.EMS_AREA:
				return new AreaLayoutDv(this.ctx, dvRender);
			default:
				return null;
		}
	}
}
