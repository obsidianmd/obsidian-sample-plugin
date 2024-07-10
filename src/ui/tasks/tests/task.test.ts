import { describe, expect, it } from "vitest";
import { isTaskString, Task } from "../task";
import { type ColumnTag, type ColumnTagTable } from "src/ui/columns/columns";
import { kebab } from "src/kebab";

describe("Task", () => {
	const columnTags: ColumnTagTable = {
		[kebab<ColumnTag>("column")]: "column",
	};

	it("parses a basic task string", () => {
		let task: Task | undefined;
		const taskString = "- [ ] Something #tag";
		if (isTaskString(taskString)) {
			task = new Task(taskString, { path: "/" }, 0, columnTags);
		}

		expect(task).toBeTruthy();
		expect(task?.content).toBe("Something #tag");
		expect(task?.tags.has("tag")).toBeTruthy();
	});

	it("parses a basic task string with a column", () => {
		let task: Task | undefined;
		const taskString = "- [ ] Something #tag #column";
		if (isTaskString(taskString)) {
			task = new Task(taskString, { path: "/" }, 0, columnTags);
		}

		expect(task).toBeTruthy();
		expect(task?.content).toBe("Something #tag");
		expect(task?.column).toBe("column");
	});

	it("serialises a basic task string with a column", () => {
		let task: Task | undefined;
		const taskString = "- [ ] Something #tag #column";
		if (isTaskString(taskString)) {
			task = new Task(taskString, { path: "/" }, 0, columnTags);
		}

		const output = task?.serialise();
		expect(taskString).toBe(output);
	});

	it("parses a task string with a block link", () => {
		let task: Task | undefined;
		const taskString = "- [ ] Something #tag #column ^link-link";
		if (isTaskString(taskString)) {
			task = new Task(taskString, { path: "/" }, 0, columnTags);
		}

		expect(task).toBeTruthy();
		expect(task?.content).toBe("Something #tag");
		expect(task?.blockLink).toBe("link-link");
	});

	it("serialises a basic task string with a block link", () => {
		let task: Task | undefined;
		const taskString = "- [ ] Something #tag ^link-link";
		if (isTaskString(taskString)) {
			task = new Task(taskString, { path: "/" }, 0, columnTags);
			task.column = "column" as ColumnTag;
		}

		const output = task?.serialise();
		expect("- [ ] Something #tag #column ^link-link").toBe(output);
	});
});
