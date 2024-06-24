import axios from "axios";
import * as cheerio from 'cheerio';

export interface OldpSearchResponseItem {
    link: string;
    title: string;
    snippet: string;
}

export class OldpApi {
    private readonly corsProxyUrl = 'https://cors-anywhere.herokuapp.com'
    private readonly baseUrl = 'https://de.openlegaldata.io';
    
    constructor() {}

    private async getRawSearchResults(searchTerm: string): Promise<string | null> {
        try {
            const url = `${this.baseUrl}/search/?selected_facets=facet_model_name_exact%3ALaw&q=${encodeURIComponent(searchTerm)}`
            const response = await axios.get<string>(`${this.corsProxyUrl}/${url}`);
            const html = response.data;
            return html;
        } catch (error) {
            console.error('Error fetching search results:', error);
            return null;
        }
    }

    private parseSearchResults(data: string): OldpSearchResponseItem[] {
        const webDocument = cheerio.load(data);
        const searchItems: OldpSearchResponseItem[] = [];
    
        webDocument('.search-items li').each((index, element) => {
            const link = `${this.baseUrl}${webDocument(element).find('a').attr('href')}`;
            const title = (webDocument(element).find('h4').text()).replace('(Law)', '');
            const snippet = webDocument(element).find('.search-snippet').text();
        
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