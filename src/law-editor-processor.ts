import {
    Decoration,
    DecorationSet,
    EditorView,
    PluginSpec,
    PluginValue,
    ViewPlugin,
    ViewUpdate,
    WidgetType,
  } from '@codemirror/view';

import {
/** EditorState, 
    StateField **/
    RangeSetBuilder
} from '@codemirror/state'; 

import { syntaxTree } from '@codemirror/language';

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
                                widget: new EmojiWidget(),
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

