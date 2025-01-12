import { Notice } from 'obsidian';

export class DataValidator {
    static validateToken(token: string): boolean {
        return token.startsWith('secret_') && token.length > 50;
    }

    static validateDatabaseId(id: string): boolean {
        return /^[a-zA-Z0-9-]{32,}$/.test(id);
    }

    static validateContent(content: string): boolean {
        return Boolean(content) && content.length > 0;
    }
} 