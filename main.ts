import { App, Modal, Plugin, Notice, MarkdownRenderer, ButtonComponent, PluginSettingTab, Setting, ItemView, TFile } from 'obsidian';

// --- Interfaces ---
interface CanvasNode {
    id: string;
    text?: string;
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

interface CanvasEdge {
    id: string;
    fromNode: string;
    toNode: string;
    label?: string;
}

interface CanvasData {
    nodes: CanvasNode[];
    edges: CanvasEdge[];
}

interface CanvasPlayerSettings {
    mode: 'modal' | 'camera';
    rootNodeMarker: string;
}

const DEFAULT_SETTINGS: CanvasPlayerSettings = {
    mode: 'modal',
    rootNodeMarker: 'canvas-start'
}

export default class CanvasPlayerPlugin extends Plugin {
    settings: CanvasPlayerSettings;
    activeHud: HTMLElement | null = null; 
    
    async onload() {
        await this.loadSettings();

        this.app.workspace.onLayoutReady(() => {
            this.refreshCanvasViewActions();
        });

        this.registerEvent(this.app.workspace.on('active-leaf-change', () => {
            this.refreshCanvasViewActions();
        }));

        this.addCommand({
            id: 'play-canvas-command',
            name: 'Play Current Canvas',
            checkCallback: (checking: boolean) => {
                const activeFile = this.app.workspace.getActiveFile();
                if (activeFile && activeFile.extension === 'canvas') {
                    if (!checking) this.playActiveCanvas();
                    return true;
                }
                return false;
            }
        });

        this.addSettingTab(new CanvasPlayerSettingTab(this.app, this));
    }

    refreshCanvasViewActions() {
        this.app.workspace.iterateAllLeaves((leaf) => {
            if (leaf.view.getViewType() === 'canvas') {
                const view = leaf.view as ItemView;
                if ((view as any)._hasCanvasPlayerButton) return;
                view.addAction('play', 'Play Canvas', () => {
                    this.playActiveCanvas();
                });
                (view as any)._hasCanvasPlayerButton = true;
            }
        });
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async playActiveCanvas() {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile || activeFile.extension !== 'canvas') {
            new Notice('Please open a Canvas file first.');
            return;
        }

        const content = await this.app.vault.read(activeFile);
        const canvasData: CanvasData = JSON.parse(content);

        const startNode = this.getStartNode(canvasData);

        if (!startNode) {
            new Notice('Could not find a starting node in this canvas.');
            return;
        }

        if (this.settings.mode === 'modal') {
            new CanvasPlayerModal(this.app, this, canvasData, startNode, activeFile).open();
        } else {
            this.startCameraMode(canvasData, startNode);
        }
    }

    getStartNode(canvasData: CanvasData): CanvasNode | undefined {
        const marker = this.settings.rootNodeMarker?.trim();
        if (marker) {
            const markerLower = marker.toLowerCase();
            const markerMatch = canvasData.nodes.find(node => {
                if (node.type !== 'text' || !node.text) return false;
                return node.text.toLowerCase().includes(markerLower);
            });
            if (markerMatch) {
                return markerMatch;
            }
        }

        const nodeIdsWithIncoming = new Set(canvasData.edges.map(e => e.toNode));
        return canvasData.nodes.find(n => !nodeIdsWithIncoming.has(n.id) && n.type === 'text') 
               || canvasData.nodes[0];
    }

    // --- CAMERA MODE LOGIC ---
    async startCameraMode(data: CanvasData, startNode: CanvasNode) {
        const view = this.app.workspace.getActiveViewOfType(ItemView);
        if (!view || view.getViewType() !== 'canvas') return;

        this.createHud(view, data, startNode);
        
        // Initial Move
        this.zoomToNode(view, startNode);
    }

    createHud(view: ItemView, data: CanvasData, currentNode: CanvasNode) {
        if (this.activeHud) this.activeHud.remove();

        // Create HUD
        const hudEl = view.contentEl.createDiv({ cls: 'canvas-player-hud' });
        this.activeHud = hudEl;

        const closeBtn = hudEl.createEl('button', { text: 'Stop Playing', cls: 'canvas-hud-close' });
        closeBtn.onclick = () => {
           this.stopCameraMode();
        };

        const choicesContainer = hudEl.createDiv({ cls: 'canvas-hud-choices' });
        this.renderChoicesInHud(view, data, currentNode, choicesContainer);
    }

    stopCameraMode() {
         this.activeHud?.remove();
         this.activeHud = null;
    }

    renderChoicesInHud(view: ItemView, data: CanvasData, currentNode: CanvasNode, container: HTMLElement) {
        container.empty();

        const choices = data.edges.filter(edge => edge.fromNode === currentNode.id);

        if (choices.length === 0) {
            new ButtonComponent(container)
                .setButtonText("End of Path") 
                .onClick(() => {
                    this.stopCameraMode();
                })
                .buttonEl.addClass('mod-cta');
        } else {
            choices.forEach(edge => {
                const nextNode = data.nodes.find(n => n.id === edge.toNode);
                let label = edge.label || "Next";

                new ButtonComponent(container)
                    .setButtonText(label)
                    .onClick(() => {
                        if (nextNode) {
                            // Move Camera
                            this.zoomToNode(view, nextNode);
                            
                            // Render next buttons immediately
                            this.renderChoicesInHud(view, data, nextNode, container);
                        }
                    })
                    .buttonEl.addClass('canvas-player-btn');
            });
        }
    }

