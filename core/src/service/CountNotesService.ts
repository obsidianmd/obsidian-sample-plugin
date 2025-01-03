import CountNotesUseCase from "../ports/input/CountNotesUseCase";
import AppUtils from "../../../app/src/utils/AppUtils";

export default class CountNotesService implements CountNotesUseCase {

	constructor(private appUtils: AppUtils) {
	}

	count(): number {
		return this.appUtils.getAllMdFiles().length;
	}
}
