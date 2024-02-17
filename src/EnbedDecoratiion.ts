import {debounce, editorLivePreviewField, requestUrl} from "obsidian";
import {EditorView, Decoration, DecorationSet, ViewUpdate, ViewPlugin, WidgetType} from "@codemirror/view";
import {StateField, StateEffect, StateEffectType} from "@codemirror/state";
import {Range} from "@codemirror/rangeset";
import {syntaxTree, tokenClassNodeProp} from "@codemirror/language";
import MyPlugin from "./main";

//based on: https://gist.github.com/nothingislost/faa89aa723254883d37f45fd16162337

interface TokenSpec {
    from: number;
    to: number;
    value: string;
}

const statefulDecorations = defineStatefulDecoration();

class StatefulDecorationSet {
    editor: EditorView;
    decoCache: { [cls: string]: Decoration } = Object.create(null);
    plugin: MyPlugin;

    constructor(editor: EditorView, plugin: MyPlugin) {
        this.editor = editor;
        this.plugin = plugin;
    }

    async computeAsyncDecorations(tokens: TokenSpec[]): Promise<DecorationSet | null> {
        const isSourceMode = !this.editor.state.field(editorLivePreviewField);
        if (isSourceMode) {
            return Decoration.none;
        } else {
            const decorations: Range<Decoration>[] = [];
            for (const token of tokens) {
                let deco = this.decoCache[token.value];
                if (!deco) {
                    const div = createDiv();
                    // 클래스 추가
                    div.addClass("cm-embed-block");
                    div.addClass("cm-embed-link");
                    // 넣을 EL 받아오기
                    const params = await linkThumbnailWidgetParams(token.value);
                    if (params != null) {
                        div.innerHTML = params;
                    } else {
                        return Decoration.none;
                    }
                    deco = this.decoCache[token.value] = Decoration.replace({widget: new EmojiWidget(div), block: true});
                }
                decorations.push(deco.range(token.from, token.to));
            }
            return Decoration.set(decorations, true);
        }
    }

    debouncedUpdate = debounce(this.updateAsyncDecorations, 100, true);

    async updateAsyncDecorations(tokens: TokenSpec[]): Promise<void> {
        const decorations = await this.computeAsyncDecorations(tokens);
        // if our compute function returned nothing and the state field still has decorations, clear them out
        if (decorations || this.editor.state.field(statefulDecorations.field).size) {
            this.editor.dispatch({effects: statefulDecorations.update.of(decorations || Decoration.none)});
        }
    }
}

function buildViewPlugin(plugin: MyPlugin) {
    return ViewPlugin.fromClass(
        class {
            decoManager: StatefulDecorationSet;

            constructor(view: EditorView) {
                this.decoManager = new StatefulDecorationSet(view, plugin);
                this.buildAsyncDecorations(view);
            }

            update(update: ViewUpdate) {
                if (update.docChanged || update.viewportChanged) {
                    this.buildAsyncDecorations(update.view);
                }
            }

            buildAsyncDecorations(view: EditorView) {
                const targetElements: TokenSpec[] = [];
                try {
                    const tree = syntaxTree(view.state);
                    tree.iterate({
                        enter: ({node, from, to}) => {
                            const tokenProps = node.type.prop<string>(tokenClassNodeProp);
                            if (tokenProps && node.name === "url") {
                                const value = view.state.doc.sliceString(from, to);
                                if (value) {
                                    targetElements.push({from: from, to: to, value: value});
                                }
                            }
                        },
                    });
                } catch (error) {
                    console.error("Custom CM6 view plugin failure", error);
                    throw error;
                }
                this.decoManager.debouncedUpdate(targetElements);
            }
        }
    );
}

export function asyncDecoBuilderExt(plugin: MyPlugin) {
    return [statefulDecorations.field, buildViewPlugin(plugin)];
}

////////////////
// Utility Code
////////////////

