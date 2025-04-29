import { ItemView, WorkspaceLeaf } from "obsidian";

export const VIEW_TYPE_EXAMPLE = "example-view";

export class ExampleView extends ItemView {
  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType() {
    return VIEW_TYPE_EXAMPLE;
  }

  getDisplayText() {
    return "Example view";
  }

  async onOpen() {
    console.log("Example view opened");
    const container = this.containerEl.children[1];
    container.empty();
    container.createEl("h2", { text: "Gesetzesauszüge" });
  }

  async onClose() {
    // Nothing to clean up.
  }
}