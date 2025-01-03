import CreateEffortUseCase from "../ports/input/CreateEffortUseCase";
import Area from "../domain/Area";
import {EffortStatus} from "../domain/effort/EffortStatus";
import Effort from "../domain/effort/Effort";
import ExoContext from "../../../common/ExoContext";

export default class CreateEffortService implements CreateEffortUseCase {
	constructor(private ctx: ExoContext) {
	}

	async taskUnderArea(area: Area): Promise<Effort> {
		const title = this.ctx.utils.generateUid();
		const id = this.ctx.utils.generateUid();
		const effort = new Effort(id, title, EffortStatus.DRAFT, null, null, area, null, "Body");

		await this.ctx.effortRepository.save(effort);

		return effort;
	}

	async taskUnderEffort(parentEffort: Effort): Promise<Effort> {
		const title = this.ctx.utils.generateUid();
		const id = this.ctx.utils.generateUid();
		const effort = new Effort(id, title, EffortStatus.DRAFT, null, null, null, parentEffort, "Body");

		await this.ctx.effortRepository.save(effort);

		return effort;
	}

}