    zoomToNode(view: any, node: CanvasNode) {
        if (view && view.canvas) {
            const xPadding = node.width * 0.1; 
            const yPadding = node.height * 0.1; 
            view.canvas.zoomToBbox({
                minX: node.x - xPadding,
                minY: node.y - yPadding,
                maxX: node.x + node.width + xPadding,
                maxY: node.y + node.height + yPadding
            });
        }
    }
}

// ... Keep your Settings and Modal Classes below unchanged ...
// ... (Include CanvasPlayerSettingTab and CanvasPlayerModal classes from previous step) ...
// START: CanvasPlayerSettingTab
class CanvasPlayerSettingTab extends PluginSettingTab {
    plugin: CanvasPlayerPlugin;

    constructor(app: App, plugin: CanvasPlayerPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        new Setting(containerEl)
            .setName('Player Mode')
            .setDesc('Choose how you want to play the canvas.')
            .addDropdown(dropdown => dropdown
                .addOption('modal', 'Reader Mode (Text Popup)')
                .addOption('camera', 'Camera Mode (Pan & Zoom)')
                .setValue(this.plugin.settings.mode)
                .onChange(async (value) => {
                    this.plugin.settings.mode = value as 'modal' | 'camera';
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Root node marker')
            .setDesc('If set, Canvas Player starts at the first text node containing this marker. Leave empty to auto-detect.')
            .addText(text => text
                .setPlaceholder('e.g. canvas-start')
                .setValue(this.plugin.settings.rootNodeMarker || '')
                .onChange(async (value) => {
                    this.plugin.settings.rootNodeMarker = value;
                    await this.plugin.saveSettings();
                }));
    }
}
// END: CanvasPlayerSettingTab

// START: CanvasPlayerModal
class CanvasPlayerModal extends Modal {
    canvasData: CanvasData;
    currentNode: CanvasNode;
    plugin: CanvasPlayerPlugin;
    file: TFile;
    history: CanvasNode[] = [];
    isEditing: boolean = false;
    editBuffer: string = '';

    constructor(app: App, plugin: CanvasPlayerPlugin, canvasData: CanvasData, startNode: CanvasNode, file: TFile) {
        super(app);
        this.plugin = plugin;
        this.canvasData = canvasData;
        this.currentNode = startNode;
        this.file = file;
    }

    onOpen() { 
        document.body?.classList.add('canvas-player-reader-active');
        this.renderScene(); 
    }
    onClose() { 
        document.body?.classList.remove('canvas-player-reader-active');
        this.contentEl.empty(); 
    }

    async renderScene() {
        const { contentEl } = this;
        contentEl.empty();
        const container = contentEl.createDiv({ cls: 'canvas-player-container' });
        const textContainer = container.createDiv({ cls: 'canvas-player-text' });
        
        if (this.isEditing) {
            const textarea = textContainer.createEl('textarea', { cls: 'canvas-player-edit' }) as HTMLTextAreaElement;
            textarea.value = this.editBuffer;
            textarea.addEventListener('input', () => {
                this.editBuffer = textarea.value;
            });
            textarea.focus();
        } else {
            await MarkdownRenderer.render(this.app, this.currentNode.text || "...", textContainer, "/", this.plugin);
        }

        const buttonContainer = container.createDiv({ cls: 'canvas-player-choices' });

        if (this.isEditing) {
            const actionsRow = buttonContainer.createDiv({ cls: 'canvas-player-control-row' });
            new ButtonComponent(actionsRow)
                .setButtonText("Save")
                .setCta()
                .onClick(async () => { await this.saveEdits(); });
            new ButtonComponent(actionsRow)
                .setButtonText("Cancel")
                .onClick(() => this.cancelEdits());
            return;
        }

        const controlsRow = buttonContainer.createDiv({ cls: 'canvas-player-control-row' });
        new ButtonComponent(controlsRow)
            .setButtonText("Back")
            .setDisabled(this.history.length === 0)
            .onClick(() => this.goBack());
        new ButtonComponent(controlsRow)
            .setButtonText("Edit")
            .onClick(() => this.enterEditMode());

        const choices = this.canvasData.edges.filter(edge => edge.fromNode === this.currentNode.id);

        if (choices.length === 0) {
            new ButtonComponent(buttonContainer).setButtonText("End of Path").onClick(() => this.close());
        } else {
            choices.forEach(edge => {
                const nextNode = this.canvasData.nodes.find(n => n.id === edge.toNode);
                let lbl = edge.label || "Next";
                new ButtonComponent(buttonContainer).setButtonText(lbl).onClick(() => {
                     if(nextNode) { this.navigateToNode(nextNode); }
                });
            });
        }
    }

    enterEditMode() {
        this.isEditing = true;
        this.editBuffer = this.currentNode.text || "";
        this.renderScene();
    }

    cancelEdits() {
        this.isEditing = false;
        this.renderScene();
    }

    async saveEdits() {
        this.currentNode.text = this.editBuffer;
        try {
            await this.app.vault.modify(this.file, JSON.stringify(this.canvasData, null, 2));
            new Notice('Card updated.');
        } catch (error) {
            console.error('Failed to save canvas changes', error);
            new Notice('Failed to save changes.');
            return;
        }
        this.isEditing = false;
        await this.renderScene();
    }

    navigateToNode(nextNode: CanvasNode) {
        this.history.push(this.currentNode);
        this.currentNode = nextNode;
        this.renderScene();
    }

    goBack() {
        if (this.history.length === 0) return;
        const previous = this.history.pop();
        if (previous) {
            this.currentNode = previous;
            this.renderScene();
        }
    }
}
// END: CanvasPlayerModal