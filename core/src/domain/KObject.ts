import {KOC} from "./KOC";
import {UUID} from "node:crypto";

export default class KObject {
	constructor(public readonly id: UUID,
				public readonly koc: KOC) {
	}
}
