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

  parseLawRefList(LawRefList: string[]) {
      const suggestionContainer = this.containerEl.children[1].getElementsByClassName("lawRef-suggestion-container")[0];
      suggestionContainer.empty();
      LawRefList.forEach((lawRef) => {
          const lawRefElement = suggestionContainer.createDiv({ cls: "lawRef-suggestion" });

          lawRefElement.createDiv({ cls: "lawRef-suggestion-element"}).createEl("h2", { text: lawRef });
      });


    };

  async onOpen() {
    console.log("Example view opened");
    const container = this.containerEl.children[1];
    container.empty();
    container.createEl("h1", { text: "Gesetzesauszüge" });
    container.createDiv({ cls: "lawRef-suggestion-container" });
  }

  async onClose() {
    // Nothing to clean up.
  }
}