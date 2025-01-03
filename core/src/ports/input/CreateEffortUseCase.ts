import Effort from "../../domain/effort/Effort";
import Area from "../../domain/Area";

export default interface CreateEffortUseCase {
	taskUnderArea(area: Area): Promise<Effort>;

	taskUnderEffort(parentEffort: Effort): Promise<Effort>;
}
