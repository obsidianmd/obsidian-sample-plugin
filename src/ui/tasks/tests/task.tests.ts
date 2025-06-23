import { describe, expect, it } from "vitest";
import { 
	isTaskString, 
	Task, 
	DEFAULT_DONE_STATUS_MARKERS, 
	validateDoneStatusMarkers, 
	createDoneStatusMarkers 
} from "../task";
import { type ColumnTag, type ColumnTagTable } from "src/ui/columns/columns";
import { kebab } from "src/parsing/kebab/kebab";

describe("Task", () => {
	const columnTags: ColumnTagTable = {
		[kebab<ColumnTag>("column")]: "column",
	};

	it("parses a basic task string", () => {
		let task: Task | undefined;
		const taskString = "- [ ] Something #tag";
		if (isTaskString(taskString)) {
			task = new Task(taskString, { path: "/" }, 0, columnTags, false, "xX");
		}

		expect(task).toBeTruthy();
		expect(task?.content).toBe("Something #tag");
		expect(task?.tags.has("tag")).toBeTruthy();
	});

	it("parses a basic task string with a column", () => {
		let task: Task | undefined;
		const taskString = "- [ ] Something #tag #column";
		if (isTaskString(taskString)) {
			task = new Task(taskString, { path: "/" }, 0, columnTags, false, "xX");
		}

		expect(task).toBeTruthy();
		expect(task?.content).toBe("Something #tag");
		expect(task?.column).toBe("column");
	});

	it("serialises a basic task string with a column", () => {
		let task: Task | undefined;
		const taskString = "- [ ] Something #tag #column";
		if (isTaskString(taskString)) {
			task = new Task(taskString, { path: "/" }, 0, columnTags, false, "xX");
		}

		const output = task?.serialise();
		expect(taskString).toBe(output);
	});

	it("serialises a basic task string with a column and consolidate tags", () => {
		let task: Task | undefined;
		const taskString = "- [ ] Something #tag #column";
		if (isTaskString(taskString)) {
			task = new Task(taskString, { path: "/" }, 0, columnTags, true, "xX");
		}

		const output = task?.serialise();
		expect(taskString).toBe(output);
	});

	it("parses a task string with a block link", () => {
		let task: Task | undefined;
		const taskString = "- [ ] Something #tag #column ^link-link";
		if (isTaskString(taskString)) {
			task = new Task(taskString, { path: "/" }, 0, columnTags, false, "xX");
		}

		expect(task).toBeTruthy();
		expect(task?.content).toBe("Something #tag");
		expect(task?.blockLink).toBe("link-link");
	});

	it("serialises a basic task string with a block link", () => {
		let task: Task | undefined;
		const taskString = "- [ ] Something #tag ^link-link";
		if (isTaskString(taskString)) {
			task = new Task(taskString, { path: "/" }, 0, columnTags, false, "xX");
			task.column = "column" as ColumnTag;
		}

		const output = task?.serialise();
		expect("- [ ] Something #tag #column ^link-link").toBe(output);
	});

	describe("indented tasks", () => {
		it("parses a task string with space indentation", () => {
			let task: Task | undefined;
			const taskString = "  - [ ] Indented with 2 spaces #tag";
			if (isTaskString(taskString)) {
				task = new Task(taskString, { path: "/" }, 0, columnTags, false, "xX");
			}

			expect(task).toBeTruthy();
			expect(task?.indentation).toBe("  ");
			expect(task?.content).toBe("Indented with 2 spaces #tag");
		});

		it("parses a task string with tab indentation", () => {
			let task: Task | undefined;
			const taskString = "\t- [ ] Indented with tab #tag";
			if (isTaskString(taskString)) {
				task = new Task(taskString, { path: "/" }, 0, columnTags, false, "xX");
			}

			expect(task).toBeTruthy();
			expect(task?.indentation).toBe("\t");
			expect(task?.content).toBe("Indented with tab #tag");
		});

		it("parses a task string with mixed space and tab indentation", () => {
			let task: Task | undefined;
			const taskString = " \t - [ ] Mixed spaces and tabs #tag";
			if (isTaskString(taskString)) {
				task = new Task(taskString, { path: "/" }, 0, columnTags, false, "xX");
			}

			expect(task).toBeTruthy();
			expect(task?.indentation).toBe(" \t ");
			expect(task?.content).toBe("Mixed spaces and tabs #tag");
		});

		it("parses a completed indented task string", () => {
			let task: Task | undefined;
			const taskString = "  - [x] Completed indented task #tag";
			if (isTaskString(taskString)) {
				task = new Task(taskString, { path: "/" }, 0, columnTags, false, "xX");
			}

			expect(task).toBeTruthy();
			expect(task?.indentation).toBe("  ");
			expect(task?.done).toBe(true);
			expect(task?.content).toBe("Completed indented task #tag");
		});

		it("parses an indented task string with a block link", () => {
			let task: Task | undefined;
			const taskString = "\t- [ ] Indented with block link #tag ^block123";
			if (isTaskString(taskString)) {
				task = new Task(taskString, { path: "/" }, 0, columnTags, false, "xX");
			}

			expect(task).toBeTruthy();
			expect(task?.indentation).toBe("\t");
			expect(task?.blockLink).toBe("block123");
			expect(task?.content).toBe("Indented with block link #tag");
		});

		it("serialises an indented task string with spaces", () => {
			let task: Task | undefined;
			const taskString = "    - [ ] Four spaces #tag #column";
			if (isTaskString(taskString)) {
				task = new Task(taskString, { path: "/" }, 0, columnTags, false, "xX");
			}

			const output = task?.serialise();
			expect(taskString).toBe(output);
		});

		it("serialises an indented task string with tabs", () => {
			let task: Task | undefined;
			const taskString = "\t\t- [ ] Two tabs #tag #column";
			if (isTaskString(taskString)) {
				task = new Task(taskString, { path: "/" }, 0, columnTags, false, "xX");
			}

			const output = task?.serialise();
			expect(taskString).toBe(output);
		});

		it("serialises an indented task string with mixed indentation", () => {
			let task: Task | undefined;
			const taskString = "\t  \t- [ ] Tab space tab #tag #column";
			if (isTaskString(taskString)) {
				task = new Task(taskString, { path: "/" }, 0, columnTags, false, "xX");
			}

			const output = task?.serialise();
			expect(taskString).toBe(output);
		});
	});

	describe("customizable done status markers", () => {
		it("recognizes custom done status markers", () => {
			let task: Task | undefined;
			const taskString = "- [✓] Custom done marker #tag";
			if (isTaskString(taskString)) {
				task = new Task(taskString, { path: "/" }, 0, columnTags, false, "xX✓");
			}

			expect(task).toBeTruthy();
			expect(task?.done).toBe(true);
			expect(task?.content).toBe("Custom done marker #tag");
		});

		it("does not recognize non-configured done status markers", () => {
			let task: Task | undefined;
			const taskString = "- [✓] Custom done marker #tag";
			if (isTaskString(taskString)) {
				task = new Task(taskString, { path: "/" }, 0, columnTags, false, DEFAULT_DONE_STATUS_MARKERS);
			}

			expect(task).toBeTruthy();
			expect(task?.done).toBe(false);
			expect(task?.content).toBe("Custom done marker #tag");
		});

		it("handles multi-codepoint unicode characters", () => {
			let task: Task | undefined;
			const taskString = "- [👍] Multi-codepoint emoji #tag";
			if (isTaskString(taskString)) {
				task = new Task(taskString, { path: "/" }, 0, columnTags, false, "xX👍");
			}

			expect(task).toBeTruthy();
			expect(task?.done).toBe(true);
			expect(task?.content).toBe("Multi-codepoint emoji #tag");
		});

		it("recognizes checkmark ✅ as done status", () => {
			let task: Task | undefined;
			const taskString = "- [✅] Task with checkmark #tag";
			if (isTaskString(taskString)) {
				task = new Task(taskString, { path: "/" }, 0, columnTags, false, "xX✅");
			}

			expect(task).toBeTruthy();
			expect(task?.done).toBe(true);
			expect(task?.content).toBe("Task with checkmark #tag");
		});

		describe("invalid status markers", () => {
			it("treats multi-character status as not done", () => {
				let task: Task | undefined;
				const taskString = "- [abc] Task with multi-char status #tag";
				if (isTaskString(taskString)) {
					task = new Task(taskString, { path: "/" }, 0, columnTags, false, "xX");
				}

				expect(task).toBeTruthy();
				expect(task?.done).toBe(false);
			});

			it("treats whitespace-only status as not done", () => {
				let task: Task | undefined;
				const taskString = "- [  ] Task with spaces #tag";
				if (isTaskString(taskString)) {
					task = new Task(taskString, { path: "/" }, 0, columnTags, false, "xX");
				}

				expect(task).toBeTruthy();
				expect(task?.done).toBe(false);
			});

			it("treats tab character as not done when not configured", () => {
				let task: Task | undefined;
				const taskString = "- [\t] Task with tab #tag";
				if (isTaskString(taskString)) {
					task = new Task(taskString, { path: "/" }, 0, columnTags, false, "xX");
				}

				expect(task).toBeTruthy();
				expect(task?.done).toBe(false);
			});

			it("treats unknown character as not done", () => {
				let task: Task | undefined;
				const taskString = "- [z] Task with unknown char #tag";
				if (isTaskString(taskString)) {
					task = new Task(taskString, { path: "/" }, 0, columnTags, false, "xX");
				}

				expect(task).toBeTruthy();
				expect(task?.done).toBe(false);
			});

			it("treats number as not done", () => {
				let task: Task | undefined;
				const taskString = "- [1] Task with number #tag";
				if (isTaskString(taskString)) {
					task = new Task(taskString, { path: "/" }, 0, columnTags, false, "xX");
				}

				expect(task).toBeTruthy();
				expect(task?.done).toBe(false);
			});
		});

		describe("case sensitivity", () => {
			it("respects case sensitivity in done markers", () => {
				let task: Task | undefined;
				const taskString = "- [X] Uppercase done marker #tag";
				if (isTaskString(taskString)) {
					task = new Task(taskString, { path: "/" }, 0, columnTags, false, "x");
				}

				expect(task).toBeTruthy();
				expect(task?.done).toBe(false);
			});

			it("handles lowercase done markers", () => {
				let task: Task | undefined;
				const taskString = "- [x] Lowercase done marker #tag";
				if (isTaskString(taskString)) {
					task = new Task(taskString, { path: "/" }, 0, columnTags, false, "x");
				}

				expect(task).toBeTruthy();
				expect(task?.done).toBe(true);
			});
		});

		describe("special characters", () => {
			it("handles regex special characters in done markers", () => {
				let task: Task | undefined;
				const taskString = "- [*] Asterisk done marker #tag";
				if (isTaskString(taskString)) {
					task = new Task(taskString, { path: "/" }, 0, columnTags, false, "xX*");
				}

				expect(task).toBeTruthy();
				expect(task?.done).toBe(true);
			});

			it("handles plus character as done marker", () => {
				let task: Task | undefined;
				const taskString = "- [+] Plus done marker #tag";
				if (isTaskString(taskString)) {
					task = new Task(taskString, { path: "/" }, 0, columnTags, false, "xX+");
				}

				expect(task).toBeTruthy();
				expect(task?.done).toBe(true);
			});

			it("handles question mark as done marker", () => {
				let task: Task | undefined;
				const taskString = "- [?] Question mark done marker #tag";
				if (isTaskString(taskString)) {
					task = new Task(taskString, { path: "/" }, 0, columnTags, false, "xX?");
				}

				expect(task).toBeTruthy();
				expect(task?.done).toBe(true);
			});

			it("handles dot character as done marker", () => {
				let task: Task | undefined;
				const taskString = "- [.] Dot done marker #tag";
				if (isTaskString(taskString)) {
					task = new Task(taskString, { path: "/" }, 0, columnTags, false, "xX.");
				}

				expect(task).toBeTruthy();
				expect(task?.done).toBe(true);
			});

			it("handles backslash character as done marker", () => {
				let task: Task | undefined;
				const taskString = "- [\\] Backslash done marker #tag";
				if (isTaskString(taskString)) {
					task = new Task(taskString, { path: "/" }, 0, columnTags, false, "xX\\");
				}

				expect(task).toBeTruthy();
				expect(task?.done).toBe(true);
			});
		});

		describe("unicode edge cases", () => {
			it("handles combining characters correctly", () => {
				let task: Task | undefined;
				const taskString = "- [é] Combining accent #tag";
				if (isTaskString(taskString)) {
					task = new Task(taskString, { path: "/" }, 0, columnTags, false, "xXé");
				}

				expect(task).toBeTruthy();
				expect(task?.done).toBe(true);
			});

			it("handles zero-width characters as invalid", () => {
				let task: Task | undefined;
				const taskString = "- [\u200B] Zero-width space #tag";
				if (isTaskString(taskString)) {
					task = new Task(taskString, { path: "/" }, 0, columnTags, false, "xX\u200B");
				}

				expect(task).toBeTruthy();
				expect(task?.done).toBe(true);
			});

			it("handles surrogate pairs correctly", () => {
				let task: Task | undefined;
				const taskString = "- [🚀] Rocket emoji #tag";
				if (isTaskString(taskString)) {
					task = new Task(taskString, { path: "/" }, 0, columnTags, false, "xX🚀");
				}

				expect(task).toBeTruthy();
				expect(task?.done).toBe(true);
			});
		});
	});
});

