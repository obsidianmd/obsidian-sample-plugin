import {
	DataAdapter,
	DataWriteOptions,
	EventRef,
	TAbstractFile,
	TFile,
	TFolder,
	Vault,
} from "obsidian";
import { basename, dirname, join, normalize } from "path";

/**
 * Return all files that exist under a given folder.
 * @param folder Folder to collect children under.
 * @returns All files under this folder, recursively.
 */
const collectChildren = (folder: TFolder): TAbstractFile[] => {
	return folder.children.flatMap((f) => {
		if (f instanceof TFolder) {
			return [f, ...collectChildren(f)];
		} else {
			return f;
		}
	});
};

export class MockVault implements Vault {
	root: TFolder;
	contents: Map<string, string>;

	constructor(root: TFolder, contents: Map<string, string>) {
		this.root = root;
		this.contents = contents;
	}

	// These aren't implemented in the mock.
	adapter: DataAdapter = {} as DataAdapter;
	configDir = "";

	getName(): string {
		return "Mock Vault";
	}

	getAllLoadedFiles(): TAbstractFile[] {
		return [this.root, ...collectChildren(this.root)];
	}

	getAbstractFileByPath(path: string): TAbstractFile | null {
		const normalizedPath = join("/", normalize(path));
		return (
			this.getAllLoadedFiles().find(
				(f) => join("/", normalize(f.path)) === normalizedPath
			) || null
		);
	}
	getRoot(): TFolder {
		return this.root;
	}
	async read(file: TFile): Promise<string> {
		const p = join("/", file.path);
		const contents = this.contents.get(p);
		if (!contents) {
			throw new Error(`File at path ${p} does not have contents`);
		}
		return contents;
	}
	cachedRead(file: TFile): Promise<string> {
		return this.read(file);
	}

	getFiles(): TFile[] {
		return this.getAllLoadedFiles().flatMap((f) =>
			f instanceof TFile ? f : []
		);
	}

	getMarkdownFiles(): TFile[] {
		return this.getFiles().filter(
			(f) => f.extension.toLowerCase() === "md"
		);
	}

	private setParent(path: string, f: TAbstractFile) {
		const parentPath = dirname(path);
		const folder = this.getAbstractFileByPath(parentPath);
		if (folder instanceof TFolder) {
			f.parent = folder;
			folder.children.push(f);
		}
		throw new Error("Parent path is not folder.");
	}

	process(
		file: TFile,
		fn: (data: string) => string,
		options?: DataWriteOptions | undefined
	): Promise<string> {
		throw new Error("Method not implemented.");
	}

	async create(
		path: string,
		data: string,
		options?: DataWriteOptions | undefined
	): Promise<TFile> {
		if (this.getAbstractFileByPath(path)) {
			throw new Error("File already exists.");
		}
		const file = new TFile();
		file.name = basename(path);
		this.setParent(path, file);
		this.contents.set(path, data);
		return file;
	}
	async createFolder(path: string): Promise<TFolder> {
		const folder = new TFolder();
		folder.name = basename(path);
		this.setParent(path, folder);
		return folder;
	}
	async delete(
		file: TAbstractFile,
		force?: boolean | undefined
	): Promise<void> {
		file.parent?.children.remove(file);
	}
	trash(file: TAbstractFile, system: boolean): Promise<void> {
		return this.delete(file);
	}

	async rename(file: TAbstractFile, newPath: string): Promise<void> {
		const newParentPath = dirname(newPath);
		const newParent = this.getAbstractFileByPath(newParentPath);
		if (!(newParent instanceof TFolder)) {
			throw new Error(`No such folder: ${newParentPath}`);
		}

		if (file instanceof TFile) {
			// If we're renaming a file, just update the parent and name in the
			// file, and the entry in the content map.
			const contents = this.contents.get(file.path);
			if (!contents) {
				throw new Error(`File did not have contents: ${file.path}`);
			}
			this.contents.delete(file.path);

			// Update the parent and name and re-set contents with the new path.
			// NOTE: This relies on using the included mock that derives the path
			// from the parent and filename as a getter property.
			file.parent = newParent;
			file.name = basename(newPath);
			this.contents.set(file.path, contents);
		} else if (file instanceof TFolder) {
			// If we're renaming a folder, we need to update the content map for
			// every TFile under this folder.

			// Collect all files under this folder, get the string contents, delete
			// the entry for the old path, and return the file and contents in a tuple.
			const filesAndContents = collectChildren(file)
				.flatMap((f) => (f instanceof TFile ? f : []))
				.map((f): [TFile, string] => {
					const contents = this.contents.get(f.path);
					if (!contents) {
						throw new Error(
							`File did not have contents: ${f.path}`
						);
					}
					this.contents.delete(f.path);
					return [f, contents];
				});

			// Update the parent and name for this folder.
			file.parent = newParent;
			file.name = basename(newPath);

			// Re-add all the paths to the content dir.
			for (const [f, contents] of filesAndContents) {
				this.contents.set(f.path, contents);
			}
		} else {
			throw new Error(`File is not a file or folder: ${file.path}`);
		}
	}

	async modify(
		file: TFile,
		data: string,
		options?: DataWriteOptions | undefined
	): Promise<void> {
		this.contents.set(file.path, data);
	}

	async copy(file: TFile, newPath: string): Promise<TFile> {
		const data = await this.read(file);
		return await this.create(newPath, data);
	}

	// TODO: Implement callbacks.
	on(
		name: "create",
		callback: (file: TAbstractFile) => unknown,
		ctx?: unknown
	): EventRef;
	on(
		name: "modify",
		callback: (file: TAbstractFile) => unknown,
		ctx?: unknown
	): EventRef;
	on(
		name: "delete",
		callback: (file: TAbstractFile) => unknown,
		ctx?: unknown
	): EventRef;
	on(
		name: "rename",
		callback: (file: TAbstractFile, oldPath: string) => unknown,
		ctx?: unknown
	): EventRef;
	on(name: "closed", callback: () => unknown, ctx?: unknown): EventRef;
	on(name: unknown, callback: unknown, ctx?: unknown): EventRef {
		throw new Error("Method not implemented.");
	}
	off(name: string, callback: (...data: unknown[]) => unknown): void {
		throw new Error("Method not implemented.");
	}
	offref(ref: EventRef): void {
		throw new Error("Method not implemented.");
	}
	trigger(name: string, ...data: unknown[]): void {
		throw new Error("Method not implemented.");
	}
	tryTrigger(evt: EventRef, args: unknown[]): void {
		throw new Error("Method not implemented.");
	}
	append(
		file: TFile,
		data: string,
		options?: DataWriteOptions | undefined
	): Promise<void> {
		throw new Error("Method not implemented.");
	}

	createBinary(
		path: string,
		data: ArrayBuffer,
		options?: DataWriteOptions | undefined
	): Promise<TFile> {
		throw new Error("Method not implemented.");
	}
	readBinary(file: TFile): Promise<ArrayBuffer> {
		throw new Error("Method not implemented.");
	}

	modifyBinary(
		file: TFile,
		data: ArrayBuffer,
		options?: DataWriteOptions | undefined
	): Promise<void> {
		throw new Error("Method not implemented.");
	}

	getResourcePath(file: TFile): string {
		throw new Error("Method not implemented.");
	}
}
