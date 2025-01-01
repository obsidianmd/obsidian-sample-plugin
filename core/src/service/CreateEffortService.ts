import CreateEffortUseCase from "../ports/input/CreateEffortUseCase";
import Area from "../domain/Area";
import {EffortStatus} from "../domain/effort/EffortStatus";
import EffortRepository from "../ports/output/EffortRepository";
import {UUID} from "node:crypto";
import Effort from "../domain/effort/Effort";

export default class CreateEffortService implements CreateEffortUseCase {
	constructor(private effortRepository: EffortRepository) {
	}

	taskUnderArea(area: Area): Effort {
		const title = "Task under " + area.name;
		const id = crypto.randomUUID() as UUID;
		const effort = new Effort(id, title, EffortStatus.DRAFT, null, null, area);

		this.effortRepository.save(effort);
		return effort;
	}

}
