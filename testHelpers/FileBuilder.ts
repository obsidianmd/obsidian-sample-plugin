import { CachedMetadata, ListItemCache, Loc, Pos } from "obsidian";

type ListItem = {
	type: "item";
	text: string;
	checkbox: "x" | " " | undefined;
};

type ListBlock = {
	type: "list";
	items: (ListItem | ListBlock)[];
};

type ListBlockItem = {
	type: "listitem";
	text: string;
	checkbox: " " | "x" | undefined;
	depth: number;
	parent: number; // TODO: Higher-level helper to build full lists to properly set the parent.
};

const makeListItems = (
	list: ListBlock,
	startingLine: number,
	depth = 0
): ListBlockItem[] => {
	if (startingLine === 0) {
		// Special case from Obsidian. My guess is that plugins can check for nested
		// lists with `parent > 0` rather than `parent >= 0`.
		startingLine = 1;
	}
	const lines: ListBlockItem[] = [];
	for (const i of list.items) {
		if (i.type === "item") {
			lines.push({
				type: "listitem",
				text: i.text,
				checkbox: i.checkbox,
				depth,
				parent: depth === 0 ? -startingLine : startingLine,
			});
		} else {
			lines.push(
				...makeListItems(i, startingLine + lines.length - 1, depth + 1)
			);
		}
	}
	return lines;
};

type FileBlock =
	| {
			type: "heading";
			text: string;
			level: number;
    }
	| ListBlock
	| { type: "frontmatter"; key: string; text: string }
	| { type: "text"; text: string };

const makeFile = (
	lines: FileBlock[],
	tabChars = " ".repeat(4)
): [string, CachedMetadata] => {
	let lineNum = 0;
	let content = "";

	const appendLine = (line: string): Pos => {
		const start: Loc = { line: lineNum, col: 0, offset: content.length };
		content += `${line}\n`;
		const end: Loc = {
			line: lineNum++,
			col: line.length, // Columns are 0-indexed
			offset: content.length - 1, // Account for the newline and 0-indexing.
		};
		return { start, end };
	};

	const meta: CachedMetadata = {};

	const frontmatter = lines.flatMap((l) =>
		l.type === "frontmatter" ? l : []
	);

	if (frontmatter.length > 0) {
		const data: { [key: string]: unknown } = {};
		const { start } = appendLine("---");
		for (const elt of frontmatter) {
			if (Array.isArray(elt.text)) {
				appendLine(`${elt.key}: [${elt.text}]`);
			} else {
				appendLine(`${elt.key}: ${elt.text}`);
			}
			data[elt.key] = elt.text;
		}
		const { end } = appendLine("---");
		meta.frontmatter = {
			position: { start, end },
			...data,
		};
	}

	const blocks = lines.flatMap((l) => (l.type !== "frontmatter" ? l : []));
	for (const block of blocks) {
		switch (block.type) {
			case "heading": {
				if (!meta.headings) {
					meta.headings = [];
				}
				const position = appendLine(
					"#".repeat(block.level) + " " + block.text
				);
				meta.headings.push({
					position,
					heading: block.text,
					level: block.level,
				});
				continue;
			}

			case "list": {
				if (!meta.listItems) {
					meta.listItems = [];
				}
				for (const item of makeListItems(block, lineNum)) {
					const indent = tabChars.repeat(item.depth);
					const position = appendLine(
						indent +
							"- " +
							(item.checkbox ? `[${item.checkbox}] ` : "") +
							item.text
					);
					if (indent.length > 0) {
						position.start.col += indent.length - 2;
						position.start.offset += indent.length - 2;
					}

					const listItem: ListItemCache = {
						position,
						parent: item.parent,
					};
					if (item.checkbox) {
						listItem["task"] = item.checkbox;
					}

					meta.listItems.push(listItem);
				}

				continue;
			}

			case "text":
				appendLine(block.text);
		}
	}

	return [content, meta];
};

/**
 * Build up lists that can be consumed by the FileBuilder.
 */
export class ListBuilder {
	items: (ListItem | ListBlock)[] = [];

	constructor(items: (ListItem | ListBlock)[] = []) {
		this.items = items;
	}

	item(text: string, checkbox?: boolean | undefined) {
		const i: ListItem = {
			type: "item",
			text,
			checkbox:
				checkbox === true ? "x" : checkbox === false ? " " : undefined,
		};
		return new ListBuilder([...this.items, i]);
	}

	list(lb: ListBuilder) {
		return new ListBuilder([...this.items, lb.done()]);
	}

	done(): ListBlock {
		return { type: "list", items: this.items };
	}
}

/**
 * Build up file contents and metadata entries simultaneously. Basically a reverse-parser
 * for metadata. Construct files line-by-line and metadata that *would* be parsed by
 * Obsidian is generated at the same time!
 */
export class FileBuilder {
	private lines: FileBlock[];

	constructor(lines: FileBlock[] = []) {
		this.lines = lines;
	}

	/**
	 * Add frontmatter to the file.
	 * @param frontmatter Dictionary representing YAML frontmatter.
	 * @returns an updated FileBuilder
	 */
	frontmatter(frontmatter: Record<string, string>): FileBuilder {
		const frontmatterLines = Object.entries(frontmatter).map(
			([k, v]): FileBlock => ({ type: "frontmatter", key: k, text: v })
		);
		return new FileBuilder([...this.lines, ...frontmatterLines]);
	}

	/**
	 * Add a heading to the file.
	 * @param level Heading level (h1, h2, etc.)
	 * @param text Text for heading
	 * @returns an updated FileBuilder.
	 */
	heading(level: number, text: string): FileBuilder {
		return new FileBuilder([
			...this.lines,
			{ type: "heading", level, text },
		]);
	}

	/**
	 * Add a plain text paragraph to the file.
	 * @param text Text body
	 * @returns an updated FileBuilder
	 */
	text(text: string): FileBuilder {
		return new FileBuilder([...this.lines, { type: "text", text }]);
	}

	/**
	 * Add a list to the file.
	 * @param list a ListBuilder
	 * @returns an updated FileBuilder
	 */
	list(list: ListBuilder): FileBuilder {
		return new FileBuilder([...this.lines, list.done()]);
	}

	done() {
		return makeFile(this.lines);
	}
}
