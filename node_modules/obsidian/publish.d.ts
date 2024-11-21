
declare global {
    interface ObjectConstructor {
        isEmpty(object: Record<string, any>): boolean;
        each<T>(object: {
            [key: string]: T;
        }, callback: (value: T, key?: string) => boolean | void, context?: any): boolean;
    }
    interface ArrayConstructor {
        combine<T>(arrays: T[][]): T[];
    }
    interface Array<T> {
        first(): T | undefined;
        last(): T | undefined;
        contains(target: T): boolean;
        remove(target: T): void;
        shuffle(): this;
        unique(): T[];
    }
    interface Math {
        clamp(value: number, min: number, max: number): number;
        square(value: number): number;
    }
    interface StringConstructor {
        isString(obj: any): obj is string;
    }
    interface String {
        contains(target: string): boolean;
        startsWith(searchString: string, position?: number): boolean;
        endsWith(target: string, length?: number): boolean;
        format(...args: string[]): string;
    }
    interface NumberConstructor {
        isNumber(obj: any): obj is number;
    }
    interface Node {
        detach(): void;
        empty(): void;
        insertAfter<T extends Node>(node: T, child: Node | null): T;
        indexOf(other: Node): number;
        setChildrenInPlace(children: Node[]): void;
        appendText(val: string): void;
        /**
         * Cross-window capable instanceof check, a drop-in replacement
         * for instanceof checks on DOM Nodes. Remember to also check
         * for nulls when necessary.
         * @param type
         */
        instanceOf<T>(type: {
            new (): T;
        }): this is T;
        /**
         * The document this node belongs to, or the global document.
         */
        doc: Document;
        /**
         * The window object this node belongs to, or the global window.
         */
        win: Window;
        constructorWin: Window;
    }
    interface Element extends Node {
        getText(): string;
        setText(val: string | DocumentFragment): void;
        addClass(...classes: string[]): void;
        addClasses(classes: string[]): void;
        removeClass(...classes: string[]): void;
        removeClasses(classes: string[]): void;
        toggleClass(classes: string | string[], value: boolean): void;
        hasClass(cls: string): boolean;
        setAttr(qualifiedName: string, value: string | number | boolean | null): void;
        setAttrs(obj: {
            [key: string]: string | number | boolean | null;
        }): void;
        getAttr(qualifiedName: string): string | null;
        matchParent(selector: string, lastParent?: Element): Element | null;
        getCssPropertyValue(property: string, pseudoElement?: string): string;
        isActiveElement(): boolean;
    }
    interface HTMLElement extends Element {
        show(): void;
        hide(): void;
        toggle(show: boolean): void;
        toggleVisibility(visible: boolean): void;
        /**
         * Returns whether this element is shown, when the element is attached to the DOM and
         * none of the parent and ancestor elements are hidden with `display: none`.
         *
         * Exception: Does not work on <body> and <html>, or on elements with `position: fixed`.
         */
        isShown(): boolean;
        setCssStyles(styles: Partial<CSSStyleDeclaration>): void;
        setCssProps(props: Record<string, string>): void;
        /**
         * Get the inner width of this element without padding.
         */
        readonly innerWidth: number;
        /**
         * Get the inner height of this element without padding.
         */
        readonly innerHeight: number;
    }
    interface SVGElement extends Element {
        setCssStyles(styles: Partial<CSSStyleDeclaration>): void;
        setCssProps(props: Record<string, string>): void;
    }
    function isBoolean(obj: any): obj is boolean;
    function fish(selector: string): HTMLElement | null;
    function fishAll(selector: string): HTMLElement[];
    interface Element extends Node {
        find(selector: string): Element | null;
        findAll(selector: string): HTMLElement[];
        findAllSelf(selector: string): HTMLElement[];
    }
    interface HTMLElement extends Element {
        find(selector: string): HTMLElement;
        findAll(selector: string): HTMLElement[];
        findAllSelf(selector: string): HTMLElement[];
    }
    interface DocumentFragment extends Node, NonElementParentNode, ParentNode {
        find(selector: string): HTMLElement;
        findAll(selector: string): HTMLElement[];
    }
    interface DomElementInfo {
        /**
         * The class to be assigned. Can be a space-separated string or an array of strings.
         */
        cls?: string | string[];
        /**
         * The textContent to be assigned.
         */
        text?: string | DocumentFragment;
        /**
         * HTML attributes to be added.
         */
        attr?: {
            [key: string]: string | number | boolean | null;
        };
        /**
         * HTML title (for hover tooltip).
         */
        title?: string;
        /**
         * The parent element to be assigned to.
         */
        parent?: Node;
        value?: string;
        type?: string;
        prepend?: boolean;
        placeholder?: string;
        href?: string;
    }
    interface SvgElementInfo {
        /**
         * The class to be assigned. Can be a space-separated string or an array of strings.
         */
        cls?: string | string[];
        /**
         * HTML attributes to be added.
         */
        attr?: {
            [key: string]: string | number | boolean | null;
        };
        /**
         * The parent element to be assigned to.
         */
        parent?: Node;
        prepend?: boolean;
    }
    interface Node {
        /**
         * Create an element and append it to this node.
         */
        createEl<K extends keyof HTMLElementTagNameMap>(tag: K, o?: DomElementInfo | string, callback?: (el: HTMLElementTagNameMap[K]) => void): HTMLElementTagNameMap[K];
        createDiv(o?: DomElementInfo | string, callback?: (el: HTMLDivElement) => void): HTMLDivElement;
        createSpan(o?: DomElementInfo | string, callback?: (el: HTMLSpanElement) => void): HTMLSpanElement;
        createSvg<K extends keyof SVGElementTagNameMap>(tag: K, o?: SvgElementInfo | string, callback?: (el: SVGElementTagNameMap[K]) => void): SVGElementTagNameMap[K];
    }
    function createEl<K extends keyof HTMLElementTagNameMap>(tag: K, o?: DomElementInfo | string, callback?: (el: HTMLElementTagNameMap[K]) => void): HTMLElementTagNameMap[K];
    function createDiv(o?: DomElementInfo | string, callback?: (el: HTMLDivElement) => void): HTMLDivElement;
    function createSpan(o?: DomElementInfo | string, callback?: (el: HTMLSpanElement) => void): HTMLSpanElement;
    function createSvg<K extends keyof SVGElementTagNameMap>(tag: K, o?: SvgElementInfo | string, callback?: (el: SVGElementTagNameMap[K]) => void): SVGElementTagNameMap[K];
    function createFragment(callback?: (el: DocumentFragment) => void): DocumentFragment;
    interface EventListenerInfo {
        selector: string;
        listener: Function;
        options?: boolean | AddEventListenerOptions;
        callback: Function;
    }
    interface HTMLElement extends Element {
        _EVENTS?: {
            [K in keyof HTMLElementEventMap]?: EventListenerInfo[];
        };
        on<K extends keyof HTMLElementEventMap>(this: HTMLElement, type: K, selector: string, listener: (this: HTMLElement, ev: HTMLElementEventMap[K], delegateTarget: HTMLElement) => any, options?: boolean | AddEventListenerOptions): void;
        off<K extends keyof HTMLElementEventMap>(this: HTMLElement, type: K, selector: string, listener: (this: HTMLElement, ev: HTMLElementEventMap[K], delegateTarget: HTMLElement) => any, options?: boolean | AddEventListenerOptions): void;
        onClickEvent(this: HTMLElement, listener: (this: HTMLElement, ev: MouseEvent) => any, options?: boolean | AddEventListenerOptions): void;
        /**
         * @param listener - the callback to call when this node is inserted into the DOM.
         * @param once - if true, this will only fire once and then unhook itself.
         * @returns destroy - a function to remove the event handler to avoid memory leaks.
         */
        onNodeInserted(this: HTMLElement, listener: () => any, once?: boolean): () => void;
        /**
         * @param listener - the callback to call when this node has been migrated to another window.
         * @returns destroy - a function to remove the event handler to avoid memory leaks.
         */
        onWindowMigrated(this: HTMLElement, listener: (win: Window) => any): () => void;
        trigger(eventType: string): void;
    }
    interface Document {
        _EVENTS?: {
            [K in keyof DocumentEventMap]?: EventListenerInfo[];
        };
        on<K extends keyof DocumentEventMap>(this: Document, type: K, selector: string, listener: (this: Document, ev: DocumentEventMap[K], delegateTarget: HTMLElement) => any, options?: boolean | AddEventListenerOptions): void;
        off<K extends keyof DocumentEventMap>(this: Document, type: K, selector: string, listener: (this: Document, ev: DocumentEventMap[K], delegateTarget: HTMLElement) => any, options?: boolean | AddEventListenerOptions): void;
    }
    interface UIEvent extends Event {
        targetNode: Node | null;
        win: Window;
        doc: Document;
        /**
         * Cross-window capable instanceof check, a drop-in replacement
         * for instanceof checks on UIEvents.
         * @param type
         */
        instanceOf<T>(type: {
            new (...data: any[]): T;
        }): this is T;
    }
    interface AjaxOptions {
        method?: 'GET' | 'POST';
        url: string;
        success?: (response: any, req: XMLHttpRequest) => any;
        error?: (error: any, req: XMLHttpRequest) => any;
        data?: object | string | ArrayBuffer;
        headers?: Record<string, string>;
        withCredentials?: boolean;
        req?: XMLHttpRequest;
    }
    function ajax(options: AjaxOptions): void;
    function ajaxPromise(options: AjaxOptions): Promise<any>;
    function ready(fn: () => any): void;
    function sleep(ms: number): Promise<void>;
    function nextFrame(): Promise<void>;
    /**
     * The actively focused Window object. This is usually the same as `window` but
     * it will be different when using popout windows.
     */
    let activeWindow: Window;
    /**
     * The actively focused Document object. This is usually the same as `document` but
     * it will be different when using popout windows.
     */
    let activeDocument: Document;
    interface Window extends EventTarget, AnimationFrameProvider, GlobalEventHandlers, WindowEventHandlers, WindowLocalStorage, WindowOrWorkerGlobalScope, WindowSessionStorage {
        /**
         * The actively focused Window object. This is usually the same as `window` but
         * it will be different when using popout windows.
         */
        activeWindow: Window;
        /**
         * The actively focused Document object. This is usually the same as `document` but
         * it will be different when using popout windows.
         */
        activeDocument: Document;
        sleep(ms: number): Promise<void>;
        nextFrame(): Promise<void>;
    }
    interface Touch {
        touchType: 'stylus' | 'direct';
    }
}

