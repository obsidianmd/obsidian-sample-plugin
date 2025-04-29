import { ItemView, WorkspaceLeaf } from "obsidian";

export const VIEW_TYPE_LAWREF = "lawref-view";

export class LawRefView extends ItemView {
  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType() {
    return VIEW_TYPE_LAWREF;
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