import {App} from "obsidian";
import DailyNoteRepository from "../core/src/ports/output/DailyNoteRepository";
import Utils from "../core/src/utils/Utils";
import DailyNoteCreator from "../app/src/utils/DailyNoteCreator";
import VaultAdapter from "../app/src/adapters/VaultAdapter";
import KObjectCreator from "../app/src/utils/KObjectCreator";
import AppUtils from "../app/src/utils/AppUtils";
import CountNotesUseCase from "../core/src/ports/input/CountNotesUseCase";
import CountNotesService from "../core/src/service/CountNotesService";
import DailyNotePersistenceAdapter from "../app/src/adapters/output/DailyNotePersistenceAdapter";
import GetCurrentDailyNoteUseCase from "../core/src/ports/input/GetCurrentDailyNoteUseCase";
import GetCurrentDailyNoteService from "../core/src/service/GetCurrentDailyNoteService";
import CreateEffortUseCase from "../core/src/ports/input/CreateEffortUseCase";
import CreateEffortService from "../core/src/service/CreateEffortService";
import EffortRepository from "../core/src/ports/output/EffortRepository";
import EffortPersistenceAdapter from "../app/src/adapters/output/EffortPersistenceAdapter";
import KObjectUtility from "../app/src/utils/KObjectUtility";

export default class ExoContext {
	public readonly utils: Utils;
	public readonly kObjectCreator: KObjectCreator
	public readonly dailyNoteCreator: DailyNoteCreator;
	public readonly dailyNoteRepository: DailyNoteRepository;
	public readonly kObjectUtility: KObjectUtility;

	public readonly vaultAdapter: VaultAdapter;
	public readonly appUtils: AppUtils;

	public readonly countNotesUseCase: CountNotesUseCase;
	public readonly getCurrentDNUseCase: GetCurrentDailyNoteUseCase;
	public readonly createEffortUseCase: CreateEffortUseCase;
	public readonly effortRepository: EffortRepository;

	constructor(public app: App) {
		this.utils = new Utils(this.app);
		this.appUtils = new AppUtils(this.app);
		this.vaultAdapter = new VaultAdapter(this.app, this.appUtils);
		this.kObjectCreator = new KObjectCreator(this.appUtils);
		this.dailyNoteCreator = new DailyNoteCreator(this.appUtils);
		this.dailyNoteRepository = new DailyNotePersistenceAdapter(this.appUtils, this.vaultAdapter, this.dailyNoteCreator);
		this.kObjectUtility = new KObjectUtility(this);

		this.countNotesUseCase = new CountNotesService(this.vaultAdapter);
		this.getCurrentDNUseCase = new GetCurrentDailyNoteService(this.dailyNoteRepository);
		this.effortRepository = new EffortPersistenceAdapter(this);
		this.createEffortUseCase = new CreateEffortService(this.effortRepository);
	}
}
