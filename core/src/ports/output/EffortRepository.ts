import Effort from "../../domain/effort/Effort";

export default interface EffortRepository {
	save(effort: Effort): Promise<void>;

	find(filter: (e: Effort) => boolean): Promise<Effort[]>;
}
