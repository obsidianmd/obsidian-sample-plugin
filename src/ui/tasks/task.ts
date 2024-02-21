import sha256 from "crypto-js/sha256";
import type { Brand } from "src/brand";
import type {
	ColumnTag,
	ColumnTagTable,
	DefaultColumns,
} from "../columns/columns";

export class Task {
	readonly id: string;
	readonly content: string;
	readonly done: boolean;
	readonly path: string;
	readonly rowIndex: number;
	readonly column:
		| ColumnTag
		| Exclude<DefaultColumns, "uncategorised">
		| undefined;

	constructor(
		rawContent: TaskString,
		fileHandle: { path: string },
		rowIndex: number,
		columnTagTable: ColumnTagTable
	) {
		const task = this._deserialise(rawContent, fileHandle, rowIndex);
		this.id = task.id;
		this.content = task.content;
		this.done = task.done;
		this.path = fileHandle.path;
		this.rowIndex = rowIndex;

		let column: ColumnTag | undefined;
		for (const tag of task.tags) {
			if (tag in columnTagTable || tag === "done") {
				column = tag as ColumnTag;
				break;
			}
		}

		this.column = column;
	}

	private _deserialise(
		rawContent: TaskString,
		fileHandle: { path: string },
		rowIndex: number
	): {
		id: string;
		content: string;
		done: boolean;
		tags: string[];
	} {
		const [, remainder = ""] = rawContent.split("- [");
		const [status, content = ""] = remainder.split("] ");

		const { tags, cleanedContent } = getTags(content);

		return {
			id: sha256(content + fileHandle.path + rowIndex).toString(),
			done: status === "x",
			content: cleanedContent,
			tags,
		};
	}

	serialise(
		data: Partial<{
			column: ColumnTag | Exclude<DefaultColumns, "uncategorised">;
		}>
	): string {
		const done = data.column === "done" || this.done;
		const column:
			| ColumnTag
			| Exclude<DefaultColumns, "uncategorised">
			| undefined = data.column ?? this.column;

		return `- [${done ? "x" : " "}] ${this.content}${
			column ? ` #${column}` : ""
		}`;
	}
}

type TaskString = Brand<string, "TaskString">;

export function isTaskString(input: string): input is TaskString {
	return taskStringRegex.test(input);
}

// begins with 0 or more whitespace chars
// then follows the pattern "- [ ]" OR "- [x]"
// then contains an additional whitespace before any trailing content
const taskStringRegex = /^\s*-\s\[[x\s]\]\s/;

function getTags(content: string): { tags: string[]; cleanedContent: string } {
	const tags = new Set<string>();
	let cleanedContent = content;

	// starts with "#", ends with " ", only contains alphanumerics or "-"
	const allMatches = content.matchAll(/#([\w-]+)/g);
	for (const match of [...allMatches]) {
		const maybeTag = match[1];
		if (maybeTag) {
			tags.add(maybeTag);

			cleanedContent = cleanedContent.replaceAll(`#${maybeTag}`, "");
		}
	}

	return { tags: [...tags], cleanedContent: cleanedContent.trim() };
}
