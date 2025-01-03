import {App} from "obsidian";
import DailyNoteRepository from "../core/src/ports/output/DailyNoteRepository";
import Utils from "../core/src/utils/Utils";
import DailyNoteCreator from "../app/src/utils/creators/DailyNoteCreator";
import KObjectCreator from "../app/src/utils/creators/KObjectCreator";
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
import EffortPathRulesHelper from "../app/src/helpers/EffortPathRulesHelper";
import EffortCreator from "../app/src/utils/creators/EffortCreator";
import AreaCreator from "../app/src/utils/creators/AreaCreator";
import LayoutFactory from "../app/src/adapters/input/layouts/LayoutFactory";

export default class ExoContext {
	public readonly utils: Utils;
	public readonly kObjectCreator: KObjectCreator
	public readonly dailyNoteCreator: DailyNoteCreator;
	public readonly areaCreator: AreaCreator;
	public readonly effortCreator: EffortCreator;
	public readonly dailyNoteRepository: DailyNoteRepository;
	public readonly kObjectUtility: KObjectUtility;

	public readonly appUtils: AppUtils;
	public readonly layoutFactory: LayoutFactory;

	public readonly countNotesUseCase: CountNotesUseCase;
	public readonly getCurrentDNUseCase: GetCurrentDailyNoteUseCase;
	public readonly createEffortUseCase: CreateEffortUseCase;
	public readonly effortRepository: EffortRepository;
	public readonly effortPathRulesHelper: EffortPathRulesHelper;

	constructor(public app: App) {
		this.utils = new Utils(this.app);
		this.appUtils = new AppUtils(this.app);
		this.layoutFactory = new LayoutFactory(this);

		this.dailyNoteCreator = new DailyNoteCreator(this);
		this.areaCreator = new AreaCreator(this);
		this.effortCreator = new EffortCreator(this);
		this.kObjectCreator = new KObjectCreator(this);

		this.dailyNoteRepository = new DailyNotePersistenceAdapter(this.appUtils, this.dailyNoteCreator);
		this.kObjectUtility = new KObjectUtility(this);

		this.countNotesUseCase = new CountNotesService(this.appUtils);
		this.getCurrentDNUseCase = new GetCurrentDailyNoteService(this.dailyNoteRepository);
		this.effortRepository = new EffortPersistenceAdapter(this);
		this.createEffortUseCase = new CreateEffortService(this.effortRepository);
		this.effortPathRulesHelper = new EffortPathRulesHelper(this);
	}
}
