import CreateEffortUseCase from "../ports/input/CreateEffortUseCase";
import Area from "../domain/Area";
import {EffortStatus} from "../domain/effort/EffortStatus";
import EffortRepository from "../ports/output/EffortRepository";
import {UUID} from "node:crypto";
import Effort from "../domain/effort/Effort";

export default class CreateEffortService implements CreateEffortUseCase {
	constructor(private effortRepository: EffortRepository) {
	}

	async taskUnderArea(area: Area): Promise<Effort> {
		const title = crypto.randomUUID();
		const id = crypto.randomUUID() as UUID;
		const effort = new Effort(id, title, EffortStatus.DRAFT, null, null, area, null, "Body");

		await this.effortRepository.save(effort);

		return effort;
	}

}
