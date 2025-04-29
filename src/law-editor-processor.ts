import {
    Decoration,
    DecorationSet,
    EditorView,
    PluginSpec,
    PluginValue,
    ViewPlugin,
    ViewUpdate,
    WidgetType,
    MatchDecorator
  } from '@codemirror/view';

import {
    EditorState, 
    StateField,
    RangeSetBuilder,
    StateEffect
} from '@codemirror/state'; 

const LawRefMatcher = new MatchDecorator({
  regexp: /\(\((\w+)\)\)/g,
  decoration: match => Decoration.mark({
    class: "lr-underline"
  })
})

const underlineTheme = EditorView.baseTheme({
  ".lr-underline": { textDecoration: "underline 3px red"}
})





class LawRefPluginEditorProcessor implements PluginValue {
    decorations: DecorationSet;
    constructor(view: EditorView) {
        this.decorations = LawRefMatcher.createDeco(view);
        //console.log("halloooo")
    }
  
    update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
            this.decorations = LawRefMatcher.updateDeco(update, this.decorations);
            //console.log("elllooooo")
        }
    }
  
    destroy() {
      
    }

} 
  
export const lawRefPluginEditorProcessor = ViewPlugin.fromClass(LawRefPluginEditorProcessor);










