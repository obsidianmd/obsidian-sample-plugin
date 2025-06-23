import sha256 from "crypto-js/sha256";
import type { Brand } from "src/brand";
import type { ColumnTag, ColumnTagTable } from "../columns/columns";
import { getTagsFromContent } from "src/parsing/tags/tags";

/**
 * A string containing characters that mark tasks as completed.
 * Each character represents a valid checkbox status that indicates completion.
 */
export type DoneStatusMarkers = Brand<string, "DoneStatusMarkers">;

/**
 * Default characters that mark a task as done in checkbox notation.
 * 
 * - 'x': Standard lowercase completion marker (e.g., `- [x] Task`)
 * - 'X': Standard uppercase completion marker (e.g., `- [X] Task`)
 * 
 * These characters are recognized as "done" status when parsing task checkboxes.
 * Users can customize this via settings to include additional Unicode characters
 * like emoji (✓, ✅, 👍) or other symbols.
 * 
 * @example
 * ```typescript
 * // These would all be considered "done" with default markers:
 * "- [x] Completed task"
 * "- [X] Another completed task"
 * 
 * // These would NOT be considered done:
 * "- [ ] Incomplete task"
 * "- [?] Unknown status"
 * ```
 */
export const DEFAULT_DONE_STATUS_MARKERS: DoneStatusMarkers = "xX" as DoneStatusMarkers;

/**
 * Validates that a done status markers string contains only valid characters.
 * 
 * Valid markers must:
 * - Be single Unicode code points (properly handles emoji and accented characters)
 * - Not contain whitespace, newlines, or control characters
 * - Not be empty
 * 
 * @param markers - The string to validate
 * @returns Array of validation errors, empty if valid
 * 
 * @example
 * ```typescript
 * validateDoneStatusMarkers("xX✓") // []
 * validateDoneStatusMarkers("x X") // ["Marker at position 2 is whitespace"]
 * validateDoneStatusMarkers("") // ["Done status markers cannot be empty"]
 * ```
 */
export function validateDoneStatusMarkers(markers: string): string[] {
	const errors: string[] = [];
	
	if (!markers || markers.length === 0) {
		errors.push("Done status markers cannot be empty");
		return errors;
	}
	
	const chars = Array.from(markers);
	const seen = new Set<string>();
	
	for (let i = 0; i < chars.length; i++) {
		const char = chars[i];
		if (!char) continue;
		
		// Check for duplicates
		if (seen.has(char)) {
			errors.push(`Duplicate marker '${char}' at position ${i + 1}`);
			continue;
		}
		seen.add(char);
		
		// Check for whitespace
		if (/\s/.test(char)) {
			errors.push(`Marker at position ${i + 1} is whitespace`);
		}
		
		// Check for control characters
		if (char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127) {
			errors.push(`Marker at position ${i + 1} is a control character`);
		}
	}
	
	return errors;
}

/**
 * Creates a validated DoneStatusMarkers type from a string.
 * 
 * @param markers - The string to convert
 * @returns Validated DoneStatusMarkers or throws if invalid
 * @throws Error if validation fails
 */
export function createDoneStatusMarkers(markers: string): DoneStatusMarkers {
	const errors = validateDoneStatusMarkers(markers);
	if (errors.length > 0) {
		throw new Error(`Invalid done status markers: ${errors.join(', ')}`);
	}
	return markers as DoneStatusMarkers;
}

/**
 * Checks if a checkbox status is marked as done based on the configured markers.
 * Properly handles multi-codepoint Unicode characters using Array.from.
 */
function isDoneStatus(statusContent: string | undefined, doneStatusMarkers: string): boolean {
	if (!statusContent || !doneStatusMarkers) return false;
	
	// Convert to arrays of Unicode code points to handle multi-codepoint chars
	const contentChars = Array.from(statusContent);
	const markersChars = Array.from(doneStatusMarkers);
	
	// Valid checkbox content must be exactly one code point
	// Note: This will work correctly for most emoji and Unicode characters
	// though it may not handle complex grapheme clusters perfectly
	if (contentChars.length !== 1) {
		return false;
	}

	const singleChar = contentChars[0];
	if (!singleChar) return false;
	
	// Check if the checkbox content matches any of the done status markers
	return markersChars.includes(singleChar);
}

export class Task {
	constructor(
		rawContent: TaskString,
		fileHandle: { path: string },
		readonly rowIndex: number,
		columnTagTable: ColumnTagTable,
		private readonly consolidateTags: boolean,
		private readonly doneStatusMarkers: string = DEFAULT_DONE_STATUS_MARKERS
	) {
		const [, blockLink] = rawContent.match(blockLinkRegexp) ?? [];
		this.blockLink = blockLink;

		const match = (
			blockLink ? rawContent.replace(blockLinkRegexp, "") : rawContent
		).match(taskStringRegex);

		if (!match) {
			throw new Error(
				"Attempted to create a task from invalid raw content"
			);
		}

		const [, indentation, status, content] = match;
		if (!content) {
			throw new Error("Content not found in raw content");
		}

		const tags = getTagsFromContent(content);

		this._id = sha256(content + fileHandle.path + rowIndex).toString();
		this.content = content;
		this._done = isDoneStatus(status || " ", this.doneStatusMarkers);
		this._path = fileHandle.path;
		this._indentation = indentation || "";

		for (const tag of tags) {
			if (tag in columnTagTable || tag === "done") {
				if (!this._column) {
					this._column = tag as ColumnTag;
				}
				tags.delete(tag);
				if (!consolidateTags) {
					this.content = this.content
						.replaceAll(`#${tag}`, "")
						.trim();
				}
			}
			if (consolidateTags) {
				this.content = this.content.replaceAll(`#${tag}`, "").trim();
			}
		}

		this.tags = tags;
		this.blockLink = blockLink;

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

	private _deleted: boolean = false;

	private readonly _path: string;
	get path() {
		return this._path;
	}

	private readonly _indentation: string;
	get indentation() {
		return this._indentation;
	}

	private _column: ColumnTag | "archived" | undefined;
	get column(): ColumnTag | "archived" | undefined {
		return this._column;
	}
	set column(column: ColumnTag) {
		this._column = column;
		this._done = false;
	}

	readonly blockLink: string | undefined;
	readonly tags: ReadonlySet<string>;

	serialise(): string {
		if (this._deleted) {
			return "";
		}

		return [
			this.indentation,
			`- [${this.done ? "x" : " "}] `,
			this.content.trim(),
			this.consolidateTags && this.tags.size > 0
				? ` ${Array.from(this.tags)
						.map((tag) => `#${tag}`)
						.join(" ")}`
				: "",
			this.column ? ` #${this.column}` : "",
			this.blockLink ? ` ^${this.blockLink}` : "",
		]
			.join("")
			.trimEnd();
	}

	archive() {
		this._done = true;
		this._column = "archived";
	}

	delete() {
		this._deleted = true;
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
// then follows the pattern "- [any_content]"
// then contains an additional whitespace before any trailing content
const taskStringRegex = /^(\s*)-\s\[(.+?)\]\s(.+)/;
const blockLinkRegexp = /\s\^([a-zA-Z0-9-]+)$/;
