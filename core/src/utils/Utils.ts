import {UUID} from "node:crypto";

export default class Utils {
	generateUid(): UUID {
		return crypto.randomUUID() as UUID;
	}
}
