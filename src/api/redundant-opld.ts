import axios, { Axios, AxiosInstance } from "axios";
import * as cheerio from 'cheerio';
import { Notice } from "obsidian";

export interface OldpSearchResponseItem {
    link: string;
    title: string;
    snippet: string;
}


export class OldpApi {
    private readonly corsProxyUrl = 'https://cors-anywhere.herokuapp.com';
    private readonly baseUrl = 'https://de.openlegaldata.io';
    private axiosClient: AxiosInstance;
    private abortController: AbortController | null = null;

    constructor() {
        this.axiosClient = axios.create({
            maxRedirects: 0,
            responseType: 'text',
        });
    }

    private async getRawSearchResults(searchTerm: string): Promise<string | null> {
        /*if (this.abortController) {
            // Abort the current request
            this.abortController.abort();
        }

        // TODO: fix this, after one abort all requests afterwords don't get used
        this.abortController = new AbortController();*/

        try {
            const url = `${this.baseUrl}/search/?selected_facets=facet_model_name_exact%3ALaw&q=${encodeURIComponent(searchTerm)}`;

            const response = await this.axiosClient.get<string>(`${this.corsProxyUrl}/${url}`, {
                //signal: this.abortController.signal,
            });
            const html = response.data;

            return html;
        } catch (error: any) {
            // handle aborted "error"
            //if (this.abortController.signal.aborted || error?.code === 'ERR_CANCELED') return null;

            console.error('Error fetching search results:', error);

            new Notice(`An error occurred while trying to request the oldp.io API. Please check your internet connection. Code: ${error?.code}`);
            return null;
        }
    }
    
    private parseSearchResults(data: string): OldpSearchResponseItem[] {
        const webDocument = cheerio.load(data);
        const searchItems: OldpSearchResponseItem[] = [];
    
        webDocument('.search-items li').each((index, element) => {
            const link = `${this.baseUrl}${webDocument(element).find('a').attr('href')}`;
            const title = (webDocument(element).find('h4').text()).replace('(Law)', '').trim();
            const snippet = webDocument(element).find('.search-snippet').text().trim();
        
            searchItems.push({
                link,
                title,
                snippet
            });
        });
    
        return searchItems;
    }

    public async search(searchTerm: string): Promise<OldpSearchResponseItem[]> {
        const rawSearchResult = await this.getRawSearchResults(searchTerm);
        if (rawSearchResult === null) return [];

        return this.parseSearchResults(rawSearchResult);
    }
}