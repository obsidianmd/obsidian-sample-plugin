import { App, Modal, Notice, Plugin, PluginSettingTab, Setting, requestUrl, TFile, Menu, MenuItem, FrontMatterCache, TFolder } from 'obsidian';

// ----- CONSTANTS -----
const SUBPROCESSOR_URL_KEYWORDS = [
    'subprocessor', 'sub-processor', 'sub_processor',
    'vendor-list', 'vendorlist', 'third-party-list', 'thirdpartylist',
    'service-providers', 'serviceproviders',
    'dpa-exhibit', 'dpa/exhibit', 'data-processing-addendum/exhibit',
    'trust-center/sub', 'legal/subprocessors'
];


// ----- SETTINGS INTERFACE AND DEFAULTS -----
interface ProcessorProcessorSettings {
    serpApiKey: string;
    rightbrainClientId: string;
    rightbrainClientSecret: string;
    rightbrainOrgId: string;
    rightbrainProjectId: string;
    rightbrainVerifyUrlTaskId: string;
    rightbrainExtractEntitiesTaskId: string;
    rightbrainExtractInputField: string;
    rightbrainExtractOutputThirdPartyField: string;
    rightbrainExtractOutputOwnEntitiesField: string;
    rightbrainDeduplicateSubprocessorsTaskId: string;
    rightbrainDuckDuckGoSearchTaskId: string;
    createPagesForOwnEntities: boolean;
    verboseDebug: boolean;
    maxResultsPerProcessor: number;
    processorsFolderPath: string;
    analysisLogsFolderPath: string;
}

const DEFAULT_SETTINGS: ProcessorProcessorSettings = {
    serpApiKey: '',
    rightbrainClientId: '',
    rightbrainClientSecret: '',
    rightbrainOrgId: '',
    rightbrainProjectId: '',
    rightbrainVerifyUrlTaskId: '',
    rightbrainExtractEntitiesTaskId: '',
    rightbrainExtractInputField: 'page_text',
    rightbrainExtractOutputThirdPartyField: 'third_party_subprocessors',
    rightbrainExtractOutputOwnEntitiesField: 'own_entities',
    rightbrainDeduplicateSubprocessorsTaskId: '',
    rightbrainDuckDuckGoSearchTaskId: '',
    createPagesForOwnEntities: false,
    verboseDebug: false,
    maxResultsPerProcessor: 5,
    processorsFolderPath: 'Processors',
    analysisLogsFolderPath: 'Analysis Logs',
}

// ----- DATA STRUCTURES -----
interface SerpApiResult {
    title: string; url: string; snippet: string; searchQuery?: string;
    processorName: string; documentType: string;
    sourceDpaUrl?: string;
}
interface ExtractedRelationship {
    PrimaryProcessor: string; SubprocessorName: string; ProcessingFunction: string;
    Location: string; RelationshipType: 'uses_subprocessor' | 'is_own_entity';
    SourceURL: string; VerificationReasoning: string;
}
interface ProcessedUrlInfo extends Partial<SerpApiResult> {
    url: string; title?: string; verificationMethod?: string; verificationReasoning?: string;
    isList?: boolean; isCurrent?: boolean; extractedSubprocessorsCount?: number; documentType: string;
}
interface SearchData {
    collectedRelationships: ExtractedRelationship[];
    processedUrlDetails: ProcessedUrlInfo[];
    flaggedCandidateUrlCount: number;
}

interface SubprocessorPageInfo {
    file_path: string;
    page_name: string;
    aliases: string[];
}

interface DeduplicationResultItem {
    survivor_file_path: string;
    duplicate_file_paths: string[];
    reasoning?: string;
}


// ----- MAIN PLUGIN CLASS -----
export default class ProcessorProcessorPlugin extends Plugin {
    settings: ProcessorProcessorSettings;

    async onload() {
        await this.loadSettings();

        this.addRibbonIcon('link', 'Manually Add Subprocessor List URL', (evt: MouseEvent) => {
            new ManualInputModal(this.app, async (processorName, listUrl) => {
                if (processorName && listUrl) {
                    new Notice(`Processing manual URL input for: ${processorName}`);
                    const processorFile = await this.ensureProcessorFile(processorName, true);
                    if (processorFile) {
                        const searchData = await this.fetchDataFromDirectUrl(processorName, listUrl);
                        if (searchData) {
                            await this.persistSubprocessorInfo(processorName, processorFile, searchData);
                            if (searchData.flaggedCandidateUrlCount > 0) {
                                new Notice(`${searchData.flaggedCandidateUrlCount} URL(s) looked promising but couldn't be verified. Check logs.`);
                            }
                        } else {
                            new Notice(`Could not process data from direct URL for ${processorName}.`);
                        }
                    } else {
                        new Notice(`Could not create or find file for ${processorName} in ${this.settings.processorsFolderPath}`);
                    }
                }
            }).open();
        });

        this.addRibbonIcon('paste', 'Input Subprocessor List from Text', (evt: MouseEvent) => {
            this.openManualTextEntryModal();
        });

        this.addCommand({
            id: 'run-processor-search-global',
            name: 'Search for Subprocessors (Discover)',
            callback: () => {
                new SearchModal(this.app, this.settings, async (processorName) => {
                    if (processorName) {
                        new Notice(`Starting discovery search for: ${processorName}`);
                        const processorFile = await this.ensureProcessorFile(processorName, true);
                        if (processorFile) {
                            await this.discoverAndProcessProcessorPage(processorName, processorFile);
                        } else {
                            new Notice(`Could not create or find file for ${processorName} in ${this.settings.processorsFolderPath}`);
                        }
                    }
                }).open();
            }
        });

        this.addCommand({
            id: 'input-subprocessor-list-from-text',
            name: 'Input Subprocessor List from Text',
            callback: () => {
                this.openManualTextEntryModal();
            }
        });

        this.registerEvent(
            this.app.workspace.on('file-menu', (menu: Menu, fileOrFolder: TFile | TFolder, source: string) => {
                if (fileOrFolder instanceof TFolder) {
                    const folder = fileOrFolder as TFolder;
                    if (folder.path === this.settings.processorsFolderPath) {
                        menu.addItem((item: MenuItem) => {
                            item.setTitle('Deduplicate Subprocessor Pages')
                                .setIcon('git-pull-request-draft')
                                .onClick(async () => {
                                    if (!this.settings.rightbrainDeduplicateSubprocessorsTaskId) {
                                        new Notice("Deduplication Task ID not set in plugin settings.");
                                        return;
                                    }
                                    new Notice(`Starting deduplication for folder: ${folder.path}`);
                                    await this.runDeduplicationForFolder(folder);
                                });
                        });
                    }
                } else if (fileOrFolder instanceof TFile && fileOrFolder.extension === 'md') {
                    const file = fileOrFolder as TFile;
                     if (file.path.startsWith(this.settings.processorsFolderPath + "/")) {
                        const fileCache = this.app.metadataCache.getFileCache(file);
                        const frontmatter = fileCache?.frontmatter;
                        const originalProcessorName = (frontmatter?.aliases && Array.isArray(frontmatter.aliases) && frontmatter.aliases.length > 0)
                            ? frontmatter.aliases[0]
                            : file.basename;

                        menu.addItem((item: MenuItem) => {
                            item.setTitle('Discover Subprocessor List').setIcon('wand')
                                .onClick(async () => {
                                    new Notice(`Discovering subprocessor list for: ${originalProcessorName}`);
                                    await this.discoverAndProcessProcessorPage(originalProcessorName, file);
                                });
                        });
                        menu.addItem((item: MenuItem) => {
                            item.setTitle('Add Subprocessor List URL Manually').setIcon('plus-circle')
                                .onClick(async () => {
                                    new ManualInputModal(this.app, async (pName, listUrl) => {
                                        if (listUrl) {
                                            new Notice(`Processing manual URL input for: ${originalProcessorName} using URL: ${listUrl}`);
                                            const searchData = await this.fetchDataFromDirectUrl(originalProcessorName, listUrl);
                                            if (searchData) {
                                                await this.persistSubprocessorInfo(originalProcessorName, file, searchData);
                                                 if (searchData.flaggedCandidateUrlCount > 0) {
                                                    new Notice(`${searchData.flaggedCandidateUrlCount} URL(s) looked promising but couldn't be verified. Check logs.`);
                                                }
                                            } else {
                                                new Notice(`Could not process data from direct URL for ${originalProcessorName}.`);
                                            }
                                        }
                                    }, originalProcessorName).open();
                                });
                        });
                        menu.addItem((item: MenuItem) => {
                            item.setTitle('Input Subprocessor List from Text').setIcon('file-input')
                                .onClick(async () => {
                                    this.openManualTextEntryModal(originalProcessorName);
                                });
                        });
                    }
                }
            })
        );

        this.addSettingTab(new ProcessorProcessorSettingTab(this.app, this));
        console.log('Procesor Processor plugin loaded.');
    }