/**
 * @public
 */
export class Component {

    /**
     * Load this component and its children
     * @public
     */
    load(): void;
    /**
     * Override this to load your component
     * @public
     * @virtual
     */
    onload(): void;
    /**
     * Unload this component and its children
     * @public
     */
    unload(): void;
    /**
     * Override this to unload your component
     * @public
     * @virtual
     */
    onunload(): void;
    /**
     * Adds a child component, loading it if this component is loaded
     * @public
     */
    addChild<T extends Component>(component: T): T;
    /**
     * Removes a child component, unloading it
     * @public
     */
    removeChild<T extends Component>(component: T): T;
    /**
     * Registers a callback to be called when unloading
     * @public
     */
    register(cb: () => any): void;
    /**
     * Registers an event to be detached when unloading
     * @public
     */
    registerEvent(eventRef: EventRef): void;
    /**
     * Registers an DOM event to be detached when unloading
     * @public
     */
    registerDomEvent<K extends keyof WindowEventMap>(el: Window, type: K, callback: (this: HTMLElement, ev: WindowEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
    /**
     * Registers an DOM event to be detached when unloading
     * @public
     */
    registerDomEvent<K extends keyof DocumentEventMap>(el: Document, type: K, callback: (this: HTMLElement, ev: DocumentEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
    /**
     * Registers an DOM event to be detached when unloading
     * @public
     */
    registerDomEvent<K extends keyof HTMLElementEventMap>(el: HTMLElement, type: K, callback: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;

    /**
     * Registers an interval (from setInterval) to be cancelled when unloading
     * Use {@link window#setInterval} instead of {@link setInterval} to avoid TypeScript confusing between NodeJS vs Browser API
     * @public
     */
    registerInterval(id: number): number;
}

/**
 * @public
 */
export interface EventRef {

}

/**
 * @public
 */
export class Events {

    /**
     * @public
     */
    on(name: string, callback: (...data: unknown[]) => unknown, ctx?: any): EventRef;
    /**
     * @public
     */
    off(name: string, callback: (...data: unknown[]) => unknown): void;
    /**
     * @public
     */
    offref(ref: EventRef): void;
    /**
     * @public
     */
    trigger(name: string, ...data: unknown[]): void;
    /**
     * @public
     */
    tryTrigger(evt: EventRef, args: unknown[]): void;
}

/**
 * A post processor receives an element which is a section of the preview.
 *
 * Post processors can mutate the DOM to render various things, such as mermaid graphs, latex equations, or custom controls.
 *
 * If your post processor requires lifecycle management, for example, to clear an interval, kill a subprocess, etc when this element is
 * removed from the app, look into {@link MarkdownPostProcessorContext#addChild}
 * @public
 */
export interface MarkdownPostProcessor {
    /**
     * The processor function itself.
     * @public
     */
    (el: HTMLElement, ctx: MarkdownPostProcessorContext): Promise<any> | void;
    /**
     * An optional integer sort order. Defaults to 0. Lower number runs before higher numbers.
     * @public
     */
    sortOrder?: number;
}

/**
 * @public
 */
export interface MarkdownPostProcessorContext {
    /**
     * @public
     */
    docId: string;
    /**
     * The path to the associated file. Any links are assumed to be relative to the `sourcePath`.
     * @public
     */
    sourcePath: string;
    /** @public */
    frontmatter: any | null | undefined;

    /**
     * Adds a child component that will have its lifecycle managed by the renderer.
     *
     * Use this to add a dependent child to the renderer such that if the containerEl
     * of the child is ever removed, the component's unload will be called.
     * @public
     */
    addChild(child: MarkdownRenderChild): void;
    /**
     * Gets the section information of this element at this point in time.
     * Only call this function right before you need this information to get the most up-to-date version.
     * This function may also return null in many circumstances; if you use it, you must be prepared to deal with nulls.
     * @public
     */
    getSectionInfo(el: HTMLElement): MarkdownSectionInformation | null;

}

/**
 * @public
 */
export class MarkdownPreviewRenderer {

    /**
     * @public
     */
    static registerPostProcessor(postProcessor: MarkdownPostProcessor, sortOrder?: number): void;
    /**
     * @public
     */
    static unregisterPostProcessor(postProcessor: MarkdownPostProcessor): void;

    /**
     * @public
     */
    static createCodeBlockPostProcessor(language: string, handler: (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => Promise<any> | void): (el: HTMLElement, ctx: MarkdownPostProcessorContext) => void;

}

/**
 * @public
 */
export class MarkdownRenderChild extends Component {
    /** @public */
    containerEl: HTMLElement;
    /**
     * @param containerEl - This HTMLElement will be used to test whether this component is still alive.
     * It should be a child of the Markdown preview sections, and when it's no longer attached
     * (for example, when it is replaced with a new version because the user edited the Markdown source code),
     * this component will be unloaded.
     * @public
     */
    constructor(containerEl: HTMLElement);
}

/** @public */
export interface MarkdownSectionInformation {
    /** @public */
    text: string;
    /** @public */
    lineStart: number;
    /** @public */
    lineEnd: number;
}

/** @public */
export class Publish extends Events {

    /** @public */
    get currentFilepath(): string;
    /**
     * @public
     */
    registerMarkdownPostProcessor(postProcessor: MarkdownPostProcessor, sortOrder?: number): MarkdownPostProcessor;
    /**
     * Register a special post processor that handles fenced code given a language and a handler.
     * This special post processor takes care of removing the `<pre><code>` and create a `<div>` that
     * will be passed to your handler, and is expected to be filled with your custom elements.
     * @public
     */
    registerMarkdownCodeBlockProcessor(language: string, handler: (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => Promise<any> | void, sortOrder?: number): MarkdownPostProcessor;

    /** @public */
    on(name: 'navigated', callback: () => any, ctx?: any): EventRef;
}

export { }

/** @public */
declare global {
	/**
	 * Global reference to the publish instance.
	 * @public
	 */
	var publish: Publish;
}