describe("Done Status Markers Validation", () => {
	describe("validateDoneStatusMarkers", () => {
		it("accepts valid marker strings", () => {
			expect(validateDoneStatusMarkers("xX")).toEqual([]);
			expect(validateDoneStatusMarkers("✓✅👍")).toEqual([]);
			expect(validateDoneStatusMarkers("x")).toEqual([]);
			expect(validateDoneStatusMarkers("*+?")).toEqual([]);
		});

		it("rejects empty strings", () => {
			expect(validateDoneStatusMarkers("")).toEqual([
				"Done status markers cannot be empty"
			]);
			expect(validateDoneStatusMarkers("   ")).not.toEqual([]);
		});

		it("rejects whitespace characters", () => {
			const errors = validateDoneStatusMarkers("x X");
			expect(errors).toContain("Marker at position 2 is whitespace");
		});

		it("rejects newline characters", () => {
			const errors = validateDoneStatusMarkers("x\nX");
			expect(errors).toContain("Marker at position 2 is whitespace");
		});

		it("rejects tab characters", () => {
			const errors = validateDoneStatusMarkers("x\tX");
			expect(errors).toContain("Marker at position 2 is whitespace");
		});

		it("rejects control characters", () => {
			const errors = validateDoneStatusMarkers("x\u0001X");
			expect(errors).toContain("Marker at position 2 is a control character");
		});

		it("rejects duplicate characters", () => {
			const errors = validateDoneStatusMarkers("xXx");
			expect(errors).toContain("Duplicate marker 'x' at position 3");
		});

		it("handles Unicode emoji correctly", () => {
			expect(validateDoneStatusMarkers("🚀👍✅")).toEqual([]);
		});

		it("handles accented characters correctly", () => {
			expect(validateDoneStatusMarkers("éñü")).toEqual([]);
		});

		it("accumulates multiple errors", () => {
			const errors = validateDoneStatusMarkers("x x\tx");
			// Should find: space, duplicate 'x', tab (whitespace), tab (control char), final duplicate 'x'
			expect(errors.length).toBe(5);
			expect(errors).toContain("Marker at position 2 is whitespace");
			expect(errors).toContain("Duplicate marker 'x' at position 3");
		});
	});

	describe("createDoneStatusMarkers", () => {
		it("creates valid markers successfully", () => {
			const markers = createDoneStatusMarkers("xX✓");
			expect(markers).toBe("xX✓");
		});

		it("throws for invalid markers", () => {
			expect(() => createDoneStatusMarkers("")).toThrow(
				"Invalid done status markers: Done status markers cannot be empty"
			);
		});

		it("throws with detailed error messages", () => {
			expect(() => createDoneStatusMarkers("x x")).toThrow(
				"Invalid done status markers: Marker at position 2 is whitespace"
			);
		});

		it("throws with multiple error messages", () => {
			expect(() => createDoneStatusMarkers("x xx")).toThrow(/Multiple|whitespace|Duplicate/);
		});
	});

	describe("DEFAULT_DONE_STATUS_MARKERS", () => {
		it("is valid according to validation rules", () => {
			expect(validateDoneStatusMarkers(DEFAULT_DONE_STATUS_MARKERS)).toEqual([]);
		});

		it("contains expected default characters", () => {
			expect(DEFAULT_DONE_STATUS_MARKERS).toBe("xX");
		});

		it("can be used to create validated markers", () => {
			expect(() => createDoneStatusMarkers(DEFAULT_DONE_STATUS_MARKERS)).not.toThrow();
		});
	});
});
