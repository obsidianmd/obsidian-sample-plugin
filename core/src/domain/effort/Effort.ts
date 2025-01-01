import KObject from "../KObject";
import {EffortStatus} from "./EffortStatus";
import {KOC} from "../KOC";
import Area from "../Area";
import {UUID} from "node:crypto";

export default class Effort extends KObject {
	constructor(public id: UUID,
				public title: string,
				public status: EffortStatus,
				public started: Date | null,
				public ended: Date | null,
				public area: Area | null) {
		super(id, KOC.EMS_EFFORT);
	}

	start() {
		this.started = new Date();
		this.status = EffortStatus.STARTED;
	}

	end() {
		this.ended = new Date();
		this.status = EffortStatus.ENDED;
	}
}
