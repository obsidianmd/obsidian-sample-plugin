import KObject from "./KObject";
import {UUID} from "node:crypto";
import {KOC} from "./KOC";

export default class DailyNote extends KObject {
	constructor(public id: UUID,
				public date: Date) {
		super(id, KOC.TMS_DN);
	}
}