    onunload() { console.log('Procesor Processor plugin unloaded.'); }
    async loadSettings() { this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData()); }
    async saveSettings() { await this.saveData(this.settings); }

    private openManualTextEntryModal(initialProcessorName?: string) {
        if (!this.settings.rightbrainExtractEntitiesTaskId) {
            new Notice("RightBrain Task ID for entity extraction is not configured. Please set it in plugin settings.");
            return;
        }
        new ManualTextEntryModal(this.app, async (processorName, pastedText) => {
            if (processorName && pastedText) {
                new Notice(`Processing pasted text for: ${processorName}`);
                const processorFile = await this.ensureProcessorFile(processorName, true);
                if (processorFile) {
                    const searchData = await this.fetchDataFromPastedText(processorName, pastedText);
                    if (searchData) {
                        await this.persistSubprocessorInfo(processorName, processorFile, searchData);
                    } else {
                        new Notice(`Could not process data from pasted text for ${processorName}.`);
                    }
                } else {
                    new Notice(`Could not create or find file for ${processorName} in ${this.settings.processorsFolderPath}`);
                }
            }
        }, initialProcessorName).open();
    }

    private sanitizeNameForFilePathAndAlias(entityName: string | undefined | null): { filePathName: string, originalNameAsAlias: string } {
        const originalName = (entityName || "Unknown Entity").trim();
        let baseNameForFile = originalName;

        const dbaRegex = /^(.*?)\s+(?:dba|d\/b\/a|doing business as)\s+(.*)$/i;
        const dbaMatch = originalName.match(dbaRegex);
        if (dbaMatch && dbaMatch[2]) {
            baseNameForFile = dbaMatch[2].trim();
        }

        let filePathName = baseNameForFile.replace(/,/g, '');
        filePathName = filePathName.replace(/[\\/:*?"<>|]/g, '').trim();

        if (!filePathName) {
            filePathName = originalName.replace(/[\\/:*?"<>|,]/g, '').replace(/\s+/g, '_') || "Sanitized_Entity";
        }
         if (!filePathName) {
            filePathName = "Sanitized_Entity_" + Date.now();
        }

        return {
            filePathName: filePathName,
            originalNameAsAlias: originalName
        };
    }

    private scrubHyperlinks(text: string | undefined | null): string {
        if (!text) return "N/A";
        let scrubbedText = String(text);
        scrubbedText = scrubbedText.replace(/\[(.*?)\]\((?:.*?)\)/g, '$1');
        scrubbedText = scrubbedText.replace(/<a[^>]*>(.*?)<\/a>/gi, '$1');
        scrubbedText = scrubbedText.replace(/<[^>]+>/g, '');
        scrubbedText = scrubbedText.replace(/\s+/g, ' ').trim();
        return scrubbedText || "N/A";
    }

    private addRelationship(
        collectedRelationships: ExtractedRelationship[],
        seenRelationships: Set<string>,
        processorName: string,
        entity: any,
        type: ExtractedRelationship['RelationshipType'],
        sourceUrl: string,
        verificationReasoning: string | undefined | null
    ): number {
        const originalEntityName = entity.name?.trim();
        if (!originalEntityName) return 0;

        const subprocessorNameToStore = originalEntityName;

        if (processorName.toLowerCase() === "openai" && type === "is_own_entity") {
            const openaiAffiliates = ["openai global", "openai, opco", "openai ireland", "openai uk", "openai japan", "openaiglobal", "openai opco", "openai llc"];
            if (openaiAffiliates.some(aff => originalEntityName.toLowerCase().includes(aff)) || originalEntityName.toLowerCase() === "openai") {
                return 0;
            }
        }

        const relTuple = `${processorName}|${subprocessorNameToStore}|${type}`;
        if (!seenRelationships.has(relTuple)) {
            collectedRelationships.push({
                PrimaryProcessor: processorName,
                SubprocessorName: subprocessorNameToStore,
                ProcessingFunction: this.scrubHyperlinks(entity.processing_function),
                Location: this.scrubHyperlinks(entity.location),
                RelationshipType: type,
                SourceURL: sourceUrl,
                VerificationReasoning: this.scrubHyperlinks(verificationReasoning)
            });
            seenRelationships.add(relTuple);
            return 1;
        }
        return 0;
    }

    async discoverAndProcessProcessorPage(processorName: string, processorFile: TFile) {
        new Notice(`Processing (discovery): ${processorName}...`);
        const searchData = await this.fetchProcessorSearchDataWithDiscovery(processorName);
        if (searchData) {
            await this.persistSubprocessorInfo(processorName, processorFile, searchData);
            if (searchData.flaggedCandidateUrlCount > 0) {
                new Notice(`${searchData.flaggedCandidateUrlCount} URL(s) looked promising but couldn't be verified. Check Analysis Log for details and consider using the 'Input from Text' feature.`);
            }
        } else {
            new Notice(`Failed to fetch data via discovery for ${processorName}.`);
        }
    }

    async persistSubprocessorInfo(processorName: string, processorFile: TFile, searchData: SearchData) {
        new Notice(`Persisting info for: ${processorName}...`);
        await this.ensureFolderExists(this.settings.processorsFolderPath);
        await this.ensureFolderExists(this.settings.analysisLogsFolderPath);

        const { collectedRelationships, processedUrlDetails } = searchData;

        await this.updateProcessorFile(processorFile, processorName, collectedRelationships);

        const uniqueTargetEntityOriginalNames = Array.from(new Set(collectedRelationships.map(r => r.SubprocessorName)));
        const createdPagesForThisRun = new Set<string>();

        for (const targetEntityOriginalName of uniqueTargetEntityOriginalNames) {
            const { filePathName: targetEntityFilePathName } = this.sanitizeNameForFilePathAndAlias(targetEntityOriginalName);
            if (createdPagesForThisRun.has(targetEntityFilePathName)) {
                continue;
            }

            const relationsWhereThisEntityIsTarget = collectedRelationships.filter(r => r.SubprocessorName === targetEntityOriginalName);

            if (relationsWhereThisEntityIsTarget.length === 0) {
                continue;
            }

            const isEverUsedAsSubprocessor = relationsWhereThisEntityIsTarget.some(r => r.RelationshipType === 'uses_subprocessor');
            const isOwnEntityOfCurrentPrimaryProcessor = relationsWhereThisEntityIsTarget.some(
                r => r.PrimaryProcessor === processorName && r.RelationshipType === 'is_own_entity'
            );

            let shouldCreatePage = false;
            if (isEverUsedAsSubprocessor) {
                shouldCreatePage = true;
                if (this.settings.verboseDebug) console.log(`Page for '${targetEntityOriginalName}' will be created/updated because it's used as a subprocessor.`);
            } else if (isOwnEntityOfCurrentPrimaryProcessor) {
                if (this.settings.createPagesForOwnEntities) {
                    shouldCreatePage = true;
                    if (this.settings.verboseDebug) console.log(`Page for own_entity '${targetEntityOriginalName}' (of '${processorName}') will be created/updated due to setting.`);
                } else {
                    if (this.settings.verboseDebug) console.log(`Skipping page creation for own_entity '${targetEntityOriginalName}' (of '${processorName}') due to setting.`);
                }
            }

            if (shouldCreatePage) {
                const clientRelationshipsForTargetEntityPage = collectedRelationships.filter(
                    r => r.SubprocessorName === targetEntityOriginalName && r.RelationshipType === 'uses_subprocessor'
                );
                await this.createOrUpdateSubprocessorFile(targetEntityOriginalName, processorName, clientRelationshipsForTargetEntityPage);
                createdPagesForThisRun.add(targetEntityFilePathName);
            }
        }

        await this.updateAnalysisLogPage(processorName, processedUrlDetails, collectedRelationships);
        new Notice(`Finished persisting info for ${processorName}.`);
    }

    async createRightBrainDuckDuckGoSearchTask(rbToken: string): Promise<string | null> {
        if (!this.settings.rightbrainOrgId || !this.settings.rightbrainProjectId) {
            new Notice("RightBrain Org ID or Project ID is not configured for search task creation.");
            console.error("ProcessorProcessor: RB OrgID or ProjectID missing for DDG Search Task creation.");
            return null;
        }

        const llmModelIdForSearch = "0195a35e-a71c-7c9d-f1fa-28d0b6667f2d"; // Updated Model ID

        const taskDefinition = {
            name: "DuckDuckGo SERP Parser v1",
            description: "Input: A DuckDuckGo search URL. Output: Structured search results (title, URL, snippet) from the page. Uses url_fetcher input processor.", // Updated description
            system_prompt: "You are an AI assistant that functions as an expert web scraper and data extractor. Your primary goal is to analyze the provided HTML content of a search engine results page (SERP) from DuckDuckGo. Your task is to accurately identify and extract individual organic search results.",
            user_prompt: "The input parameter '{search_url_to_process}' contains the full HTML content of a DuckDuckGo search results page. Your primary task is to identify and extract highly relevant links that are likely to be official sub-processor lists, Data Processing Addenda (DPAs), or closely related legal/compliance pages from the company that was the subject of the search.\n\nFirst, parse the HTML to identify all distinct organic search results. For each potential result, extract:\n1. 'title': The main clickable title text.\n2. 'url': The absolute URL.\n3. 'snippet': The descriptive text snippet.\n\nSecond, after extracting these initial candidates, critically evaluate each one. You should ONLY include a result in your final output if it meets these filtering criteria:\n- The title, snippet, or URL must strongly indicate relevance. Look for keywords such as 'sub-processor', 'subprocessor', 'DPA', 'data processing agreement', 'data processing addendum', 'vendor list', 'third party list', 'data security', 'privacy policy', 'terms of service', 'legal', 'compliance', or 'trust center'.\n- Prioritize pages that appear to be official documentation from the primary domain of the company implied by the search results page content (e.g., if the search was for 'OpenAI subprocessors', prefer results from 'openai.com').\n- Discard results that are clearly generic articles, news reports, blog posts from unrelated third parties, forum discussions, or product pages unless they explicitly link to or discuss sub-processor information for the primary company.\n\nReturn your filtered findings as a JSON object with a single top-level key named 'search_results'. The value of 'search_results' must be a list (array) of JSON objects. Each object in this list represents one highly relevant, filtered search result and must contain the keys 'title' (string), 'url' (string), and 'snippet' (string).\nIf no results meet these strict filtering criteria, the 'search_results' list should be empty. Ensure the output is valid JSON.",
            llm_model_id: llmModelIdForSearch,
            output_format: {
                "search_results": {
                  "type": "list",
                  "description": "An array of parsed search results.",
                  "items": {
                    "type": "object",
                    "properties": {
                      "title": { "type": "string", "description": "The title of the search result." },
                      "url": { "type": "string", "description": "The full URL of the search result." },
                      "snippet": { "type": "string", "description": "The snippet or description of the search result." }
                    },
                    "required": ["title", "url", "snippet"]
                  }
                }
            },
            input_processors: [ // Corrected key name from input_processors"
                {
                    param_name: "search_url_to_process",
                    input_processor: "url_fetcher", // Updated to url_fetcher
                    config: { "extract_text": true }
                }
            ],
            enabled: true
        };

        const createTaskUrl = `https://stag.leftbrain.me/api/v1/org/${this.settings.rightbrainOrgId}/project/${this.settings.rightbrainProjectId}/task`;
        const headers = {
            'Authorization': `Bearer ${rbToken}`,
            'Content-Type': 'application/json',
            'User-Agent': `ObsidianProcessorProcessorPlugin/${this.manifest.version}`
        };

        try {
            new Notice("Attempting to create RightBrain DuckDuckGo Search Task...", 7000);
            if(this.settings.verboseDebug) console.log("Creating RB DDG Search Task with definition:", JSON.stringify(taskDefinition));

            const response = await requestUrl({
                url: createTaskUrl,
                method: 'POST',
                headers: headers,
                body: JSON.stringify(taskDefinition),
                throw: false
            });

            if (this.settings.verboseDebug) {
                console.log(`RB Create Task [DuckDuckGoSearch] Status: ${response.status}. Response Text: ${response.text ? response.text.substring(0, 1000) : "No Body"}`);
            }
            if (response.json && (response.status === 200 || response.status === 201)) {
                 const createdTask = response.json;
                 const taskId = createdTask.id || createdTask.task_id;
                if (taskId) {
                    new Notice(`RightBrain DuckDuckGo Search Task created successfully. ID: ${taskId}`, 7000);
                    return taskId;
                } else {
                    new Notice(`RB DuckDuckGo Search Task created (status ${response.status}), but no Task ID found in response. Check console.`, 10000);
                    console.error("RB Create Task [DuckDuckGoSearch]: Task created but ID missing in response json:", response.json);
                    return null;
                }
            } else {
                new Notice(`Failed to create RightBrain DuckDuckGo Search Task: ${response.status}. Check console for details.`, 10000);
                console.error(`RB Create Task [DuckDuckGoSearch] Error: ${response.status}`, response.text ? response.text.substring(0, 1000) : "No body", "Payload Sent:", taskDefinition);
                return null;
            }
        } catch (error: any) {
            new Notice(`Network error creating RightBrain DuckDuckGo Search Task. Check console.`, 10000);
            console.error("RB Create Task [DuckDuckGoSearch] Network Error:", error);
            return null;
        }
    }

    async searchViaRightBrainDuckDuckGo(processorName: string, rbToken: string): Promise<SerpApiResult[]> {
        if (!this.settings.rightbrainDuckDuckGoSearchTaskId) {
            new Notice("DuckDuckGo Search Task ID is missing. Attempting to create task...", 7000);
            const newTaskId = await this.createRightBrainDuckDuckGoSearchTask(rbToken);
            if (newTaskId) {
                this.settings.rightbrainDuckDuckGoSearchTaskId = newTaskId;
                await this.saveSettings();
            } else {
                new Notice("Failed to create or find DuckDuckGo Search Task ID. Cannot perform search via RightBrain/DDG.", 10000);
                return [];
            }
        }

        const searchTaskId = this.settings.rightbrainDuckDuckGoSearchTaskId;
        if (!searchTaskId) {
             new Notice("DuckDuckGo Search Task ID still unavailable. Aborting DDG search.", 7000);
             return [];
        }

        const searchQueries = this.generateSearchQueries(processorName);
        const allResults: SerpApiResult[] = [];
        const queriesToProcess = searchQueries.slice(0, Math.min(searchQueries.length, this.settings.maxResultsPerProcessor > 0 ? this.settings.maxResultsPerProcessor : 3));

        new Notice(`Performing up to ${queriesToProcess.length} DuckDuckGo searches via RightBrain for ${processorName}...`, 5000);

        for (const query of queriesToProcess) {
        const duckDuckGoUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&ia=web&kl=us-en&kp=-2`;
        const taskInputPayload = { search_url_to_process: duckDuckGoUrl };

        if (this.settings.verboseDebug) {
            console.log(`Calling RightBrain Task ${searchTaskId} for DDG search with URL: ${duckDuckGoUrl}`);
        }

        const taskRunResult = await this.callRightBrainTask(searchTaskId, taskInputPayload, rbToken);

        if (this.settings.verboseDebug && taskRunResult) {
            console.log(`Full RightBrain Response for DDG search query "${query}":`, JSON.stringify(taskRunResult, null, 2));
        }

        const currentQuerySuccessfullyParsedResults: SerpApiResult[] = []; // Store successfully parsed results for THIS query

        if (taskRunResult && taskRunResult.response && taskRunResult.response.search_results && Array.isArray(taskRunResult.response.search_results)) {
            const resultsArrayFromTask: any[] = taskRunResult.response.search_results;
            if (this.settings.verboseDebug) {
                console.log(`Received ${resultsArrayFromTask.length} items from RB Task for DDG query: "${query}" (attempting to parse each as JSON string)`);
            }

            resultsArrayFromTask.forEach((jsonStringItem: any) => {
                if (typeof jsonStringItem === 'string') {
                    try {
                        const item = JSON.parse(jsonStringItem);
                        if (item.url && item.title && (String(item.url).startsWith("http://") || String(item.url).startsWith("https://"))) {
                            currentQuerySuccessfullyParsedResults.push({ // Add to this query's temporary list
                                processorName: processorName,
                                searchQuery: query,
                                title: String(item.title),
                                url: String(item.url),
                                snippet: String(item.snippet || ''),
                                documentType: 'duckduckgo_rb_search_result'
                            });
                        } else { /* verbose log malformed */ }
                    } catch (e) { /* verbose log parse error */ }
                } else if (typeof jsonStringItem === 'object' && jsonStringItem !== null /* ... other checks ... */) {
                    // ... handle direct object if necessary, add to currentQuerySuccessfullyParsedResults ...
                     if ((String(jsonStringItem.url).startsWith("http://") || String(jsonStringItem.url).startsWith("https://"))) {
                        currentQuerySuccessfullyParsedResults.push({
                            processorName: processorName,
                            searchQuery: query,
                            title: String(jsonStringItem.title),
                            url: String(jsonStringItem.url),
                            snippet: String(jsonStringItem.snippet || ''),
                            documentType: 'duckduckgo_rb_search_result_direct_object'
                        });
                    }
                } else { /* verbose log unexpected item type */ }
            });
        } else { /* verbose log no results or failed task */ }

        // Add all valid results from the current query to the main list
        allResults.push(...currentQuerySuccessfullyParsedResults);

        // Heuristic check for early exit from the *query loop*
        // This setting allows users to get more comprehensive results if they prefer, by not stopping early.
        const stopDDGOnStrongHeuristicMatch = true; // Consider making this a plugin setting if more control is needed

        if (stopDDGOnStrongHeuristicMatch) {
            const companyDomain = this.getCompanyDomain(processorName).toLowerCase();
            const strongCandidate = currentQuerySuccessfullyParsedResults.find(res => {
                const titleLower = res.title.toLowerCase();
                const urlLower = res.url.toLowerCase();
                const isOfficialList = titleLower.includes("official sub-processor list") ||
                                       titleLower.includes("official subprocessor list") ||
                                       titleLower.includes(`${processorName.toLowerCase()} sub-processor list`) ||
                                       titleLower.includes(`${processorName.toLowerCase()} subprocessor list`) ||
                                       titleLower.includes("sub-processor list") || // General keyword
                                       titleLower.includes("subprocessor list");

                // Check if URL is from the expected company domain and path seems relevant
                const isDomainMatch = urlLower.includes(companyDomain);
                const hasRelevantPath = SUBPROCESSOR_URL_KEYWORDS.some(kw => urlLower.includes(kw));

                return isOfficialList && isDomainMatch && hasRelevantPath;
            });

            if (strongCandidate) {
                if (this.settings.verboseDebug) {
                    console.log(`Found strong heuristic candidate (${strongCandidate.url}) for query "${query}". Stopping further DDG queries.`);
                }
                new Notice(`Found a highly relevant URL for ${processorName} via DDG. Further DuckDuckGo search queries for this session will be skipped.`, 5000);
                return allResults; // Exit the searchViaRightBrainDuckDuckGo function early
            }
        }
        await new Promise(resolve => setTimeout(resolve, 700 + Math.random() * 500)); // Delay between DDG queries
    }
    return allResults;
}

    async fetchProcessorSearchDataWithDiscovery(processorName: string): Promise<SearchData | null> {
        const collectedRelationships: ExtractedRelationship[] = [];
        const seenRelationshipsInCurrentSearch = new Set<string>();
        const processedUrlDetails: ProcessedUrlInfo[] = [];
        let candidateUrlsInfo: SerpApiResult[] = [];
        let flaggedCandidateUrlCount = 0;

        const rbToken = await this.getRightBrainAccessToken();
        if (!rbToken) {
            new Notice("Could not get RightBrain Access Token for discovery. Aborting.", 7000);
            return null;
        }

        if (this.settings.serpApiKey) {
            new Notice(`Using SerpAPI for primary search for: ${processorName}`, 5000);
            const searchQueries = this.generateSearchQueries(processorName);
            const serpApiResults = await this.searchSerpApiForDpas(processorName, searchQueries, this.settings.maxResultsPerProcessor);
            candidateUrlsInfo.push(...serpApiResults);

            if (serpApiResults.length < Math.max(1, Math.floor(this.settings.maxResultsPerProcessor / 2)) && this.settings.rightbrainDuckDuckGoSearchTaskId !== "DISABLED_BY_USER") {
                if(this.settings.verboseDebug) console.log("SerpAPI returned few results, attempting DuckDuckGo via RightBrain as fallback/augmentation.");
                new Notice("SerpAPI returned few results, trying DuckDuckGo via RightBrain as well...", 3000);
                const ddgResults = await this.searchViaRightBrainDuckDuckGo(processorName, rbToken);
                candidateUrlsInfo.push(...ddgResults);
            }
        } else if (this.settings.rightbrainOrgId && this.settings.rightbrainProjectId) {
            new Notice(`SerpAPI key not configured. Using DuckDuckGo via RightBrain for: ${processorName}`, 5000);
            candidateUrlsInfo = await this.searchViaRightBrainDuckDuckGo(processorName, rbToken);
        } else {
            new Notice("No search method configured (SerpAPI key missing and RightBrain Org/Project ID not set for DuckDuckGo search).", 7000);
        }

        const hardcodedTestUrls: Record<string, SerpApiResult[]> = { /* ... */ }; // Keep your test URLs if any
        if (this.settings.verboseDebug && hardcodedTestUrls[processorName.toLowerCase()]) {
            candidateUrlsInfo.push(...hardcodedTestUrls[processorName.toLowerCase()]);
        }
        if (candidateUrlsInfo.length === 0 && !(processorName.toLowerCase() in hardcodedTestUrls)) {
            new Notice(`No search results found for ${processorName} via configured methods.`, 5000);
        }

        const additionalUrlsFromDpas: SerpApiResult[] = [];
        const dpaPagesToScan = candidateUrlsInfo.filter(
            item => item.documentType === 'dpa_or_subprocessor_list' || item.documentType === 'verified_current_subprocessor_list'
        );

        for (const dpaItem of dpaPagesToScan) {
            if (this.settings.verboseDebug) console.log(`Extracting links from potential DPA/List page: ${dpaItem.url}`);
            const extracted = await this.extractUrlsFromDpaPage(dpaItem.url, processorName, dpaItem.title);
            additionalUrlsFromDpas.push(...extracted);
        }
        candidateUrlsInfo.push(...additionalUrlsFromDpas);

        const uniqueCandidateUrls = new Map<string, SerpApiResult>();
        candidateUrlsInfo.forEach(item => {
            if (item.url && (item.url.startsWith("http://") || item.url.startsWith("https://")) && !uniqueCandidateUrls.has(item.url.replace(/\/$/, ''))) {
                uniqueCandidateUrls.set(item.url.replace(/\/$/, ''), item);
            } else if (this.settings.verboseDebug && item.url) {
                 console.warn(`Skipping invalid or duplicate candidate URL: ${item.url}`);
            }
        });

        const uniqueUrlsToProcess = Array.from(uniqueCandidateUrls.values());
        if (this.settings.verboseDebug) console.log(`Total unique URLs to process for ${processorName} (discovery): ${uniqueUrlsToProcess.length}`);

        if (uniqueUrlsToProcess.length === 0) {
            new Notice(`No valid candidate URLs found to process for ${processorName}.`);
             return { collectedRelationships, processedUrlDetails, flaggedCandidateUrlCount };
        }

        let verifiedListCount = 0;
        for (const urlInfo of uniqueUrlsToProcess) {
            if (verifiedListCount >= this.settings.maxResultsPerProcessor && this.settings.maxResultsPerProcessor > 0) break;

            let currentUrlExtractedCount = 0;
            let currentProcessedUrlInfo: ProcessedUrlInfo = { ...urlInfo, documentType: urlInfo.documentType || 'unknown_unverified' };

            if (rbToken) {
                const verificationResult = await this.verifySubprocessorListUrl(urlInfo.url, rbToken);
                currentProcessedUrlInfo = {
                    ...currentProcessedUrlInfo,
                    verificationMethod: 'rightbrain',
                    isList: verificationResult?.isList || false,
                    isCurrent: verificationResult?.isCurrent || false,
                    verificationReasoning: verificationResult?.reasoning || 'N/A'
                };

                if (verificationResult?.isList && verificationResult.isCurrent) {
                    currentProcessedUrlInfo.documentType = 'verified_current_subprocessor_list';
                    if (verificationResult.pageContent) {
                        const extractionResult = await this.extractEntitiesFromPageContent(verificationResult.pageContent, rbToken);
                        if (extractionResult) {
                            const { thirdPartySubprocessors, ownEntities } = extractionResult;
                            thirdPartySubprocessors.forEach(e => {
                                currentUrlExtractedCount += this.addRelationship(collectedRelationships, seenRelationshipsInCurrentSearch, processorName, e, "uses_subprocessor", urlInfo.url, verificationResult.reasoning);
                            });
                            ownEntities.forEach(e => {
                                currentUrlExtractedCount += this.addRelationship(collectedRelationships, seenRelationshipsInCurrentSearch, processorName, e, "is_own_entity", urlInfo.url, verificationResult.reasoning);
                            });
                        } else { currentProcessedUrlInfo.documentType = 'verified_current_subprocessor_list (rb_extraction_failed)'; }
                    } else { currentProcessedUrlInfo.documentType = 'verified_current_subprocessor_list (no_content_for_extraction)';}
                    if (currentUrlExtractedCount > 0 || (verificationResult.isList && verificationResult.isCurrent)) {
                        verifiedListCount++;
                    }
                } else {
                    const urlLower = urlInfo.url.toLowerCase();
                    const containsKeyword = SUBPROCESSOR_URL_KEYWORDS.some(keyword => urlLower.includes(keyword));
                    if (!verificationResult?.isList && containsKeyword) {
                        currentProcessedUrlInfo.documentType = 'keyword_match_not_verified_list';
                        flaggedCandidateUrlCount++;
                        if (this.settings.verboseDebug) console.log(`Flagged URL (keyword match, not verified): ${urlInfo.url}`);
                    } else if (verificationResult?.isList) {
                        currentProcessedUrlInfo.documentType = 'verified_subprocessor_list (not_current)';
                    } else {
                        currentProcessedUrlInfo.documentType = 'not_a_subprocessor_list';
                    }
                }
            } else {
                currentProcessedUrlInfo.verificationMethod = 'N/A (No RB Token)';
                currentProcessedUrlInfo.verificationReasoning = 'RightBrain token not available.';
            }
            currentProcessedUrlInfo.extractedSubprocessorsCount = currentUrlExtractedCount;
            processedUrlDetails.push(currentProcessedUrlInfo);
        }
        return { collectedRelationships, processedUrlDetails, flaggedCandidateUrlCount };
    }

    async fetchDataFromDirectUrl(processorName: string, listUrl: string): Promise<SearchData | null> {
        if (this.settings.verboseDebug) console.log(`Fetching data from direct URL for ${processorName}: ${listUrl}`);
        if (!this.isValidUrl(listUrl, processorName)) {
            new Notice(`The provided URL for ${processorName} is not valid: ${listUrl}`);
            return null;
        }
        const collectedRelationships: ExtractedRelationship[] = [];
        const seenRelationshipsInCurrentSearch = new Set<string>();
        const processedUrlDetails: ProcessedUrlInfo[] = [];
        let flaggedCandidateUrlCount = 0;

        const directUrlInfoBase: Partial<SerpApiResult> = {
            title: `Manually Provided List for ${processorName}`, url: listUrl,
            snippet: 'Manually provided URL', processorName: processorName, documentType: 'direct_input_list',
        };
        let currentProcessedUrlInfo: ProcessedUrlInfo = { ...directUrlInfoBase, url: listUrl, documentType: 'direct_input_list' };

        const rbToken = await this.getRightBrainAccessToken();
        if (!rbToken) {
            new Notice("Could not obtain RightBrain token. Please check settings.");
            currentProcessedUrlInfo.verificationMethod = 'N/A (No RB Token)';
            currentProcessedUrlInfo.verificationReasoning = 'RightBrain token not available.';
            processedUrlDetails.push(currentProcessedUrlInfo);
            return { collectedRelationships, processedUrlDetails, flaggedCandidateUrlCount };
        }

        let currentUrlExtractedCount = 0;
        const verificationResult = await this.verifySubprocessorListUrl(listUrl, rbToken);

        currentProcessedUrlInfo.verificationMethod = 'rightbrain';
        currentProcessedUrlInfo.isList = verificationResult?.isList || false;
        currentProcessedUrlInfo.isCurrent = verificationResult?.isCurrent || false;
        currentProcessedUrlInfo.verificationReasoning = verificationResult?.reasoning || 'N/A';

        if (verificationResult && verificationResult.isList && verificationResult.isCurrent) {
            new Notice(`Verified manual URL: ${listUrl} as current list.`);
            currentProcessedUrlInfo.documentType = 'verified_current_subprocessor_list (manual_url_input)';
            if (verificationResult.pageContent) {
                const extractionResult = await this.extractEntitiesFromPageContent(verificationResult.pageContent, rbToken);
                if (extractionResult) {
                    const { thirdPartySubprocessors, ownEntities } = extractionResult;
                    thirdPartySubprocessors.forEach(e => {
                        currentUrlExtractedCount += this.addRelationship(collectedRelationships, seenRelationshipsInCurrentSearch, processorName, e, "uses_subprocessor", listUrl, verificationResult.reasoning);
                    });
                    ownEntities.forEach(e => {
                        currentUrlExtractedCount += this.addRelationship(collectedRelationships, seenRelationshipsInCurrentSearch, processorName, e, "is_own_entity", listUrl, verificationResult.reasoning);
                    });
                } else { currentProcessedUrlInfo.documentType = 'verified_current_subprocessor_list (manual_url_input_rb_extraction_failed)';}
            } else {currentProcessedUrlInfo.documentType = 'verified_current_subprocessor_list (manual_url_input_no_content)';}
        } else {
            const urlLower = listUrl.toLowerCase();
            const containsKeyword = SUBPROCESSOR_URL_KEYWORDS.some(keyword => urlLower.includes(keyword));
            if (!verificationResult?.isList && containsKeyword) {
                currentProcessedUrlInfo.documentType = 'keyword_match_not_verified_list (manual_url_input)';
                flaggedCandidateUrlCount++;
                new Notice(`Manual URL ${listUrl} looks like a subprocessor list but couldn't be verified. Reason: ${this.scrubHyperlinks(verificationResult?.reasoning) || 'Details unavailable.'}`);
                if (this.settings.verboseDebug) console.log(`Flagged Manual URL (keyword match, not verified): ${listUrl}`);
            } else if (verificationResult?.isList) {
                currentProcessedUrlInfo.documentType = 'verified_subprocessor_list (manual_url_input_not_current)';
                new Notice(`Manual URL ${listUrl} verified as a list, but not current. Reason: ${this.scrubHyperlinks(verificationResult?.reasoning) || 'Details unavailable.'}`);
            } else {
                currentProcessedUrlInfo.documentType = 'not_a_subprocessor_list (manual_url_input)';
                new Notice(`Manual URL ${listUrl} could not be verified as a list. Reason: ${this.scrubHyperlinks(verificationResult?.reasoning) || 'Details unavailable.'}`);
            }
        }
        currentProcessedUrlInfo.extractedSubprocessorsCount = currentUrlExtractedCount;
        processedUrlDetails.push(currentProcessedUrlInfo);
        return { collectedRelationships, processedUrlDetails, flaggedCandidateUrlCount };
    }

    async fetchDataFromPastedText(processorName: string, pastedText: string): Promise<SearchData | null> {
        if (this.settings.verboseDebug) console.log(`Fetching data from pasted text for ${processorName}`);
        if (!this.settings.rightbrainExtractEntitiesTaskId) {
            new Notice("RightBrain Task ID for entity extraction is not configured.");
            return null;
        }

        const collectedRelationships: ExtractedRelationship[] = [];
        const seenRelationshipsInCurrentSearch = new Set<string>();
        const processedUrlDetails: ProcessedUrlInfo[] = [];

        const rbToken = await this.getRightBrainAccessToken();
        if (!rbToken) {
            new Notice("Could not obtain RightBrain token for processing pasted text.");
            processedUrlDetails.push({
                url: `text_input_for_${this.sanitizeNameForFilePathAndAlias(processorName).filePathName}`,
                title: `Pasted Text for ${processorName}`,
                documentType: 'manual_text_submission_failed (no_rb_token)',
                verificationMethod: 'N/A (No RB Token)',
            });
            return { collectedRelationships, processedUrlDetails, flaggedCandidateUrlCount: 0 };
        }

        const taskInput = { [this.settings.rightbrainExtractInputField]: pastedText };
        const extractionResult = await this.callRightBrainTask(this.settings.rightbrainExtractEntitiesTaskId, taskInput, rbToken);

        let currentUrlExtractedCount = 0;
        const sourcePlaceholder = `manual_text_input:${processorName}`;

        if (extractionResult && typeof extractionResult.response === 'object' && extractionResult.response !== null) {
            const rbResponse = extractionResult.response;
            const thirdParty = rbResponse[this.settings.rightbrainExtractOutputThirdPartyField] || [];
            const own = rbResponse[this.settings.rightbrainExtractOutputOwnEntitiesField] || [];

            thirdParty.forEach((e: any) => {
                currentUrlExtractedCount += this.addRelationship(collectedRelationships, seenRelationshipsInCurrentSearch, processorName, e, "uses_subprocessor", sourcePlaceholder, "Processed from manually pasted text.");
            });
            own.forEach((e: any) => {
                currentUrlExtractedCount += this.addRelationship(collectedRelationships, seenRelationshipsInCurrentSearch, processorName, e, "is_own_entity", sourcePlaceholder, "Processed from manually pasted text.");
            });

            processedUrlDetails.push({
                url: sourcePlaceholder,
                title: `Pasted Text for ${processorName}`,
                documentType: 'manual_text_submission_processed',
                verificationMethod: 'rightbrain_text_task',
                extractedSubprocessorsCount: currentUrlExtractedCount,
                verificationReasoning: `Extracted ${currentUrlExtractedCount} entities from pasted text.`
            });
            new Notice(`Successfully extracted ${currentUrlExtractedCount} entities from pasted text for ${processorName}.`);
        } else {
            new Notice(`Failed to extract entities from pasted text for ${processorName}. Check console.`);
            console.error(`Procesor Processor: RB Extract From Text task did not return expected 'response' object or failed. Full task result:`, JSON.stringify(extractionResult).substring(0,500));
            processedUrlDetails.push({
                url: sourcePlaceholder,
                title: `Pasted Text for ${processorName}`,
                documentType: 'manual_text_submission_failed (rb_task_error)',
                verificationMethod: 'rightbrain_text_task',
                verificationReasoning: 'RightBrain task for text processing failed or returned an unexpected response.'
            });
        }

        return { collectedRelationships, processedUrlDetails, flaggedCandidateUrlCount: 0 };
    }

    private async ensureFolderExists(folderPath: string): Promise<void> {
        try {
            const normalizedPath = folderPath.startsWith('/') ? folderPath.substring(1) : folderPath;
            if (normalizedPath === '') return;

            const abstractFolderPath = this.app.vault.getAbstractFileByPath(normalizedPath);
            if (!abstractFolderPath) {
                await this.app.vault.createFolder(normalizedPath);
                if (this.settings.verboseDebug) console.log(`Folder created: ${normalizedPath}`);
            }
        } catch (e) {
            console.error(`Error ensuring folder ${folderPath} exists:`, e);
            new Notice(`Error creating folder: ${folderPath}`);
        }
    }

    private async ensureProcessorFile(originalProcessorName: string, addFrontmatter: boolean = false): Promise<TFile | null> {
        await this.ensureFolderExists(this.settings.processorsFolderPath);
        const { filePathName, originalNameAsAlias } = this.sanitizeNameForFilePathAndAlias(originalProcessorName);
        const folder = this.settings.processorsFolderPath.startsWith('/') ? this.settings.processorsFolderPath.substring(1) : this.settings.processorsFolderPath;
        const filePath = `${folder}/${filePathName}.md`;

        let file = this.app.vault.getAbstractFileByPath(filePath) as TFile;
        if (!file) {
            try {
                let initialContent = "";
                if (addFrontmatter) {
                    const aliasForFrontmatter = originalNameAsAlias.replace(/[:\[\],"]/g, '');
                    initialContent = `---\ntags: [processor]\naliases: ["${aliasForFrontmatter}"]\n---\n\n# ${originalNameAsAlias}\n\n`;
                } else {
                    initialContent = `# ${originalNameAsAlias}\n\n`;
                }
                file = await this.app.vault.create(filePath, initialContent);
                new Notice(`Created processor file: ${filePathName}.md`);
            } catch (e: any) {
                if (e.message?.toLowerCase().includes("file already exists")) {
                    if (this.settings.verboseDebug) console.warn(`Attempted to create ${filePath} but it already exists (possibly due to case). Fetching existing file.`);
                    file = this.app.vault.getAbstractFileByPath(filePath) as TFile;
                    if (!file) {
                        console.error(`Error creating processor file ${filePath} after 'already exists' error, but still cannot get file:`, e);
                        return null;
                    }
                } else {
                    console.error(`Error creating processor file ${filePath}:`, e);
                    return null;
                }
            }
        }
        if (file && addFrontmatter) {
            const aliasForFrontmatter = originalNameAsAlias.replace(/[:\[\],"]/g, '');
            await this.app.vault.process(file, (content) => {
                let newContent = this.updateFrontmatter(content, { tags: ["processor"], aliases: [aliasForFrontmatter] }, originalNameAsAlias);
                if (!newContent.trim().includes(`# ${originalNameAsAlias}`)) {
                    const bodyStartIndex = newContent.indexOf('\n---') > 0 ? newContent.indexOf('\n---', newContent.indexOf('\n---') + 3) + 4 : 0;
                    const body = newContent.substring(bodyStartIndex);
                    const frontmatterPart = newContent.substring(0, bodyStartIndex);
                    newContent = frontmatterPart + (frontmatterPart.endsWith("\n") ? "" : "\n") + `# ${originalNameAsAlias}\n\n` + body.trimStart();
                }
                return newContent;
            });
        }
        return file;
    }

    private async updateProcessorFile(file: TFile, originalProcessorName: string, relationships: ExtractedRelationship[]) {
        const subprocessorsHeading = "Subprocessors";
        let tableMd = `| Subprocessor Entity Name | Processing Function | Location |\n`;
        tableMd += `|---|---|---|\n`;

        const relevantRelationships = relationships.filter(r => r.RelationshipType === 'uses_subprocessor' && r.PrimaryProcessor === originalProcessorName);

        relevantRelationships.forEach(rel => {
            const { filePathName: subFilePathName, originalNameAsAlias: subOriginalName } = this.sanitizeNameForFilePathAndAlias(rel.SubprocessorName);
            const markdownAlias = subOriginalName.replace(/\n/g, ' ').replace(/[\[\]()|]/g, '');
            const processorsFolder = this.settings.processorsFolderPath;
            const markdownLinkTarget = encodeURI(`${processorsFolder}/${subFilePathName}.md`);
            const subprocessorPageLink = `[${markdownAlias}](${markdownLinkTarget})`;

            const processingFunctionDisplay = (rel.ProcessingFunction || "N/A").replace(/\n/g, "<br>").replace(/\|/g, "\\|");
            const locationDisplay = (rel.Location || "N/A").replace(/\n/g, "<br>").replace(/\|/g, "\\|");
            tableMd += `| ${subprocessorPageLink} | ${processingFunctionDisplay} | ${locationDisplay} |\n`;
        });

        const analysisLogsHeading = "Analysis Logs";
        const { filePathName: logFilePathNamePart } = this.sanitizeNameForFilePathAndAlias(originalProcessorName);
        const analysisLogsFolder = this.settings.analysisLogsFolderPath;
        const logFileName = `${logFilePathNamePart} Subprocessor Logs.md`;
        const logFileLinkTarget = encodeURI(`${analysisLogsFolder}/${logFileName}`);
        const logFileLink = `[${originalProcessorName} Subprocessor Logs](${logFileLinkTarget})`;
        const analysisLogSection = `\n- ${logFileLink}\n`;

        await this.app.vault.process(file, (content: string) => {
            let newContent = this.updateFrontmatter(content, { tags: ["processor"], aliases: [originalProcessorName.replace(/[:\[\],"]/g, '')] }, originalProcessorName);
            if (!newContent.trim().includes(`# ${originalProcessorName}`)) {
                const bodyStartIndex = newContent.indexOf('\n---') > 0 ? newContent.indexOf('\n---', newContent.indexOf('\n---') + 3) + 4 : 0;
                const body = newContent.substring(bodyStartIndex);
                const frontmatterPart = newContent.substring(0, bodyStartIndex);
                newContent = frontmatterPart + (frontmatterPart.endsWith("\n") ? "" : "\n") + `# ${originalProcessorName}\n\n` + body.trimStart();
            }
            newContent = this.ensureHeadingAndSection(newContent, subprocessorsHeading, tableMd, null, null);
            newContent = this.ensureHeadingAndSection(newContent, analysisLogsHeading, analysisLogSection, null, null, true);
            return newContent;
        });
        if (this.settings.verboseDebug) console.log(`Updated processor file: ${file.path}`);
    }

    private async createOrUpdateSubprocessorFile(
        originalSubprocessorName: string,
        originalPrimaryProcessorNameForContext: string,
        newClientRelationships: ExtractedRelationship[]
    ) {
        await this.ensureFolderExists(this.settings.processorsFolderPath);
        const { filePathName: subFilePathName, originalNameAsAlias: subOriginalNameForHeadingAndAlias } = this.sanitizeNameForFilePathAndAlias(originalSubprocessorName);
        const processorsFolder = this.settings.processorsFolderPath;
        const filePath = `${processorsFolder}/${subFilePathName}.md`;
        const clientsHeading = "Data Processing Clients";

        let existingContent = "";
        let file = this.app.vault.getAbstractFileByPath(filePath) as TFile;
        const existingClientRowsMd: string[] = [];
        const existingClientLinks = new Set<string>();

        if (file) {
            existingContent = await this.app.vault.cachedRead(file);
            const lines = existingContent.split('\n');
            let inClientsTable = false;
            const headingRegex = new RegExp(`^###\\s*${clientsHeading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i');
            const tableHeaderSeparatorRegex = /^\|\s*---\s*\|.*$/;
            const tableRowRegex = /^\|\s*\[(.*?)\]\(.*?\)\s*\|.*$/;

            for (const line of lines) {
                if (headingRegex.test(line.trim())) { inClientsTable = true; continue; }
                if (inClientsTable && tableHeaderSeparatorRegex.test(line.trim())) { continue; }
                if (inClientsTable && line.trim().startsWith('|')) {
                    const match = line.trim().match(tableRowRegex);
                    if (match && match[1]) {
                        existingClientLinks.add(match[1].trim());
                    }
                    existingClientRowsMd.push(line);
                } else if (inClientsTable && (line.trim() === "" || line.trim().startsWith("###") || line.trim().startsWith("##"))) {
                    inClientsTable = false;
                }
            }
        }

        let tableMd = `| Client (Processor) | Services Provided (Processing Function) |\n`;
        tableMd += `|---|---|\n`;
        existingClientRowsMd.forEach(row => { tableMd += `${row}\n`; });

        let newRowsAddedThisCall = 0;
        newClientRelationships.forEach(rel => {
            if (rel.SubprocessorName === originalSubprocessorName && rel.RelationshipType === 'uses_subprocessor') {
                const { filePathName: clientFilePathName, originalNameAsAlias: clientOriginalName } = this.sanitizeNameForFilePathAndAlias(rel.PrimaryProcessor);
                const clientMarkdownAlias = clientOriginalName.replace(/\n/g, ' ').replace(/[\[\]()|]/g, '');
                
                if (!existingClientLinks.has(clientMarkdownAlias)) {
                    const clientMarkdownLinkTarget = encodeURI(`${processorsFolder}/${clientFilePathName}.md`);
                    const primaryProcessorLink = `[${clientMarkdownAlias}](${clientMarkdownLinkTarget})`;
                    const processingFunctionDisplay = (rel.ProcessingFunction || "N/A").replace(/\n/g, "<br>").replace(/\|/g, "\\|");
                    tableMd += `| ${primaryProcessorLink} | ${processingFunctionDisplay} |\n`;
                    existingClientLinks.add(clientMarkdownAlias);
                    newRowsAddedThisCall++;
                }
            }
        });

        const aliasForFrontmatter = subOriginalNameForHeadingAndAlias.replace(/[:\[\],"]/g, '');
        if (!file) {
            let initialContent = this.updateFrontmatter("", { tags: ["subprocessor"], aliases: [aliasForFrontmatter] }, subOriginalNameForHeadingAndAlias);
            initialContent += `\n# ${subOriginalNameForHeadingAndAlias}\n\n`;
            initialContent = this.ensureHeadingAndSection(initialContent, clientsHeading, tableMd.trimEnd(), null, null);
            try {
                file = await this.app.vault.create(filePath, initialContent);
                if (this.settings.verboseDebug) console.log(`Created subprocessor file: ${filePath} with ${newRowsAddedThisCall} client rows.`);
            } catch (e: any) {
                if (e.message?.toLowerCase().includes("file already exists")) {
                    if (this.settings.verboseDebug) console.warn(`Attempted to create ${filePath} but it already exists. Will update.`);
                    file = this.app.vault.getAbstractFileByPath(filePath) as TFile;
                    if (!file) { console.error(`Failed to get file ${filePath} after 'already exists' error.`); return; }
                } else { console.error(`Error creating subprocessor file ${filePath}:`, e); return; }
            }
        }

        if (file) {
             if (newRowsAddedThisCall > 0 || !existingContent.includes(clientsHeading)) {
                await this.app.vault.process(file, (content: string) => {
                    let newContent = this.updateFrontmatter(content, { tags: ["subprocessor"], aliases: [aliasForFrontmatter] }, subOriginalNameForHeadingAndAlias);
                    if (!newContent.trim().includes(`# ${subOriginalNameForHeadingAndAlias}`)) {
                        const bodyStartIndex = newContent.indexOf('\n---') > 0 ? newContent.indexOf('\n---', newContent.indexOf('\n---') + 3) + 4 : 0;
                        const body = newContent.substring(bodyStartIndex);
                        const frontmatterPart = newContent.substring(0, bodyStartIndex);
                        newContent = frontmatterPart + (frontmatterPart.endsWith("\n") ? "" : "\n") +`# ${subOriginalNameForHeadingAndAlias}\n\n` + body.trimStart();
                    }
                    return this.ensureHeadingAndSection(newContent, clientsHeading, tableMd.trimEnd(), null, null);
                });
                if (this.settings.verboseDebug) console.log(`Updated subprocessor file: ${filePath} - ${newRowsAddedThisCall > 0 ? "new client rows added." : "section created or no new unique rows."}`);
            } else if (this.settings.verboseDebug) {
                console.log(`No new unique client rows to add to ${filePath}, and section already exists.`);
            }
        }
    }

    private updateFrontmatter(content: string, updates: { tags?: string[], aliases?: string[] }, pageNameForAlias: string): string {
        let fm: any = {};
        let body = content;
        const fmRegex = /^---\s*[\r\n]+([\s\S]*?)[\r\n]+---(\s*[\r\n]+|$)/;
        const match = content.match(fmRegex);

        if (match) {
            const rawFm = match[1];
            body = content.substring(match[0].length);
            try {
                rawFm.split(/[\r\n]+/).forEach(line => {
                    const colonIndex = line.indexOf(':');
                    if (colonIndex > 0) {
                        const key = line.substring(0, colonIndex).trim();
                        let value = line.substring(colonIndex + 1).trim();
                        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                            value = value.substring(1, value.length - 1);
                        }
                        if (key === 'tags' || key === 'aliases') {
                            if (value.startsWith('[') && value.endsWith(']')) {
                                fm[key] = value.substring(1, value.length - 1).split(',')
                                    .map(s => s.trim().replace(/^["']|["']$/g, ''))
                                    .filter(s => s);
                            } else {
                                fm[key] = value.split(/\s+/)
                                    .map(s => s.trim().replace(/^["']|["']$/g, ''))
                                    .filter(s => s);
                            }
                        } else {
                            fm[key] = value;
                        }
                    }
                });
            } catch (e) { console.warn("FM Parse Error for '", pageNameForAlias, "'. Error:", e); fm = {}; }
        }

        if (updates.tags) {
            fm.tags = Array.from(new Set([...(fm.tags || []), ...updates.tags]));
        }

        const sanitizedPageNameAlias = pageNameForAlias.replace(/\n/g, ' ').replace(/["]:/g, '');
        let newAliasesList = updates.aliases ? updates.aliases.map(a => a.replace(/\n/g, ' ').replace(/["]:/g, '')) : [];

        fm.aliases = Array.from(new Set([...(fm.aliases || []), ...newAliasesList, sanitizedPageNameAlias]));
        if (fm.aliases.length === 0) delete fm.aliases;

        let newFmStr = "---\n";
        for (const key in fm) {
            if (Array.isArray(fm[key]) && fm[key].length > 0) {
                 if (key === 'aliases') {
                     newFmStr += `${key}: [${fm[key].map((alias: string) => /[,\s':"\[\]{}]/.test(alias) || alias.includes('"') ? `"${alias.replace(/"/g, '""')}"` : alias).join(', ')}]\n`;
                } else { newFmStr += `${key}: [${fm[key].join(', ')}]\n`; }
            } else if (!Array.isArray(fm[key]) && fm[key] !== undefined && fm[key] !== null) {
                const valueStr = String(fm[key]);
                 newFmStr += `${key}: ${(/[,\s':"\[\]{}]/.test(valueStr) || valueStr.startsWith('@') || valueStr.startsWith('*') || valueStr.startsWith('&') || valueStr.includes('"') ? `"${valueStr.replace(/"/g, '""')}"` : valueStr)}\n`;
            }
        }
        newFmStr += "---\n";
        return newFmStr + (body.trim().length > 0 ? (body.startsWith('\n') ? body : '\n' + body) : '\n');
    }

    private async updateAnalysisLogPage(processorName: string, processedUrls: ProcessedUrlInfo[], relationships: ExtractedRelationship[]) {
        await this.ensureFolderExists(this.settings.analysisLogsFolderPath);
        const { filePathName: sanitizedProcessorNameForLogFile } = this.sanitizeNameForFilePathAndAlias(processorName);
        const logsFolder = this.settings.analysisLogsFolderPath.startsWith('/') ? this.settings.analysisLogsFolderPath.substring(1) : this.settings.analysisLogsFolderPath;
        const logFileName = `${sanitizedProcessorNameForLogFile} Subprocessor Logs.md`;
        const logFilePath = `${logsFolder}/${logFileName}`;
        const logEntryContent = this.formatResultsForObsidianLog(processorName, relationships, processedUrls);
        await this.writeResultsToObsidianNote(logFilePath, logEntryContent, 'ensure_exists_and_append', processorName);
        if (this.settings.verboseDebug) console.log(`Updated log file: ${logFilePath}`);
    }

    private ensureHeadingAndSection(content: string, headingText: string, sectionNewContent: string, startMarker: string | null, endMarker: string | null, appendUnderHeadingIfNoMarkers = false): string {
        const headingLine = `### ${headingText}`;
        const headingRegex = new RegExp(`(^|\\n)##?\\#?\\s*${headingText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*(\\n|$)`, 'im');
        let newContent = content;
        if (startMarker && endMarker && startMarker.trim() !== "" && endMarker.trim() !== "") {
            const sectionRegex = new RegExp(`${startMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${endMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gm');
            if (sectionRegex.test(newContent)) { newContent = newContent.replace(sectionRegex, sectionNewContent); }
            else if (headingRegex.test(newContent)) { newContent = newContent.replace(headingRegex, (match, p1, p2) => `${p1}${headingLine}${p2}${sectionNewContent.trimEnd()}\n`); }
            else { newContent += (newContent.length > 0 && !newContent.endsWith('\n\n') && !newContent.endsWith('\n') ? '\n\n' : (newContent.length > 0 && !newContent.endsWith('\n') ? '\n' : '')) + `${headingLine}\n${sectionNewContent.trimEnd()}\n`; }
        } else {
            const headingMatch = newContent.match(headingRegex);
            if (headingMatch) {
                const headingWithSurroundingNewlines = headingMatch[0];
                const headingStartIndex = headingMatch.index as number;
                const contentBeforeHeading = newContent.substring(0, headingStartIndex);
                let contentAfterHeadingSection = newContent.substring(headingStartIndex + headingWithSurroundingNewlines.length);

                const nextHeadingRegex = /(^|\n)##?\#?\s+/m;
                const nextHeadingMatchInFollowingContent = contentAfterHeadingSection.match(nextHeadingRegex);
                let contentOfNextSections = "";
                if (nextHeadingMatchInFollowingContent && nextHeadingMatchInFollowingContent.index !== undefined) {
                    contentOfNextSections = contentAfterHeadingSection.substring(nextHeadingMatchInFollowingContent.index);
                }

                const newSectionFormatted = (headingWithSurroundingNewlines.endsWith('\n') ? "" : "\n") + sectionNewContent.trimEnd() + "\n";
                newContent = contentBeforeHeading + headingWithSurroundingNewlines + newSectionFormatted + (nextHeadingMatchInFollowingContent ? (contentOfNextSections.startsWith('\n') ? '' : '\n') + contentOfNextSections : (newSectionFormatted.endsWith('\n\n') ? '' : '\n') );

            } else if (appendUnderHeadingIfNoMarkers && headingText === "Analysis Logs") {
                 const analysisLogsHeadingConst = "Analysis Logs";
                 const analysisLogsHeadingRegex = new RegExp(`(^|\\n)##?\\#?\\s*${analysisLogsHeadingConst.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*(\\n|$)`, 'im');
                 const existingHeadingMatch = newContent.match(analysisLogsHeadingRegex);
                 if (existingHeadingMatch && existingHeadingMatch.index !== undefined) {
                    const trimmedSectionContent = sectionNewContent.trim();
                    if (!newContent.substring(existingHeadingMatch.index).includes(trimmedSectionContent)) {
                         newContent = newContent.replace(existingHeadingMatch[0], `${existingHeadingMatch[0]}${trimmedSectionContent}\n`);
                    }
                 } else {
                    newContent += (newContent.length > 0 && !newContent.endsWith('\n\n') && !newContent.endsWith('\n') ? '\n\n' : (newContent.length > 0 && !newContent.endsWith('\n') ? '\n' : '')) + `${headingLine}\n${sectionNewContent.trimEnd()}\n`;
                 }
            } else {
                newContent += (newContent.length > 0 && !newContent.endsWith('\n\n') && !newContent.endsWith('\n') ? '\n\n' : (newContent.length > 0 && !newContent.endsWith('\n') ? '\n' : '')) + `${headingLine}\n${sectionNewContent.trimEnd()}\n`;
            }
        }
        return newContent;
    }

    private formatResultsForObsidianLog(processorName: string, relationships: ExtractedRelationship[], processedUrls: ProcessedUrlInfo[]): string {
        let md = `## Detailed Log for ${processorName} - ${new Date().toLocaleString()}\n\n`;
        const successfulSources = processedUrls.filter(u=>u.extractedSubprocessorsCount && u.extractedSubprocessorsCount > 0);
        md += `Found **${relationships.length}** total relationships from ${successfulSources.length} source(s) this run.\n\n`;

        if (processedUrls.length > 0) {
            md += `### Processed Sources Log:\n`;
            processedUrls.forEach(pSource => {
                 md += `- **Source:** ${pSource.url.startsWith('manual_text_input:') ? `Pasted Text for '${pSource.title}'` : `[${this.scrubHyperlinks(pSource.title) || pSource.url}](${pSource.url})`}\n`;
                 md += `  - Type: \`${pSource.documentType}\`\n`;
                 if (pSource.verificationMethod) {
                     md += `  - Verification Method: ${pSource.verificationMethod}\n`;
                 }
                 if (pSource.verificationMethod === 'rightbrain') {
                     md += `  - Verified List: **${pSource.isList}**, Current: **${pSource.isCurrent}** (Reason: *${this.scrubHyperlinks(pSource.verificationReasoning)}*)\n`;
                 } else if (pSource.verificationReasoning) {
                     md += `  - Details: *${this.scrubHyperlinks(pSource.verificationReasoning)}*\n`;
                 }

                 if (pSource.documentType === 'keyword_match_not_verified_list' || pSource.documentType === 'keyword_match_not_verified_list (manual_url_input)') {
                    md += `  - **Note:** This URL contains terms like "subprocessor" and might be a subprocessor list that could not be automatically processed. Manual review and using the 'Input Subprocessor List from Text' feature is recommended if you can access its content.\n`;
                 }

                 if (pSource.extractedSubprocessorsCount && pSource.extractedSubprocessorsCount > 0) {
                    md += `  - Entities Extracted from this source: ${pSource.extractedSubprocessorsCount}\n`;
                 } else if (pSource.isList || pSource.documentType.includes('manual_text_submission') || pSource.documentType.startsWith('duckduckgo_rb_search_result')) {
                    md += `  - Entities Extracted from this source: 0\n`;
                 }
            });
        } else {
            md += "No sources were processed in this run.\n";
        }

        if (relationships.length > 0) {
            md += `\n### Extracted Relationships Table (from all sources this run):\n`;
            md += "| Subprocessor/Entity Name | Type | Processing Function | Location | Source Reference |\n";
            md += "|---|---|---|---|---|\n";
            relationships.forEach(rel => {
                const subNameDisplay = (rel.SubprocessorName || "N/A").replace(/\|/g, '\\|');
                const procFuncDisplay = (rel.ProcessingFunction || "N/A").replace(/\|/g, '\\|');
                const locDisplay = (rel.Location || "N/A").replace(/\|/g, '\\|');
                const sourceDisplay = rel.SourceURL.startsWith('manual_text_input:') ? `Pasted Text (${rel.PrimaryProcessor})` : `[Source](${rel.SourceURL})`;
                md += `| ${subNameDisplay} | ${rel.RelationshipType} | ${procFuncDisplay} | ${locDisplay} | ${sourceDisplay} |\n`;
            });
        } else {
            md += "\nNo subprocessor relationships were collected in this run.\n";
        }
        return md;
    }

    private async writeResultsToObsidianNote(filePath: string, contentToAppendOrInitial: string, mode: 'overwrite' | 'append' | 'ensure_exists_and_append' = 'ensure_exists_and_append', processorNameForLogTitle?: string) {
        try {
            let file = this.app.vault.getAbstractFileByPath(filePath) as TFile;

            if (file) {
                if (mode === 'overwrite') {
                    await this.app.vault.modify(file, contentToAppendOrInitial);
                    new Notice(`Overwritten note: ${filePath}`);
                } else {
                    const contentToActuallyAppend = (mode === 'append' || (await this.app.vault.read(file)).length > 0) ? `\n\n---\n\n${contentToAppendOrInitial}` : contentToAppendOrInitial;
                    await this.app.vault.append(file, contentToActuallyAppend);
                    new Notice(`Appended to ${mode === 'append' ? 'note' : 'log'}: ${filePath}`);
                }
            } else {
                let initialFileContent = contentToAppendOrInitial;
                if (mode === 'ensure_exists_and_append' && processorNameForLogTitle) {
                    initialFileContent = `# Analysis Logs for ${processorNameForLogTitle}\n\n${contentToAppendOrInitial}`;
                }

                try {
                    file = await this.app.vault.create(filePath, initialFileContent);
                    new Notice(`Created note: ${filePath}`);
                } catch (eCreate: any) {
                    if (eCreate.message?.toLowerCase().includes("file already exists")) {
                        if (this.settings.verboseDebug) {
                            console.warn(`Procesor Processor: Attempted to create '${filePath}' but it already existed. Trying to append instead.`);
                        }
                        const existingFile = this.app.vault.getAbstractFileByPath(filePath) as TFile;
                        if (existingFile) {
                            const contentToActuallyAppend = (await this.app.vault.read(existingFile)).length > 0 ? `\n\n---\n\n${contentToAppendOrInitial}` : contentToAppendOrInitial;
                            await this.app.vault.append(existingFile, contentToActuallyAppend);
                            new Notice(`Appended to existing log: ${filePath}`);
                        } else {
                            new Notice(`Error: File '${filePath}' reported as existing but could not be opened for append. Check console.`);
                            console.error(`Procesor Processor: File '${filePath}' conflict. Original error:`, eCreate);
                        }
                    } else {
                        throw eCreate;
                    }
                }
            }
        } catch (e) {
            new Notice(`Error saving to note: ${filePath}. Check console.`);
            console.error(`Procesor Processor: Error creating/writing note ${filePath}:`, e);
        }
    }

    async getRightBrainAccessToken(): Promise<string | null> {
        if (!this.settings.rightbrainClientId || !this.settings.rightbrainClientSecret) { new Notice("RightBrain Client ID or Secret not configured."); return null; }
        const tokenUrl = 'https://oauth.leftbrain.me/oauth2/token'; const params = new URLSearchParams(); params.append('grant_type', 'client_credentials');
        try { const credentials = btoa(`${this.settings.rightbrainClientId}:${this.settings.rightbrainClientSecret}`);
            const response = await requestUrl({ url: tokenUrl, method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `Basic ${credentials}`, 'User-Agent': `ObsidianProcessorProcessorPlugin/${this.manifest.version}`}, body: params.toString(), throw: false });
            if (response.status === 200 && response.json && response.json.access_token) { return response.json.access_token; }
            else { new Notice(`Failed to get RB token: ${response.status}.`); console.error(`RB Token Error: ${response.status}`, response.text ? response.text.substring(0,500) : "No body"); return null; }
        } catch (error) { new Notice("Error getting RB token."); console.error("RB Token Network Error:", error); return null; }
    }

    private generateSearchQueries(processorName: string): string[] {
        const cleanName = processorName.trim(); const companyDomainMain = this.getCompanyDomain(cleanName);
        const queries = [ `"${cleanName}" subprocessors list site:${companyDomainMain}`, `"${cleanName}" data processing agreement site:${companyDomainMain}`, `"${cleanName}" data processing addendum site:${companyDomainMain}`, `"${cleanName}" official subprocessors`, `"${cleanName}" "sub-processor list" official`, `"${cleanName}" terms data processing addendum`, `"${cleanName}" "list of data processors"`, `"${cleanName}" list of subprocessors`, `"${cleanName}" data processing agreement DPA`, ];
        if (this.settings.verboseDebug) console.log(`Generated queries for ${processorName}: ${queries.join('; ')}`); return Array.from(new Set(queries));
    }

    private async searchSerpApiForDpas(processorName: string, queries: string[], maxResultsSetting: number): Promise<SerpApiResult[]> {
        if (!this.settings.serpApiKey) {
            if(this.settings.verboseDebug) console.log("SerpAPI Key not configured. Will rely on other search methods.");
            return [];
        }
        const allSerpResults: SerpApiResult[] = []; const numSerpQueriesToUse = Math.min(queries.length, Math.max(3, maxResultsSetting > 1 ? Math.floor(maxResultsSetting / 2) : 1) ); const serpNumParam = maxResultsSetting > 0 ? Math.min(10, Math.max(5, maxResultsSetting)) : 7; const totalResultsTarget = maxResultsSetting > 0 ? maxResultsSetting * 3 : 20;
        for (let i = 0; i < numSerpQueriesToUse && allSerpResults.length < totalResultsTarget; i++) {
            const query = queries[i]; const apiParams = new URLSearchParams({ engine: 'google', q: query, api_key: this.settings.serpApiKey, num: serpNumParam.toString() }); const apiUrl = `https://serpapi.com/search?${apiParams.toString()}`;
            try {
                if (this.settings.verboseDebug) console.log(`SerpAPI Query: ${query}`);
                const response = await requestUrl({ url: apiUrl, throw: false });
                if (response.status === 200 && response.json && response.json.organic_results) {
                    for (const serpResult of response.json.organic_results) { if (allSerpResults.length >= totalResultsTarget) break; const resultUrl = serpResult.link; const resultTitle = serpResult.title || 'N/A'; const resultSnippet = serpResult.snippet || 'N/A';
                        if (resultUrl && this.isValidUrl(resultUrl, processorName)) { const titleLower = resultTitle.toLowerCase(); const snippetLower = resultSnippet.toLowerCase(); const contentKeywordsDpa = ['subprocessor', 'data processing agreement', 'dpa', 'addendum', 'processing terms', 'legal terms', 'list of subprocessors', 'sub-processor list', 'processors list', 'privacy policy', 'trust center', 'service provider', 'third-party processor']; const contentRelevance = contentKeywordsDpa.some(term => titleLower.includes(term) || snippetLower.includes(term));
                            if (contentRelevance) { if (!allSerpResults.some(r => r.url === resultUrl))  allSerpResults.push({ title: resultTitle, url: resultUrl, snippet: resultSnippet, searchQuery: query, processorName: processorName, documentType: 'dpa_or_subprocessor_list' }); }
                        }
                    }
                } else { console.error(`SerpAPI Error for query "${query}": Status ${response.status}`, response.text ? response.text.substring(0,300) : "No response text"); }
                await new Promise(resolve => setTimeout(resolve, 1200 + Math.random() * 600));
            } catch (error) { console.error(`SerpAPI Request Error for query "${query}":`, error); await new Promise(resolve => setTimeout(resolve, 2000)); }
        }
        if (this.settings.verboseDebug) console.log(`SerpAPI returned ${allSerpResults.length} initial candidates for ${processorName}`);
        return allSerpResults;
    }

    private getCompanyDomain(processorName: string): string {
        const processorLower = processorName.toLowerCase();
        const nameMap: Record<string, string> = {"google cloud platform": "google", "gcp": "google", "amazon web services": "aws"};
        const baseNameForDomain = nameMap[processorLower] || processorLower;
        const knownDomainsMap: Record<string, string> = { 'microsoft': 'microsoft.com', 'google': 'google.com', 'aws': 'aws.amazon.com', 'salesforce': 'salesforce.com', 'openai': 'openai.com', 'stripe': 'stripe.com', 'hubspot': 'hubspot.com', 'cloudflare': 'cloudflare.com',  'slack': 'slack.com', 'zoom': 'zoom.us', 'atlassian': 'atlassian.com', 'oracle': 'oracle.com', 'sap': 'sap.com', 'ibm': 'ibm.com', 'datadog': 'datadoghq.com', 'intercom':'intercom.com', 'zendesk': 'zendesk.com', 'servicenow': 'servicenow.com', 'workday': 'workday.com', 'adobe': 'adobe.com', 'anthropic': 'anthropic.com', 'groq': 'groq.com' };
        if (knownDomainsMap[baseNameForDomain]) return knownDomainsMap[baseNameForDomain];
        let cleanName = processorName.toLowerCase();
        const commonSuffixesRegex = [ /\s+gmbh\s*&\s*co\.\s*kg/gi, /\s+ges\s*m\.b\.h/gi, /\s+gmbh/gi, /\s+inc\.?/gi, /\s+s\.a\.u\.?/gi, /\s+u\.s\.?$/gi, /\s+llc/gi, /\s+ltd\.?/gi, /\s+corp\.?/gi, /\s+corporation/gi, /\s+limited/gi, /\s+company/gi, /\s+co\.?/gi, /\s+s\.a\.s\.?/gi, /\s+sarl/gi, /\s+s\.a\.r\.l/gi, /\s+plc/gi, /\s+ag/gi, /\s+ab/gi, /\s+a\/s/gi, /\s+as/gi, /\s+oyj?/gi, /\s+spa/gi, /\s+srl/gi, /\s+kk/gi, /\s+k\.k\.?/gi, /\s+kg/gi, /\s+ohg/gi, /\s+mbh/gi, /\s+llp/gi, /\s+lp/gi, /\s+pty/gi, /\s+bv/gi, /\s+b\.v\.?/gi, /\s+s\.l\.?/gi, /\s+l\.p\.?/gi, /\s+l\.l\.c\.?/gi, /,?\s+(incorporated|limited|corporation|company|public limited company)$/gi ];
        for (const suffixRegex of commonSuffixesRegex) cleanName = cleanName.replace(suffixRegex, ' ').trim();
        let nameForUrl = cleanName.replace(/[^\w\s-]/g, '').trim().replace(/\./g, '');
        const nameParts = nameForUrl.split(/\s+/).filter(part => part);
        const primaryNameVariants = new Set<string>();
        if (!nameParts.length && nameForUrl) primaryNameVariants.add(nameForUrl);
        if (nameParts.length === 1) primaryNameVariants.add(nameParts[0]);
        else if (nameParts.length > 1) { primaryNameVariants.add(nameParts.join("")); primaryNameVariants.add(nameParts.join("-")); primaryNameVariants.add(nameParts[0]); if (nameParts.length === 2) primaryNameVariants.add(nameParts[0] + nameParts[1]); }
        if (!primaryNameVariants.size && nameForUrl) primaryNameVariants.add(nameForUrl.replace(/\s/g, "-"));
        const domains: string[] = [];
        const commonTlds = ['.com', '.io', '.ai', '.org', '.net', '.co', '.cloud', '.dev', '.tech', '.app', '.eu', '.us', '.global'];
        primaryNameVariants.forEach(variant => { if (variant) commonTlds.forEach(tld => domains.push(`${variant.toLowerCase()}${tld}`)); });
        const knownCompanySubdomains: Record<string, string[]> = { 'microsoft': ['microsoft.com', 'docs.microsoft.com', 'azure.microsoft.com'], 'google': ['google.com', 'cloud.google.com', 'policies.google.com', 'workspace.google.com'], 'amazon': ['aws.amazon.com'], 'aws': ['aws.amazon.com'], 'salesforce': ['salesforce.com', 'trust.salesforce.com'], 'openai': ['openai.com', 'platform.openai.com'], 'anthropic': ['anthropic.com', 'trust.anthropic.com'], 'groq': ['groq.com', 'trust.groq.com'] };
        for (const companyKeyword in knownCompanySubdomains) if (processorLower.includes(companyKeyword)) domains.push(...knownCompanySubdomains[companyKeyword]);
        const uniqueDomains = Array.from(new Set(domains));
        const keywordPreferredDomains: Record<string, {primary: string, secondary?: string}> = { 'microsoft': { primary: 'microsoft.com', secondary: 'azure.microsoft.com' }, 'google':    { primary: 'google.com', secondary: 'cloud.google.com' }, 'aws': { primary: 'aws.amazon.com' }, 'amazon': { primary: 'aws.amazon.com' }, 'salesforce':{ primary: 'salesforce.com' }, 'openai': { primary: 'openai.com' }, 'anthropic': { primary: 'anthropic.com'}, 'stripe': { primary: 'stripe.com'}, 'groq': { primary: 'groq.com'} };
        for (const keyword in keywordPreferredDomains) { if (processorLower.includes(keyword)) { const preferred = keywordPreferredDomains[keyword]; if (keyword === "microsoft" && processorLower.includes("azure")) { if (preferred.secondary && uniqueDomains.includes(preferred.secondary)) return preferred.secondary; } if (keyword === "google" && (processorLower.includes("cloud") || processorLower.includes("gcp"))) { if (preferred.secondary && uniqueDomains.includes(preferred.secondary)) return preferred.secondary; } if (uniqueDomains.includes(preferred.primary)) return preferred.primary; if (preferred.secondary && processorLower.includes(preferred.secondary.split('.')[0]) && uniqueDomains.includes(preferred.secondary) ) return preferred.secondary; } }
        if (processorLower === "google cloud platform" && uniqueDomains.includes("cloud.google.com")) return "cloud.google.com";
        if (nameForUrl) { const baseNameHyphen = nameForUrl.replace(/\s+/g,'-').toLowerCase(); const baseNameNoSpace = nameForUrl.replace(/\s+/g,'').toLowerCase(); const comDomainHyphen = `${baseNameHyphen}.com`; const comDomainNoSpace = `${baseNameNoSpace}.com`; if (uniqueDomains.includes(comDomainHyphen)) return comDomainHyphen; if (uniqueDomains.includes(comDomainNoSpace)) return comDomainNoSpace; }
        for (const dVal of uniqueDomains) { if (dVal.endsWith('.com')) return dVal; }
        if (uniqueDomains.length > 0) return uniqueDomains[0];
        return `${baseNameForDomain.replace(/\s+/g, '').replace(/[.,]/g, '')}.com`;
    }

    private isValidUrl(url: string, processorNameContext: string = ""): boolean {
        if (!url || typeof url !== 'string' || url.length > 2048) return false;
        let parsedUrl: URL;
        try { parsedUrl = new URL(url); if (!['http:', 'https:'].includes(parsedUrl.protocol)) return false; if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(parsedUrl.hostname)) return false; } catch (e) { return false; }
        const urlLower = url.toLowerCase(); const parsedNetlocLower = parsedUrl.hostname.toLowerCase();
        const targetCompanyMainDomain = processorNameContext ? this.getCompanyDomain(processorNameContext).toLowerCase() : "";
        const excludedDomainsNetloc = [ 'facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com', 'pinterest.com', 'reddit.com', 'googleusercontent.com', 'archive.org', 'wikipedia.org', 'wikimedia.org', 'support.google.com', 'support.microsoft.com', 'play.google.com', 'apps.apple.com', 'wordpress.org', 'wordpress.com', 'blogspot.com', 'medium.com', 'dev.to', 'stackoverflow.com', 'github.io', 't.co', 'bit.ly', 'goo.gl', 'example.com', 'localhost', 'vimeo.com' ];
        for (const exDomainPart of excludedDomainsNetloc) { const isExMatch = (exDomainPart === parsedNetlocLower || parsedNetlocLower.endsWith(`.${exDomainPart}`)); if (isExMatch && parsedNetlocLower !== targetCompanyMainDomain) { if (exDomainPart === 'github.io' && targetCompanyMainDomain && parsedNetlocLower.startsWith(targetCompanyMainDomain.split('.')[0])) continue; const isKnownPlatformForLegal = ['github.com', 'cdn.brandfolder.com', 'trust.arc.com'].some(platform => parsedNetlocLower.includes(platform)); const hasLegalPathKeywords = ['/legal', '/terms', '/dpa', '/subprocessor', '/policy', 'privacy-policy', 'trust-center'].some(critPath => urlLower.includes(critPath)); const processorNameParts = processorNameContext.toLowerCase().split(/\s+/).filter(p => p.length > 2); const contextMatchInUrl = processorNameParts.some(part => urlLower.replace(/-/g,"").replace(/_/g,"").includes(part)); if (!(isKnownPlatformForLegal && hasLegalPathKeywords && contextMatchInUrl)) return false; } }
        const excludedFileSuffixes = [ '.exe','.zip','.dmg','.pkg','.msi', '.iso', '.tar.gz', '.rar', '.mp4','.mov','.avi','.wmv', '.mp3','.wav','.aac','.ogg', '.jpg','.jpeg','.png','.gif','.svg','.bmp','.tiff', '.webp', '.css','.js', '.xml', '.ppt', '.pptx', '.key', '.woff', '.woff2', '.ttf', '.eot' ];
        const allowableDocTypes = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.txt', '.rtf', '.csv', '.html', '.htm'];
        const pathLower = parsedUrl.pathname.toLowerCase(); const isAllowableDoc = allowableDocTypes.some(docType => pathLower.endsWith(docType));
        if (!isAllowableDoc && excludedFileSuffixes.some(suffix => pathLower.endsWith(suffix))) { if (!( (pathLower.includes("pdf") || pathLower.includes("document")) && ['subprocessor', 'dpa', 'terms', 'legal'].some(kw => urlLower.includes(kw)) )) return false; }
        const nonDocumentPathSegments = [ '/search', '/login', '/auth', '/account', '/careers', '/jobs', '/sitemap', '/cart', '/event', '/blog/', '/news/', '/forum', '/contact', '/support/', '/shop', '/feed', '/tag/', '/category/', '/author/', '/user/', '/profile/', '/app/', '/status', '/demo/', '/example/', '/test/', '/help/', '/faq/', '/media/', '/download/', '/press/', '/about-us/' ];
        const urlPathCleaned = parsedUrl.pathname.toLowerCase().replace(/^\/|\/$/g, '');
        if (nonDocumentPathSegments.some(segment => { const cleanSegment = segment.replace(/^\/|\/$/g, ''); return `/${urlPathCleaned}/`.includes(`/${cleanSegment}/`) || urlPathCleaned.startsWith(`${cleanSegment}/`) || urlPathCleaned === cleanSegment; })) { if (!['dpa','subprocessor','sub-processor','data-processing','privacy','legal','terms','policy','addendum', 'trust-center', 'security', 'service-providers', 'third-party', 'subprocessors-list'].some(dpaKw => urlLower.includes(dpaKw))) return false; }
        if (parsedUrl.search.length > 200 && !isAllowableDoc && !['subprocessor','dpa','id=','docid=','file=','article=','path=','name='].some(docInd => urlLower.includes(docInd))) return false;
        return true;
    }

    private async extractUrlsFromDpaPage(pageUrl: string, processorNameContext: string, sourcePageTitle?: string): Promise<SerpApiResult[]> {
        if (!pageUrl || !this.isValidUrl(pageUrl, processorNameContext)) { if (this.settings.verboseDebug) console.log(`Skipping link extraction: ${pageUrl}`); return []; }
        if (this.settings.verboseDebug) console.log(`Extracting links from: ${pageUrl}`); const foundUrlsSet = new Set<string>(); const results: SerpApiResult[] = []; let htmlContent: string;
        try { const response = await requestUrl({url: pageUrl, throw: false}); if (response.status === 200) htmlContent = response.text; else { console.warn(`Fetch HTML failed for ${pageUrl}: ${response.status}`); return []; } } catch (error) { console.error(`Fetch HTML error for ${pageUrl}:`, error); return []; }
        let textForRegexAnalysis = htmlContent; const urlRegexPatterns: {pattern: RegExp, captureGroup?: number}[] = [ { pattern: /https?:\/\/[a-zA-Z0-9\-\.\/_&?=%#;~]+\b(?:subprocessor(?:s)?|sub-processor(?:s)?|third-party|vendor(?:s)?(?:-list)?|supplier(?:s)?(?:-list)?|legal\/sub|privacy\/sub|service-provider(?:s)?|trust-center\/sub)\b[a-zA-Z0-9\-\.\/_&?=%#;~]*/gi }, { pattern: /(?:["'\(])(https?:\/\/[^\s"'()<>]*?(?:subprocessor|sub-processor|vendor|supplier|third-party|partner|dpa|data-processing|legal\/sub|privacy\/sub|service-provider|trust-center\/sub)[^\s"'()<>]*?)(?:["'\)])/gi, captureGroup: 1 } ];
        for (const reInfo of urlRegexPatterns) { const hasCaptureGroup = typeof reInfo.captureGroup === 'number'; for (const match of textForRegexAnalysis.matchAll(reInfo.pattern)) { let urlStr = (hasCaptureGroup && reInfo.captureGroup !== undefined ? match[reInfo.captureGroup] : match[0])?.trim(); if (urlStr) { urlStr = urlStr.replace(/[.,;!)>"']$/, '').replace(/&amp;/g, '&'); if (this.isValidUrl(urlStr, processorNameContext)) foundUrlsSet.add(urlStr); } } }
        try { const parser = new DOMParser(); const doc = parser.parseFromString(htmlContent, "text/html"); const base = new URL(pageUrl); const linkKeywordsAnchor = ['subprocessor', 'sub-processor', 'vendor list', 'third party', 'supplier list', 'data processing', 'dpa', 'processor list', 'partner list', 'service provider', 'exhibit', 'appendix', 'schedule', 'terms', 'policy', 'legal', 'list of sub-processors', 'sub-processor list', 'trust center']; const linkKeywordsHref = ['subprocessor', 'dpa', 'data-processing', 'legal', 'policy', 'terms', 'list', 'service-provider', 'trust-center', '/sub', '/vendor', '/supplier'];
            doc.querySelectorAll('a[href]').forEach(a => { const anchor = a as HTMLAnchorElement; const hrefAttribute = anchor.getAttribute('href'); if (hrefAttribute && !hrefAttribute.startsWith('mailto:') && !hrefAttribute.startsWith('tel:') && !hrefAttribute.startsWith('#') && !hrefAttribute.startsWith('javascript:')) { const linkText = anchor.textContent?.toLowerCase().trim() || ""; const hrefLower = hrefAttribute.toLowerCase(); if (linkKeywordsAnchor.some(keyword => linkText.includes(keyword)) || linkKeywordsHref.some(keyword => hrefLower.includes(keyword))) { try { const fullUrl = new URL(hrefAttribute, base.href); fullUrl.hash = ""; const cleanUrl = fullUrl.href; if (this.isValidUrl(cleanUrl, processorNameContext)) foundUrlsSet.add(cleanUrl); } catch (e) { if (this.settings.verboseDebug) console.log(`URL construct error: "${hrefAttribute}" on ${pageUrl}`, e); } } } });
        } catch(e) { console.error(`DOM parse error for ${pageUrl}:`, e); }
        const normalizedPageUrl = pageUrl.replace(/\/$/, ''); foundUrlsSet.forEach(urlToAdd => { if (urlToAdd.replace(/\/$/, '') !== normalizedPageUrl) { results.push({ title: `Linked from '${sourcePageTitle || new URL(pageUrl).hostname}'`, url: urlToAdd, snippet: `Found on: ${pageUrl}`, processorName: processorNameContext, documentType: 'subprocessor_list_reference', sourceDpaUrl: pageUrl }); } });
        if (this.settings.verboseDebug && results.length > 0) console.log(`Extracted ${results.length} links from ${pageUrl}.`); return results;
    }

    private async callRightBrainTask(taskId: string, taskInputPayload: Record<string, any>, rbToken: string): Promise<any | null> {
        if (!this.settings.rightbrainOrgId || !this.settings.rightbrainProjectId || !taskId) { new Notice("RB API config incomplete for calling task."); return null; }
        const runTaskUrl = `https://stag.leftbrain.me/api/v1/org/${this.settings.rightbrainOrgId}/project/${this.settings.rightbrainProjectId}/task/${taskId}/run`;
        const headers = { 'Authorization': `Bearer ${rbToken}`, 'Content-Type': 'application/json', 'User-Agent': `ObsidianProcessorProcessorPlugin/${this.manifest.version}` };
        const fullPayload = { "task_input": taskInputPayload };
        if (this.settings.verboseDebug) { console.log(`Calling RB Task ${taskId} with payload: ${JSON.stringify(fullPayload)}`); }
        try {
            const response = await requestUrl({ url: runTaskUrl, method: 'POST', headers: headers, body: JSON.stringify(fullPayload), throw: false });
            if (this.settings.verboseDebug) { console.log(`RB Task ${taskId} Run Status: ${response.status}. Response Text: ${response.text ? response.text.substring(0, 500) : "No Body"}`);}
            if (response.status === 200 && response.json) {
                return response.json;
            }
            else { console.error(`RB Task ${taskId} Run Error: ${response.status}`, response.text ? response.text.substring(0,300) : "No body"); new Notice(`RB Task ${taskId} failed: ${response.status}.`); return null; }
        } catch (error: any) { console.error(`RB Task ${taskId} Run Network Error:`, error); new Notice(`Error calling RB Task ${taskId}: ${error.message || 'Unknown'}.`); return null; }
    }

    private async verifySubprocessorListUrl(urlToVerify: string, rbToken: string): Promise<{ isList: boolean; isCurrent: boolean; reasoning: string; pageContent?: string } | null> {
        if (!this.settings.rightbrainVerifyUrlTaskId) { new Notice("RB Verify URL Task ID missing."); return null; }
        const taskInput = { "url_content": urlToVerify };
        if (this.settings.verboseDebug) console.log(`Verifying URL ${urlToVerify} with RB Task ${this.settings.rightbrainVerifyUrlTaskId}`);
        const taskResult = await this.callRightBrainTask(this.settings.rightbrainVerifyUrlTaskId, taskInput, rbToken);
        if (taskResult && typeof taskResult.response === 'object' && taskResult.response !== null) {
            const rbResponse = taskResult.response;
            const isList = String(rbResponse.isSubprocessorList).toLowerCase() === 'true';
            const isCurrent = String(rbResponse.isCurrentVersion).toLowerCase() === 'true';
            const reasoning = rbResponse.reasoningForCurrency || "N/A";
            const pageContent = rbResponse.fetched_page_html; // Use the new output field name
            if (this.settings.verboseDebug) { console.log(`RB Verify for ${urlToVerify}: List=${isList}, Current=${isCurrent}, Content available: ${!!pageContent}`); }
            return { isList, isCurrent: (isList && isCurrent), reasoning, pageContent };
        }
        if (this.settings.verboseDebug) { console.warn(`RB Verify task for ${urlToVerify} failed or unexpected response format.`); }
        return null;
    }

    private async extractEntitiesFromPageContent(pageContent: string, rbToken: string): Promise<{ thirdPartySubprocessors: any[]; ownEntities: any[] } | null> {
        if (!this.settings.rightbrainExtractEntitiesTaskId) {
            new Notice("RB Extract Entities Task ID missing.");
            console.error("ProcessorProcessor: RightBrain Extract Entities Task ID (for page content) not configured.");
            return null;
        }
        const taskInput = { [this.settings.rightbrainExtractInputField]: pageContent };
        if (this.settings.verboseDebug) console.log(`Extracting entities from page content with RB Task ${this.settings.rightbrainExtractEntitiesTaskId}`);

        const taskResult = await this.callRightBrainTask(this.settings.rightbrainExtractEntitiesTaskId, taskInput, rbToken);

        if (taskResult && typeof taskResult.response === 'object' && taskResult.response !== null) {
            const rbResponse = taskResult.response;
            const thirdParty = rbResponse[this.settings.rightbrainExtractOutputThirdPartyField] || [];
            const own = rbResponse[this.settings.rightbrainExtractOutputOwnEntitiesField] || [];
            if (this.settings.verboseDebug) { console.log(`RB Extract from page content: Third-party: ${Array.isArray(thirdParty) ? thirdParty.length : 'N/A'}, Own: ${Array.isArray(own) ? own.length : 'N/A'}.`);}
            return { thirdPartySubprocessors: Array.isArray(thirdParty) ? thirdParty : [], ownEntities: Array.isArray(own) ? own : [] };
        }
        if (this.settings.verboseDebug) console.warn(`RB Extract Entities from page content task failed or unexpected response.`);
        return null;
    }

    async runDeduplicationForFolder(folder: TFolder) {
        const filesInFolder = folder.children.filter(child => child instanceof TFile && child.extension === 'md') as TFile[];
        if (filesInFolder.length < 2) {
            new Notice("Not enough markdown files in the folder to perform deduplication.");
            return;
        }

        const pagesInfo: SubprocessorPageInfo[] = filesInFolder.map(file => {
            const fileCache = this.app.metadataCache.getFileCache(file);
            const frontmatter = fileCache?.frontmatter;
            const aliases = (frontmatter?.aliases && Array.isArray(frontmatter.aliases)) ? frontmatter.aliases.map(String) : [];
            return {
                file_path: file.path,
                page_name: file.basename,
                aliases: aliases
            };
        });

        const rbToken = await this.getRightBrainAccessToken();
        if (!rbToken) {
            new Notice("Could not get RightBrain access token. Check settings.");
            return;
        }
        if (!this.settings.rightbrainDeduplicateSubprocessorsTaskId) {
            new Notice("Deduplication Task ID not set. Please configure it in plugin settings.");
            return;
        }

        const taskInputPayload = { subprocessor_pages: pagesInfo };

        if (this.settings.verboseDebug) {
            console.log("Calling RightBrain Deduplication Task with payload:", JSON.stringify(taskInputPayload, null, 2));
        }

        const deduplicationRbResult = await this.callRightBrainTask(
            this.settings.rightbrainDeduplicateSubprocessorsTaskId,
            taskInputPayload,
            rbToken
        );

        if (this.settings.verboseDebug) {
            console.log("RightBrain Deduplication Task result:", JSON.stringify(deduplicationRbResult, null, 2));
        }
        if (deduplicationRbResult && deduplicationRbResult.response && Array.isArray(deduplicationRbResult.response.deduplication_results)) {
            const results = deduplicationRbResult.response.deduplication_results as DeduplicationResultItem[];
            if (results.length === 0) {
                new Notice("No duplicates found by RightBrain task.");
                return;
            }
            await this.processDeduplicationResults(results);
        } else {
            new Notice("Failed to get valid deduplication results from RightBrain. Check console for details.");
            console.error("Invalid or missing deduplication_results in RightBrain response:", deduplicationRbResult);
        }
    }

    async processDeduplicationResults(results: DeduplicationResultItem[]) {
        let totalRowsMergedCount = 0;
        let filesDeletedCount = 0;
        let errorCount = 0;
        new Notice(`Processing ${results.length} potential duplicate sets...`);

        for (const set of results) {
            const survivorFile = this.app.vault.getAbstractFileByPath(set.survivor_file_path) as TFile;
            if (!survivorFile) {
                console.error(`Survivor file not found: ${set.survivor_file_path}`);
                new Notice(`Error: Survivor file ${set.survivor_file_path} not found.`);
                errorCount++;
                continue;
            }
            if (this.settings.verboseDebug) console.log(`Survivor: ${survivorFile.path}. Duplicates: ${set.duplicate_file_paths.join(', ')}`);

            let survivorContent = await this.app.vault.read(survivorFile);
            let rowsToAppendToSurvivorTable: string[] = [];

            for (const dupFilePath of set.duplicate_file_paths) {
                if (dupFilePath === survivorFile.path) {
                    console.warn(`Duplicate path is same as survivor, skipping: ${dupFilePath}`);
                    continue;
                }
                const duplicateFile = this.app.vault.getAbstractFileByPath(dupFilePath) as TFile;
                if (!duplicateFile) {
                    console.warn(`Duplicate file not found, skipping: ${dupFilePath}`);
                    continue;
                }

                const duplicateContent = await this.app.vault.read(duplicateFile);
                const clientRowsFromDuplicate = this.extractClientTableRows(duplicateContent);
                rowsToAppendToSurvivorTable.push(...clientRowsFromDuplicate);

                try {
                    await this.app.vault.delete(duplicateFile);
                    new Notice(`Deleted duplicate file: ${dupFilePath}`);
                    filesDeletedCount++;
                    if (this.settings.verboseDebug) console.log(`Deleted duplicate: ${dupFilePath}`);
                } catch (e) {
                    console.error(`Failed to delete duplicate file ${dupFilePath}:`, e);
                    new Notice(`Error deleting ${dupFilePath}.`);
                    errorCount++;
                }
            }

            if (rowsToAppendToSurvivorTable.length > 0) {
                const originalSurvivorContent = survivorContent;
                survivorContent = this.appendRowsToClientTable(survivorContent, rowsToAppendToSurvivorTable, survivorFile.basename);
                if (survivorContent !== originalSurvivorContent) {
                    await this.app.vault.modify(survivorFile, survivorContent);
                    const numActuallyAppended = rowsToAppendToSurvivorTable.filter(row => survivorContent.includes(row)).length;
                    new Notice(`Appended ${numActuallyAppended} client entries to ${survivorFile.basename}.`);
                    totalRowsMergedCount += numActuallyAppended;
                     if (this.settings.verboseDebug) console.log(`Appended client entries to ${survivorFile.basename}.`);
                } else {
                    if (this.settings.verboseDebug) console.log(`No new unique client entries to append to ${survivorFile.basename}.`);
                }
            }
        }

        let summaryMessage = "Deduplication process finished. ";
        if (filesDeletedCount > 0) summaryMessage += `${filesDeletedCount} duplicate files deleted. `;
        if (totalRowsMergedCount > 0) summaryMessage += `${totalRowsMergedCount} client table rows merged. `;
        if (errorCount > 0) summaryMessage += `${errorCount} errors occurred (check console).`;
        if (filesDeletedCount === 0 && totalRowsMergedCount === 0 && errorCount === 0 && results.length > 0) {
            summaryMessage = "Deduplication ran, but no files were deleted or rows merged (possibly no actionable duplicates or tables were empty/identical).";
        }
        new Notice(summaryMessage);
    }

    private extractClientTableRows(content: string): string[] {
        const rows: string[] = [];
        const lines = content.split('\n');
        let inTable = false;
        const clientsHeadingRegex = /^###\s*Data Processing Clients\s*$/i;
        const tableSeparatorRegex = /^\|\s*-+\s*\|(?:\s*-+\s*\|)+$/;

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (clientsHeadingRegex.test(trimmedLine)) {
                inTable = true;
                continue;
            }

            if (inTable) {
                if (tableSeparatorRegex.test(trimmedLine)) {
                    continue;
                }
                if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|') && trimmedLine.indexOf('|', 1) < trimmedLine.length -1) {
                    if (!trimmedLine.toLowerCase().includes("| client (processor) | services provided (processing function) |")) {
                        rows.push(trimmedLine);
                    }
                } else if (trimmedLine === "" || trimmedLine.startsWith("###") || trimmedLine.startsWith("##")) {
                    inTable = false;
                    break;
                }
            }
        }
        if (this.settings.verboseDebug && rows.length > 0) console.log(`Extracted ${rows.length} client rows from a duplicate.`);
        return rows;
    }

    private appendRowsToClientTable(survivorContent: string, rowsToAppend: string[], survivorBasename: string): string {
        if (rowsToAppend.length === 0) return survivorContent;

        const lines = survivorContent.split('\n');
        const clientsHeadingText = "Data Processing Clients";
        const clientsHeadingRegex = new RegExp(`(^|\\n)###\\s*${clientsHeadingText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s*|$)`, 'i');
        const tableHeader = "| Client (Processor) | Services Provided (Processing Function) |";
        const tableSeparator = "|---|---|";

        let headingIndex = -1;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim().match(clientsHeadingRegex)) {
                headingIndex = i;
                break;
            }
        }

        const existingTableRows = new Set<string>();
        if (headingIndex !== -1) {
            let inExistingTable = false;
            const tableSeparatorRegexLocal = /^\|\s*-+\s*\|(?:\s*-+\s*\|)+$/;
            for (let i = headingIndex + 1; i < lines.length; i++) {
                const trimmedLine = lines[i].trim();
                if (trimmedLine.startsWith("###") || trimmedLine.startsWith("##")) break;
                if (trimmedLine.toLowerCase() === tableHeader.toLowerCase()) continue;
                if (tableSeparatorRegexLocal.test(trimmedLine)) { inExistingTable = true; continue;}
                if (inExistingTable && trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
                    existingTableRows.add(trimmedLine);
                }
            }
        }

        const uniqueRowsToAppendFiltered = Array.from(new Set(rowsToAppend.map(r => r.trim()))).filter(row => !existingTableRows.has(row) && row);

        if (uniqueRowsToAppendFiltered.length === 0) {
            if (this.settings.verboseDebug) console.log(`No new unique client rows to append to ${survivorBasename}.`);
            return survivorContent;
        }

        if (headingIndex !== -1) {
            let insertAtIndex = headingIndex + 1;
            let tableStructureExists = false;
            let headerLineIndex = -1;
            let separatorLineIndex = -1;

            for (let i = headingIndex + 1; i < lines.length; i++) {
                const trimmedLine = lines[i].trim();
                if (trimmedLine.startsWith("###") || trimmedLine.startsWith("##")) {
                    insertAtIndex = i;
                    break;
                }
                if (trimmedLine.toLowerCase() === tableHeader.toLowerCase()) {
                    headerLineIndex = i;
                    tableStructureExists = true;
                }
                if (trimmedLine === tableSeparator) {
                    separatorLineIndex = i;
                    tableStructureExists = true;
                }

                if (trimmedLine.startsWith("|") && trimmedLine.endsWith("|")) {
                    tableStructureExists = true;
                    insertAtIndex = i + 1;
                } else if (tableStructureExists && trimmedLine === "") {
                    insertAtIndex = i;
                    break;
                } else if (tableStructureExists && trimmedLine !== "") {
                    insertAtIndex = i;
                    break;
                }
                 if (i === lines.length -1) insertAtIndex = lines.length;
            }

            let newContentToInsertBlock = "";

             if (lines[headingIndex] && !lines[headingIndex].endsWith("\n") && (headerLineIndex === -1 || separatorLineIndex === -1) ) {
                 if (lines[headingIndex+1] === undefined || (lines[headingIndex+1] && !lines[headingIndex+1].trim().startsWith("|"))){
                    lines[headingIndex] = lines[headingIndex] + "\n";
                 }
            }

            if (headerLineIndex === -1) {
                let prefixNewline = (insertAtIndex === headingIndex + 1 && lines[headingIndex] && !lines[headingIndex].endsWith("\n")) ? "\n" : "";
                if (lines[insertAtIndex-1] && lines[insertAtIndex-1].trim() !== "" && !lines[insertAtIndex-1].endsWith("\n")) prefixNewline = "\n";
                newContentToInsertBlock += prefixNewline + tableHeader + "\n";
            }
            if (separatorLineIndex === -1) {
                 newContentToInsertBlock += tableSeparator + "\n";
            }

            newContentToInsertBlock += uniqueRowsToAppendFiltered.join("\n");

            if (lines[insertAtIndex] !== undefined && lines[insertAtIndex].trim() !== "") {
                if (!newContentToInsertBlock.endsWith("\n")) {
                    newContentToInsertBlock += "\n";
                }
            }

            if (insertAtIndex === lines.length && lines.length > 0 && lines[lines.length-1] && !lines[lines.length-1].endsWith("\n")) {
                if(newContentToInsertBlock.trim() !== "") lines[lines.length-1] += "\n";
            }

            lines.splice(insertAtIndex, 0, newContentToInsertBlock.trimEnd() + (newContentToInsertBlock.trimEnd() && lines[insertAtIndex] !== undefined && lines[insertAtIndex].trim() !== "" ? "\n" : ""));
            if (this.settings.verboseDebug) console.log(`Appending ${uniqueRowsToAppendFiltered.length} new unique client rows to ${survivorBasename}.`);
            return lines.join("\n").replace(/\n{3,}/g, '\n\n');

        } else {
            let newSection = "";
            if (survivorContent.trim() !== "") {
                 newSection = (survivorContent.endsWith("\n\n") ? "" : (survivorContent.endsWith("\n") ? "\n" : "\n\n"));
            }
            newSection += `### ${clientsHeadingText}\n`;
            newSection += tableHeader + "\n";
            newSection += tableSeparator + "\n";
            newSection += uniqueRowsToAppendFiltered.join("\n") + "\n";
            if (this.settings.verboseDebug) console.log(`Creating new client table in ${survivorBasename} with ${uniqueRowsToAppendFiltered.length} rows.`);
            return survivorContent + newSection;
        }
    }
}

// ----- MODAL CLASSES -----
class ManualInputModal extends Modal {
    processorName: string = ''; listUrl: string = '';
    onSubmit: (processorName: string, listUrl: string) => void;
    initialProcessorName?: string;
    processorNameInputEl?: HTMLInputElement;
    listUrlInputEl?: HTMLInputElement;

    constructor(app: App, onSubmit: (processorName: string, listUrl: string) => void, initialProcessorName?: string) {
        super(app); this.onSubmit = onSubmit; this.initialProcessorName = initialProcessorName;
        if(initialProcessorName) this.processorName = initialProcessorName;
    }
    onOpen() {
        const { contentEl } = this; contentEl.createEl('h2', { text: 'Manually Input Subprocessor List URL' });
        
        new Setting(contentEl)
            .setName('Data Processor Name:')
            .setDesc('The company whose subprocessor list you are providing.')
            .addText(text => {
                this.processorNameInputEl = text.inputEl;
                text.setPlaceholder('e.g., OpenAI')
                    .setValue(this.processorName)
                    .onChange(value => this.processorName = value.trim());
                if(this.initialProcessorName) text.inputEl.disabled = true;
            });

        new Setting(contentEl)
            .setName('Subprocessor List URL:')
            .setDesc('The direct URL to the subprocessor list page.')
            .addText(text => {
                this.listUrlInputEl = text.inputEl;
                text.inputEl.type = 'url';
                text.setPlaceholder('https://...')
                    .setValue(this.listUrl)
                    .onChange(value => this.listUrl = value.trim());
                text.inputEl.style.width = '100%';
                if (this.initialProcessorName && this.listUrlInputEl) {
                    this.listUrlInputEl.focus();
                } else if (this.processorNameInputEl) {
                    this.processorNameInputEl.focus();
                }
                 text.inputEl.addEventListener('keypress', (ev) => { if (ev.key === 'Enter') handleSubmit(); });
            });
        
        const handleSubmit = () => {
            if (this.processorName && this.listUrl) { try { new URL(this.listUrl); this.close(); this.onSubmit(this.processorName, this.listUrl); } catch (_) { new Notice("Please enter a valid URL."); } }
            else if (!this.processorName) { new Notice("Please enter a processor name."); this.processorNameInputEl?.focus(); } 
            else { new Notice("Please enter the URL."); this.listUrlInputEl?.focus(); }
        };
        
        if(this.processorNameInputEl) this.processorNameInputEl.addEventListener('keypress', (ev) => {if (ev.key === 'Enter') {ev.preventDefault(); this.listUrlInputEl?.focus();} });
        
        const submitButton = contentEl.createEl('button', { text: 'Process This URL' });
        submitButton.onClickEvent(handleSubmit);
    }
    onClose() { this.contentEl.empty(); }
}

class SearchModal extends Modal {
    processorName: string = ""; onSubmit: (processorName: string) => void;
    constructor(app: App, settings: ProcessorProcessorSettings, onSubmit: (processorName: string) => void) { super(app); this.onSubmit = onSubmit; }
    onOpen() { const { contentEl } = this; contentEl.createEl('h2', { text: 'Discover Subprocessors (Search)' }); contentEl.createEl('p', {text: 'Data processor to search for:'}); const inputEl = contentEl.createEl('input', { type: 'text', placeholder: 'e.g., OpenAI' }); inputEl.style.width = '100%'; inputEl.style.marginBottom = '1rem'; inputEl.focus(); const submitButton = contentEl.createEl('button', { text: 'Search & Discover' }); const handleSearch = () => { this.processorName = inputEl.value.trim(); if (this.processorName) { this.close(); this.onSubmit(this.processorName); } else { new Notice("Please enter a processor name."); }}; inputEl.addEventListener('keypress', (ev) => { if (ev.key === 'Enter') handleSearch(); });
    submitButton.onClickEvent(handleSearch);
    }
    onClose() { this.contentEl.empty(); }
}

class ManualTextEntryModal extends Modal {
    processorName: string = '';
    pastedText: string = '';
    onSubmit: (processorName: string, pastedText: string) => void;
    initialProcessorName?: string;
    processorNameInputEl?: HTMLInputElement;

    constructor(app: App, onSubmit: (processorName: string, pastedText: string) => void, initialProcessorName?: string) {
        super(app);
        this.onSubmit = onSubmit;
        this.initialProcessorName = initialProcessorName;
        if (this.initialProcessorName) this.processorName = this.initialProcessorName;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'Input Subprocessor List from Text' });

        new Setting(contentEl)
            .setName('Data Processor Name:')
            .addText(text => {
                this.processorNameInputEl = text.inputEl;
                text.setPlaceholder('e.g., Vanta')
                    .setValue(this.processorName)
                    .onChange(value => this.processorName = value.trim());
                 if (this.initialProcessorName) {
                    text.inputEl.disabled = true;
                }
            });

        contentEl.createEl('p', { text: 'Paste the subprocessor list text here:' });
        const textArea = contentEl.createEl('textarea');
        textArea.style.width = '100%';
        textArea.style.minHeight = '200px';
        textArea.style.marginBottom = '1rem';
        textArea.placeholder = 'Paste the copied text containing subprocessor information...';

        if (!this.initialProcessorName && this.processorNameInputEl) {
            this.processorNameInputEl.focus();
        } else {
            textArea.focus();
        }

        const submitButton = contentEl.createEl('button', { text: 'Process Pasted Text' });

        const handleSubmit = () => {
            if (this.processorNameInputEl) this.processorName = this.processorNameInputEl.value.trim();
            this.pastedText = textArea.value.trim();
            if (this.processorName && this.pastedText) {
                this.close();
                this.onSubmit(this.processorName, this.pastedText);
            } else if (!this.processorName) {
                new Notice("Please enter a processor name.");
                this.processorNameInputEl?.focus();
            } else {
                new Notice("Please paste some text to process.");
                textArea.focus();
            }
        };
        if(this.processorNameInputEl) this.processorNameInputEl.addEventListener('keypress', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); textArea.focus();} });
        textArea.addEventListener('keypress', (ev) => { if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey) ) handleSubmit(); });
        submitButton.onClickEvent(handleSubmit);
    }

    onClose() {
        this.contentEl.empty();
    }
}

// ----- SETTINGS TAB CLASS -----
class ProcessorProcessorSettingTab extends PluginSettingTab {
    plugin: ProcessorProcessorPlugin; constructor(app: App, plugin: ProcessorProcessorPlugin) { super(app, plugin); this.plugin = plugin; }
    display(): void {
        const { containerEl } = this; containerEl.empty(); containerEl.createEl('h2', { text: 'Procesor Processor Settings' });

        containerEl.createEl('h3', { text: 'General Behavior' });
        new Setting(containerEl)
            .setName('Create pages for corporate affiliates/own entities')
            .setDesc('If enabled, separate .md pages will be created for entities identified as "own_entities" (corporate affiliates) of a processor. By default, this is off to reduce note clutter.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.createPagesForOwnEntities)
                .onChange(async (value) => {
                    this.plugin.settings.createPagesForOwnEntities = value;
                    await this.plugin.saveSettings();
                }));

        containerEl.createEl('h3', { text: 'Folder Configuration' });
        new Setting(containerEl).setName('Processors Folder Path').setDesc('Folder for processor notes (e.g., "Processors" or "Legal/Processors"). Do not start with /').addText(text => text.setPlaceholder(DEFAULT_SETTINGS.processorsFolderPath).setValue(this.plugin.settings.processorsFolderPath).onChange(async (value) => { this.plugin.settings.processorsFolderPath = value.trim().replace(/^\/+|\/+$/g, '') || DEFAULT_SETTINGS.processorsFolderPath; await this.plugin.saveSettings(); }));
        new Setting(containerEl).setName('Analysis Logs Folder Path').setDesc('Folder for analysis log notes. Do not start with /').addText(text => text.setPlaceholder(DEFAULT_SETTINGS.analysisLogsFolderPath).setValue(this.plugin.settings.analysisLogsFolderPath).onChange(async (value) => { this.plugin.settings.analysisLogsFolderPath = value.trim().replace(/^\/+|\/+$/g, '') || DEFAULT_SETTINGS.analysisLogsFolderPath; await this.plugin.saveSettings(); }));

        containerEl.createEl('h3', { text: 'Search Configuration' });
        new Setting(containerEl).setName('Max Verified Lists per Processor').setDesc('Max verified lists to process per discovery (0 for unlimited). Also limits number of DDG queries if that is used.').addText(text => text .setPlaceholder('e.g., 5') .setValue(this.plugin.settings.maxResultsPerProcessor.toString()) .onChange(async (value) => { const num = parseInt(value); if (!isNaN(num) && num >= 0) { this.plugin.settings.maxResultsPerProcessor = num; await this.plugin.saveSettings(); } else { new Notice("Enter a valid non-negative number."); }}));

        containerEl.createEl('h3', { text: 'API Keys' });
        new Setting(containerEl).setName('SerpAPI Key').setDesc("Optional. If provided, SerpAPI (Google search) will be used. If blank, DuckDuckGo via RightBrain will be used if RightBrain is configured.").addText(text => text .setPlaceholder('Your SerpAPI key (optional)').setValue(this.plugin.settings.serpApiKey) .onChange(async (value) => { this.plugin.settings.serpApiKey = value.trim(); await this.plugin.saveSettings(); }));

        containerEl.createEl('h3', { text: 'RightBrain API Configuration' });
        new Setting(containerEl).setName('RightBrain Client ID').addText(text => text.setPlaceholder('Client ID').setValue(this.plugin.settings.rightbrainClientId).onChange(async (v) => { this.plugin.settings.rightbrainClientId = v.trim(); await this.plugin.saveSettings();}));
        new Setting(containerEl).setName('RightBrain Client Secret').addText(text => text.setPlaceholder('Client Secret').setValue(this.plugin.settings.rightbrainClientSecret).onChange(async (v) => { this.plugin.settings.rightbrainClientSecret = v.trim(); await this.plugin.saveSettings();}));
        new Setting(containerEl).setName('RightBrain Organization ID').addText(text => text.setPlaceholder('Org ID').setValue(this.plugin.settings.rightbrainOrgId).onChange(async (v) => { this.plugin.settings.rightbrainOrgId = v.trim(); await this.plugin.saveSettings();}));
        new Setting(containerEl).setName('RightBrain Project ID').addText(text => text.setPlaceholder('Project ID').setValue(this.plugin.settings.rightbrainProjectId).onChange(async (v) => { this.plugin.settings.rightbrainProjectId = v.trim(); await this.plugin.saveSettings();}));
        
        containerEl.createEl('h4', {text: 'RightBrain Task IDs'});
        new Setting(containerEl).setName('RB Verify URL Task ID').setDesc("Task ID for verifying if a URL points to a subprocessor list.").addText(text => text.setPlaceholder('Verify URL Task ID').setValue(this.plugin.settings.rightbrainVerifyUrlTaskId).onChange(async (v) => { this.plugin.settings.rightbrainVerifyUrlTaskId = v.trim(); await this.plugin.saveSettings();}));
        new Setting(containerEl).setName('RB Extract Entities Task ID').setDesc("Task ID for extracting entities from text (fetched URL content OR manually pasted text).").addText(text => text.setPlaceholder('Extract Entities Task ID').setValue(this.plugin.settings.rightbrainExtractEntitiesTaskId).onChange(async (v) => { this.plugin.settings.rightbrainExtractEntitiesTaskId = v.trim(); await this.plugin.saveSettings();}));
        new Setting(containerEl)
            .setName('RB Deduplicate Subprocessors Task ID')
            .setDesc("Task ID for identifying and merging duplicate subprocessor pages.")
            .addText(text => text
                .setPlaceholder('Deduplication Task ID')
                .setValue(this.plugin.settings.rightbrainDeduplicateSubprocessorsTaskId)
                .onChange(async (v) => {
                    this.plugin.settings.rightbrainDeduplicateSubprocessorsTaskId = v.trim();
                    await this.plugin.saveSettings();
                }));
        new Setting(containerEl)
            .setName('RB DuckDuckGo Search Task ID')
            .setDesc("Task ID for searching DuckDuckGo and parsing SERPs. Will be auto-created if RightBrain is configured and this ID is empty.")
            .addText(text => text
                .setPlaceholder('Auto-created if empty')
                .setValue(this.plugin.settings.rightbrainDuckDuckGoSearchTaskId)
                .onChange(async (v) => {
                    this.plugin.settings.rightbrainDuckDuckGoSearchTaskId = v.trim();
                    await this.plugin.saveSettings();
                }));

        containerEl.createEl('h4', {text: 'Advanced RightBrain Field Names (for Extraction Tasks)'});
        new Setting(containerEl).setName('RB Extract Input Field').setDesc("Input field name for page/pasted text in extraction tasks (e.g., 'page_text', 'document_content').").addText(text => text.setPlaceholder(DEFAULT_SETTINGS.rightbrainExtractInputField).setValue(this.plugin.settings.rightbrainExtractInputField).onChange(async (v) => { this.plugin.settings.rightbrainExtractInputField = v.trim(); await this.plugin.saveSettings();}));
        new Setting(containerEl).setName('RB Extract Output (Third Party)').setDesc("Output field name for third-party subprocessors.").addText(text => text.setPlaceholder(DEFAULT_SETTINGS.rightbrainExtractOutputThirdPartyField).setValue(this.plugin.settings.rightbrainExtractOutputThirdPartyField).onChange(async (v) => { this.plugin.settings.rightbrainExtractOutputThirdPartyField = v.trim(); await this.plugin.saveSettings();}));
        new Setting(containerEl).setName('RB Extract Output (Own Entities)').setDesc("Output field name for own/affiliated entities.").addText(text => text.setPlaceholder(DEFAULT_SETTINGS.rightbrainExtractOutputOwnEntitiesField).setValue(this.plugin.settings.rightbrainExtractOutputOwnEntitiesField).onChange(async (v) => { this.plugin.settings.rightbrainExtractOutputOwnEntitiesField = v.trim(); await this.plugin.saveSettings();}));

        containerEl.createEl('h3', {text: 'Debugging'});
        new Setting(containerEl).setName('Verbose Debug Logging').setDesc('Enable detailed console logging.').addToggle(toggle => toggle .setValue(this.plugin.settings.verboseDebug).onChange(async (value) => { this.plugin.settings.verboseDebug = value; await this.plugin.saveSettings(); }));
    }
}