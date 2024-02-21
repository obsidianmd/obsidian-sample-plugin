import sha256 from "crypto-js/sha256";
import type { Brand } from "src/brand";
import type { ColumnTag, ColumnTagTable } from "../columns/columns";

export class Task {
	constructor(
		rawContent: TaskString,
		fileHandle: { path: string },
		rowIndex: number,
		columnTagTable: ColumnTagTable
	) {
		const [, remainder = ""] = rawContent.split("- [");
		const [status, content = ""] = remainder.split("] ");

		this._tags = getTags(content);

		this._id = sha256(content + fileHandle.path + rowIndex).toString();
		this._content = content;
		this._done = status === "x";
		this._path = fileHandle.path;

		for (const tag of this._tags) {
			if (tag in columnTagTable || tag === "done") {
				if (!this._column) {
					this._column = tag as ColumnTag;
				}
				this._tags.delete(tag);
			}

			this._content = this._content.replaceAll(`#${tag}`, "").trim();
		}
		if (this._done) {
			this._column = undefined;
		}
	}

	private _id: string;
	get id() {
		return this._id;
	}
	private _content: string;
	get content() {
		return this._content;
	}

	private _done: boolean;
	get done() {
		return this._done;
	}

	private readonly _path: string;
	get path() {
		return this._path;
	}

	private _column: ColumnTag | undefined;
	get column() {
		return this._column;
	}

	private readonly _tags: Set<string>;

	serialisedAsDone(done: boolean): string {
		this._done = done;
		this._column = undefined;
		return this.serialise();
	}

	serialisedWithColumn(column: ColumnTag) {
		this._column = column;
		this._done = false;
		return this.serialise();
	}

	private serialise(): string {
		return [
			`- [${this.done ? "x" : " "}] `,
			this.content.trim(),
			this.column ? ` #${this.column}` : "",
			[...this._tags].map((tag) => ` #${tag}`).join(""),
		].join("");
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

function getTags(content: string): Set<string> {
	const tags = new Set<string>();

	// starts with "#", ends with " ", only contains alphanumerics or "-"
	const allMatches = content.matchAll(/#([\w-]+)/g);
	for (const match of [...allMatches]) {
		const maybeTag = match[1];
		if (maybeTag) {
			tags.add(maybeTag);
		}
	}

	return tags;
}