// Generic helper for creating pairs of editor state fields and
// effects to model imperatively updated decorations.
// source: https://github.com/ChromeDevTools/devtools-frontend/blob/8f098d33cda3dd94b53e9506cd3883d0dccc339e/front_end/panels/sources/DebuggerPlugin.ts#L1722
function defineStatefulDecoration(): {
    update: StateEffectType<DecorationSet>;
    field: StateField<DecorationSet>;
} {
    const update = StateEffect.define<DecorationSet>();
    const field = StateField.define<DecorationSet>({
        create(): DecorationSet {
            return Decoration.none;
        },
        update(deco, tr): DecorationSet {
            return tr.effects.reduce((deco, effect) => (effect.is(update) ? effect.value : deco), deco.map(tr.changes));
        },
        provide: field => EditorView.decorations.from(field),
    });
    return {update, field};
}

class EmojiWidget extends WidgetType {
    private readonly source: HTMLDivElement;

    constructor(source: HTMLDivElement) {
        super();
        this.source = source;
    }

    eq(other: EmojiWidget) {
        return other == this;
    }

    toDOM() {
        return this.source;
    }

    ignoreEvent(): boolean {
        return false;
    }
}

export async function linkThumbnailWidgetParams(url: string) {
    try {
        // url 정규식
        const urlRegex = new RegExp("^(http:\\/\\/www\\.|https:\\/\\/www\\.|http:\\/\\/|https:\\/\\/)?[a-z0-9]+([\\-.]{1}[a-z0-9]+)*\\.[a-z]{2,5}(:[0-9]{1,5})?(\\/.*)?$");
        const urlT = urlRegex.exec(url);
        if (urlT?.length != 0 && urlT != null) {
            const domainUrl = url.replace(urlT[4], "");

            const response = await requestUrl(url);
            const responseDomain = await requestUrl(domainUrl);

            if (response.status === 200) {
                const htmlString = response.text;
                const parser = new DOMParser();
                const document = parser.parseFromString(htmlString, 'text/html');

                const htmlDomainString = responseDomain.text;
                const domainDocument = parser.parseFromString(htmlDomainString, 'text/html');
        
                const ogTitle = document.querySelector("meta[property='og:title']")?.getAttribute("content") || document.querySelector("title")?.textContent || domainDocument.querySelector("meta[property='og:title']")?.getAttribute("content") || domainDocument.querySelector("title")?.textContent || "";
                const ogDescription = document.querySelector("meta[property='og:description']")?.getAttribute("content") || domainDocument.querySelector("meta[property='og:description']")?.getAttribute("content") || "";
                const ogImage = document.querySelector("meta[property='og:image']")?.getAttribute("content") || domainDocument.querySelector("meta[property='og:image']")?.getAttribute("content") || "";
                const ogImageAlt = document.querySelector("meta[property='og:image:alt']")?.getAttribute("content") || domainDocument.querySelector("meta[property='og:image']")?.getAttribute("content") || "";
                const ogUrl = document.querySelector("meta[property='og:url']")?.getAttribute("content") || domainUrl;

                let result = "";
                if (ogImage === "") {
                    result = `
                    <a href="${url}">
                         <div class="openGraphPreview">     
                             <div class="se-oglink-info-container">
                                 <strong class="se-oglink-info">${ogTitle}</strong>
                                 <description class="se-oglink-summary">${ogDescription}</description>
                                 <p class="se-oglink-url"> ${ogUrl}</p>
                             </div>
                         </div>
                    </a>
                    `
                } else {
                    result = `
                    <a href="${url}">
                         <div class="openGraphPreview">
                            <div class="se-oglink-thumbnail">
                                <img src="${ogImage}" alt="${ogImageAlt}" class="se-oglink-thumbnail-resource"></img>
                            </div>     
                             <div class="se-oglink-info-container">
                                 <strong class="se-oglink-info">${ogTitle}</strong>
                                 <description class="se-oglink-summary">${ogDescription}</description>
                                 <p class="se-oglink-url"> ${ogUrl}</p>
                             </div>
                         </div>
                    </a>
                    `
                }
                return result;
            }
        }
        return null
    } catch (error) {
        // console.error(error);
        return null;
    }
}