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

import { syntaxTree } from '@codemirror/language';
import { MarkdownEditView } from 'obsidian';
//    §\s\d+[a-z]?\s(I+\s)?(\d\s)?(Nr.\s\d\s)?\w+
const placeholderMatcher = new MatchDecorator({
    regexp: /\[\[(\w+)\]\]/g,
    decoration: match => Decoration.replace({

    })
  })

class LawRefPluginEditorProcessor implements PluginValue {
    decorations: DecorationSet;
    constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view);
    }
  
    update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
            this.decorations = this.buildDecorations(update.view);
        }
    }
  
    destroy() {
      // ...
    }

    buildDecorations(view: EditorView): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>();
    
        for (let { from, to } of view.visibleRanges) {
            syntaxTree(view.state).iterate({
                from,
                to,
                enter(node: any) {
                    if (node.type.name.startsWith('list')) {
                        // Position of the '-' or the '*'.
                        const listCharFrom = node.from - 2;
    
                        builder.add(
                            listCharFrom,
                            listCharFrom + 1,
                            Decoration.replace({
                                
                            })
                        );
                    }
                },
            });
        }
    
        return builder.finish();
    }
}
  
export const lawRefPluginEditorProcessor = ViewPlugin.fromClass(LawRefPluginEditorProcessor);










const addUnderline = StateEffect.define<{from: number, to: number}>({
    map: ({from, to}, change) => ({from: change.mapPos(from), to: change.mapPos(to)})
  })
  
  const underlineField = StateField.define<DecorationSet>({
    create() {
      return Decoration.none
    },
    update(underlines, tr) {
      underlines = underlines.map(tr.changes)
      for (let e of tr.effects) if (e.is(addUnderline)) {
        underlines = underlines.update({
          add: [underlineMark.range(e.value.from, e.value.to)]
        })
      }
      return underlines
    },
    provide: f => EditorView.decorations.from(f)
  })
  
  const underlineMark = Decoration.mark({class: "cm-underline"})
  const underlineTheme = EditorView.baseTheme({
    ".cm-underline": { textDecoration: "underline 3px red" }
  })
  
  export function underlineSelection(view: EditorView) { 
    let effects: StateEffect<unknown>[] = view.state.selection.ranges
      .filter(r => !r.empty)
      .map(({from, to}) => addUnderline.of({from, to}))
    if (!effects.length) return false
  
    if (!view.state.field(underlineField, false))
      effects.push(StateEffect.appendConfig.of([underlineField,
                                                underlineTheme]))
    view.dispatch({effects})
    return true
  }
  