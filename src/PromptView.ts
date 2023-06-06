import { ItemView, TAbstractFile, TFile, WorkspaceLeaf } from "obsidian";

export const LEARNING_TYPE = "LearningView";

export class PromptView extends ItemView {
  private params: any
  private file: TAbstractFile | null

  constructor(leaf: WorkspaceLeaf, params: any) {
    super(leaf);
    this.params = params
  }

  getViewType() {
    return LEARNING_TYPE;
  }

  getDisplayText() {
    return "Example view";
  }

  async onload() {

  }

  async onOpen() {
    const filteredTitles = this.params.titles.filter((str: string) => !str.includes("[Learning-Plugin]"));

    let fileName = filteredTitles[0];
    const lastPeriodIndex = fileName.lastIndexOf(".");
    if (lastPeriodIndex !== -1) {
      const beforePeriod = fileName.slice(0, lastPeriodIndex);

      fileName = `[Learning-Plugin]-${beforePeriod}${fileName.slice(lastPeriodIndex)}`;
    }

    const originalFile = this.app.vault.getAbstractFileByPath(filteredTitles[0])

    let content = await this.app.vault.read(originalFile as TFile)
    const formattedContent = content.replace(/[\r\n]+/g, '\n>')

    content = '>[!INFO]- ' + formattedContent
    content += '\n\n\n\n<form id="learning_level">\
      <input type="radio" id="learning-plugin-option0" name="radioOptions" value="0" onchange="()=>{console.log("clicked")}">\
      <label for="option0">0</label>\
      <br>\
      <input type="radio" id="learning-plugin-option0" name="radioOptions" value="1" onchange="handleRadioChange(this)">\
      <label for="option1">1</label>\
      <br>\
      <input type="radio" id="learning-plugin-option0" name="radioOptions" value="2" onchange="handleRadioChange(this)">\
      <label for="option2">2</label>\
      <br>\
      <input type="radio" id="learning-plugin-option0" name="radioOptions" value="3" onchange="handleRadioChange(this)">\
      <label for="option3">3</label>\
      <br>\
      <input type="radio" id="learning-plugin-option0" name="radioOptions" value="4" onchange="handleRadioChange(this)">\
      <label for="option4">4</label>\
      </form>'

    



    
    try { 
      this.file = await this.app.vault.create(fileName, content)
      await this.app.workspace.openLinkText(fileName, fileName, true, { state: { mode: 'preview' } })
    }
    catch(error) {
      await this.app.workspace.openLinkText(fileName, fileName, false, { state: { mode: 'preview' } })
    }
  }

  async onClose() {
    console.log("closed")
    this.app.workspace.detachLeavesOfType(LEARNING_TYPE);
  }
}