import sha256 from "crypto-js/sha256";
import type { Brand } from "src/brand";
import type { ColumnTag, ColumnTagTable } from "../columns/columns";
import { get } from "svelte/store";
import { userStore } from "../users/users";

export class Task {
	constructor(
		rawContent: TaskString,
		fileHandle: { path: string },
		readonly rowIndex: number,
		columnTagTable: ColumnTagTable
	) {
		const [, remainder = ""] = rawContent.split("- [");
		const [status, content = ""] = remainder.split("] ");

		this._tags = getTags(content);

		this._id = sha256(content + fileHandle.path + rowIndex).toString();
		this.content = content;
		this._done = status === "x";
		this._path = fileHandle.path;

		const users = get(userStore);

		for (const tag of this._tags) {
			if (tag in columnTagTable || tag === "done") {
				if (!this._column) {
					this._column = tag as ColumnTag;
				}
				this._tags.delete(tag);
			}

			if (tag in users) {
				if (!this._owner) {
					this._owner = tag;
				}
				this._tags.delete(tag);
			}

			this.content = this.content.replaceAll(`#${tag}`, "").trim();
		}
		if (this._done) {
			this._column = undefined;
		}
	}

	private _id: string;
	get id() {
		return this._id;
	}
	content: string;

	private _done: boolean;
	get done(): boolean {
		return this._done;
	}
	set done(done: true) {
		this._done = done;
		this._column = undefined;
	}

	private readonly _path: string;
	get path() {
		return this._path;
	}

	private _column: ColumnTag | "archived" | undefined;
	get column(): ColumnTag | "archived" | undefined {
		return this._column;
	}
	set column(column: ColumnTag) {
		this._column = column;
		this._done = false;
	}

	private readonly _tags: Set<string>;

	private _owner: string | undefined;
	get owner(): string | undefined {
		return this._owner;
	}
	set owner(column: string) {
		this._owner = column;
	}

	serialise(): string {
		return [
			`- [${this.done ? "x" : " "}] `,
			this.content.trim(),
			this.column ? ` #${this.column}` : "",
			this.owner ? ` #${this.owner}` : "",
			[...this._tags].map((tag) => ` #${tag}`).join(""),
		].join("");
	}

	archive() {
		this._done = true;
		this._column = "archived";
	}
}

type TaskString = Brand<string, "TaskString">;

export function isTaskString(input: string): input is TaskString {
	if (input.includes("#archived")) {
		return false;
	}
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
