import CountNotesUseCase from "../ports/input/CountNotesUseCase";
import VaultAdapter from "../../../app/src/adapters/VaultAdapter";

export default class CountNotesService implements CountNotesUseCase {

	constructor(private vaultAdapter: VaultAdapter) {
	}

	count(): number {
		return this.vaultAdapter.getAllMdFiles().length;
	}
}
