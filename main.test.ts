import { TFile, MetadataCache, Vault, Workspace, MarkdownView } from 'obsidian';
import MoveNotePlugin from './main';

describe('MoveNotePlugin', () => {
    let plugin: MoveNotePlugin;
    let app: { metadataCache: MetadataCache, vault: Vault, workspace: Workspace };

    beforeEach(() => {
        app = {
            metadataCache: {
                getFileCache: jest.fn()
            } as unknown as MetadataCache,
            vault: {} as Vault,
            workspace: {
                getActiveViewOfType: jest.fn()
            } as unknown as Workspace
        };
        plugin = new MoveNotePlugin(app as any, {} as any);
    });

    it('should return tags from the provided file', async () => {
        const file = { path: 'test.md' } as TFile;
        const fileCache = {
            frontmatter: { tags: ['#tag1', '#tag2'] },
            tags: [{ tag: '#tag3' }]
        };
        (app.metadataCache.getFileCache as jest.Mock).mockReturnValue(fileCache);

        const tags = await plugin.getTagsFromNote(file);

        expect(tags).toEqual(['tag1', 'tag2', 'tag3']);
        expect(app.metadataCache.getFileCache).toHaveBeenCalledWith(file);
    });

    it('should return tags from the active file if no file is provided', async () => {
        const file = { path: 'active.md' } as TFile;
        const fileCache = {
            frontmatter: { tags: ['#tag1'] },
            tags: [{ tag: '#tag2' }]
        };
        (app.workspace.getActiveViewOfType as jest.Mock).mockReturnValue({
            file
        } as MarkdownView);
        (app.metadataCache.getFileCache as jest.Mock).mockReturnValue(fileCache);

        const tags = await plugin.getTagsFromNote();

        expect(tags).toEqual(['tag1', 'tag2']);
        expect(app.metadataCache.getFileCache).toHaveBeenCalledWith(file);
    });

    it('should return undefined if no file is provided and no active file is found', async () => {
        (app.workspace.getActiveViewOfType as jest.Mock).mockReturnValue(null);

        const tags = await plugin.getTagsFromNote();

        expect(tags).toBeUndefined();
        expect(app.metadataCache.getFileCache).not.toHaveBeenCalled();
    });

    it('should return an empty array if no tags are found', async () => {
        const file = { path: 'test.md' } as TFile;
        const fileCache = {
            frontmatter: { tags: [] },
            tags: []
        };
        (app.metadataCache.getFileCache as jest.Mock).mockReturnValue(fileCache);

        const tags = await plugin.getTagsFromNote(file);

        expect(tags).toEqual([]);
        expect(app.metadataCache.getFileCache).toHaveBeenCalledWith(file);
    });
});