import { Client } from '@notionhq/client';
import { NotionSyncSettings } from '../types';
import { Notice, requestUrl, RequestUrlParam } from 'obsidian';

export class NotionService {
    private client: Client;
    private readonly MAX_CONTENT_SIZE = 1024 * 1024; // 1MB
    private readonly token: string;

    constructor(token: string) {
        this.token = token;
        this.client = new Client({
            auth: token,
            notionVersion: '2022-06-28',
            fetch: this.customFetch.bind(this)
        });
    }

    private async customFetch(url: string, options: any): Promise<Response> {
        try {
            const headers = {
                'Authorization': `Bearer ${this.token}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json',
                'mode': 'no-cors',
                'credentials': 'omit'
            };

            const params: RequestUrlParam = {
                url,
                method: options.method,
                headers,
                body: options.body
            };

            const response = await requestUrl(params);

            if (response.status === 401) {
                throw new Error('Authentication failed: Invalid token or insufficient permissions');
            }

            if (response.status >= 400) {
                throw new Error(`API error (${response.status}): ${response.text}`);
            }

            return new Response(response.text, {
                status: response.status,
                headers: new Headers(response.headers)
            });
        } catch (error) {
            if (error.message.includes('CORS')) {
                throw new Error('CORS error: Unable to access Notion API. Try refreshing the token.');
            }
            throw error;
        }
    }

    async createOrUpdatePage(databaseId: string, content: any, settings: NotionSyncSettings, fileName: string): Promise<void> {
        try {
            const contentSize = new TextEncoder().encode(JSON.stringify(content)).length;
            if (contentSize > this.MAX_CONTENT_SIZE) {
                throw new Error('Content size exceeds maximum limit');
            }

            const blocks = this.formatBlocks(content);

            try {
                const requestData = {
                    parent: {
                        type: 'database_id',
                        database_id: databaseId
                    },
                    properties: {
                        title: {
                            type: 'title',
                            title: [
                                {
                                    type: 'text',
                                    text: {
                                        content: fileName
                                    }
                                }
                            ]
                        }
                    },
                    children: blocks.map(block => ({
                        object: 'block',
                        ...block
                    }))
                };

                const response = await this.client.pages.create(requestData as any);

                if (!response || !response.id) {
                    throw new Error('Failed to create page in Notion');
                }

            } catch (apiError: any) {
                throw new Error(`Failed to create page: ${apiError.message}`);
            }

        } catch (error) {
            throw new Error('Failed to sync with Notion');
        }
    }

    private formatBlocks(blocks: any[]): any[] {
        return blocks.map(block => {
            if (typeof block === 'object' && block.type) {
                const formattedBlock: any = {
                    type: block.type
                };

                switch (block.type) {
                    case 'paragraph':
                        formattedBlock[block.type] = {
                            rich_text: [
                                {
                                    type: 'text',
                                    text: {
                                        content: block.paragraph?.rich_text?.[0]?.text?.content || ''
                                    }
                                }
                            ]
                        };
                        break;
                    case 'heading_1':
                    case 'heading_2':
                    case 'heading_3':
                        formattedBlock[block.type] = {
                            rich_text: [
                                {
                                    type: 'text',
                                    text: {
                                        content: block[block.type]?.rich_text?.[0]?.text?.content || ''
                                    }
                                }
                            ],
                            color: 'default'
                        };
                        break;
                    case 'bulleted_list_item':
                    case 'numbered_list_item':
                        formattedBlock[block.type] = {
                            rich_text: [
                                {
                                    type: 'text',
                                    text: {
                                        content: block[block.type]?.rich_text?.[0]?.text?.content || ''
                                    }
                                }
                            ],
                            color: 'default'
                        };
                        break;
                    default:
                        console.warn('Unsupported block type:', block.type);
                        return null;
                }

                return formattedBlock;
            }
            return null;
        }).filter(block => block !== null);
    }
}