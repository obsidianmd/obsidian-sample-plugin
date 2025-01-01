import Effort from "../../domain/effort/Effort";

export default interface EffortRepository {
	save(effort: Effort): void;
}
