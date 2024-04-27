/**
 * Outline to task list plugin.
 *
 * A simple Obsidian plugin to convert a note's outline to a task list.
 */
import {
  Plugin,
  type Editor,
  type MarkdownView,
  type TFile,
  type TFolder,
} from "obsidian";
import { Heading } from "src/heading";

interface OutlineTaskListPluginSettings {
  maxNoteCreationReties: number;
}

type EditorCallbackFunction<T> = (editor: Editor, view: MarkdownView) => T;

type PluginEditorCallbackFunction<T> = ({
  editor,
  file,
  taskList,
}: {
  editor: Editor;
  file: TFile;
  taskList: string;
}) => T;

type Outline = Heading[];

const DEFAULT_SETTINGS: OutlineTaskListPluginSettings = {
  maxNoteCreationReties: 200,
};

export default class OutlineTaskListPlugin extends Plugin {
  /**
   * Plugin settings.
   */
  settings: OutlineTaskListPluginSettings;

  /**
   * Parse the headings of the specified markdown content.
   */
  static parseOutline(makdownContent: string): Outline {
    const lines = makdownContent
      .split(/\r?\n/)
      .filter((line) => line !== null && line.startsWith("#"));
    const outline: Outline = [];

    for (const line of lines) {
      const hLevel = (line.match(/^#+/) as RegExpMatchArray)[0].length;
      const prevHeading = outline.at(-1);
      let parent = null;

      if (prevHeading !== undefined) {
        const sign = Math.sign(hLevel - prevHeading.hLevel);
        parent =
          sign === -1
            ? (parent = prevHeading.getParent(hLevel) || null)
            : sign === 0
              ? prevHeading.parent
              : prevHeading; // sign === 1
      }
      const treeLevel = parent ? parent.treeLevel + 1 : 0;
      outline.push(
        new Heading(line.replace(/^#+\s*/, ""), hLevel, treeLevel, parent),
      );
    }
    return outline;
  }

  /**
   * Build the task list from the specified outline.
   */
  static buildTasklist(outline: Outline): string {
    return outline.map((heading) => heading.toMarkdown()).join("\r\n");
  }

  /**
   * Create an Obsidian note to store the resulting task list.
   */
  async createNote(
    originalName: string,
    folder: TFolder | null,
    makdownContent: string,
  ): Promise<TFile | undefined> {
    const dirPath = folder === null ? "" : folder.path + "/";
    for (let index = 1; index < this.settings.maxNoteCreationReties; index++) {
      try {
        return await this.app.vault.create(
          dirPath +
            `${originalName} (task list${index === 1 ? "" : " " + index}).md`,
          makdownContent,
        );
      } catch (e) {
        // File already exists.
        continue;
      }
    }
  }

  /**
   * Custom editor callback.
   */
  pluginEditorCallback<T>(
    callback: PluginEditorCallbackFunction<T>,
  ): EditorCallbackFunction<T | undefined> {
    return (editor: Editor, view: MarkdownView) => {
      const file = view.file;
      if (file === null) {
        throw Error();
      }
      const outline = OutlineTaskListPlugin.parseOutline(editor.getValue());
      const taskList = OutlineTaskListPlugin.buildTasklist(outline);
      return callback({ editor, file, taskList });
    };
  }

  async onload() {
    await this.loadSettings();
    // Insert task list in editor.
    this.addCommand({
      id: "outline-task-list-insert",
      name: "Convert outline to a task list here.",
      editorCallback: this.pluginEditorCallback(({ editor, taskList }) => {
        editor.replaceRange(taskList, editor.getCursor());
      }),
    });
    // Insert task list a a new note.
    this.addCommand({
      id: "outline-task-list-new-note",
      name: "Convert outline to a task list in a new note.",
      editorCallback: this.pluginEditorCallback(async ({ file, taskList }) => {
        await this.createNote(file.basename, file.parent, taskList);
      }),
    });
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
}
