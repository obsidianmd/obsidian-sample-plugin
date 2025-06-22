
import { ItemView, WorkspaceLeaf, setIcon } from 'obsidian';
import { PomodoroTimer } from './timer';
import PomodoroPlugin from './main';

export const POMODORO_VIEW_TYPE = 'pomodoro-view';

export class PomodoroView extends ItemView {
    plugin: PomodoroPlugin;
    timer: PomodoroTimer;
    private timerDisplay: HTMLElement;
    private startPauseButton: HTMLElement;
    private resetButton: HTMLElement;
    private skipButton: HTMLElement;

    constructor(leaf: WorkspaceLeaf, plugin: PomodoroPlugin) {
        super(leaf);
        this.plugin = plugin;
        this.timer = plugin.timer;
    }

    getViewType(): string {
        return POMODORO_VIEW_TYPE;
    }

    getDisplayText(): string {
        return 'Pomodoro Timer';
    }

    getIcon(): string {
        return 'timer';
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass('pomodoro-view-container');

        // Timer Display
        this.timerDisplay = container.createEl('div', { cls: 'pomodoro-timer-display' });
        this.timerDisplay.setText('25:00'); // Initial display

        // Control Buttons
        const controls = container.createEl('div', { cls: 'pomodoro-controls' });

        this.startPauseButton = controls.createEl('button', { cls: 'pomodoro-button' });
        setIcon(this.startPauseButton, 'play');
        this.startPauseButton.onclick = () => this.toggleTimer();

        this.resetButton = controls.createEl('button', { cls: 'pomodoro-button' });
        setIcon(this.resetButton, 'rotate-ccw');
        this.resetButton.onclick = () => this.plugin.resetTimer();

        this.skipButton = controls.createEl('button', { cls: 'pomodoro-button' });
        setIcon(this.skipButton, 'skip-forward');
        this.skipButton.onclick = () => this.plugin.skipTimer();

        this.updateUI();
        this.plugin.registerInterval(window.setInterval(() => this.updateUI(), 1000));
    }

    async onClose() {
        // Nothing to clean up.
    }

    updateUI() {
        const remainingTime = this.timer.getRemainingTime();
        const minutes = Math.floor(remainingTime / 60);
        const seconds = remainingTime % 60;
        this.timerDisplay.setText(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);

        if (this.timer.getIsRunning()) {
            setIcon(this.startPauseButton, 'pause');
        } else {
            setIcon(this.startPauseButton, 'play');
        }
    }

    toggleTimer() {
        if (this.timer.getIsRunning()) {
            this.plugin.pauseTimer();
        } else {
            this.plugin.startTimer();
        }
    }
}
