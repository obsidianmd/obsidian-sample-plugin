import { Notice } from 'obsidian';

export const createNotice = (message: string, timeout = 5000): void => {
    new Notice(`Obsidian Intelligence: ${message}`, timeout);
};
