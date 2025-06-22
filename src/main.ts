
import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, WorkspaceLeaf } from 'obsidian';
import { PomodoroView, POMODORO_VIEW_TYPE } from './pomodoroView';
import { PomodoroTimer } from './timer';
import { createDailyNote, getDailyNote, getAllDailyNotes } from 'obsidian-daily-notes-interface';
import moment from 'moment';


// Remember to rename these classes and interfaces!

interface PomodoroPluginSettings {
    pomodoroDuration: number;
    shortBreakDuration: number;
    longBreakDuration: number;
    cyclesBeforeLongBreak: number;
    autoStartNextSession: boolean;
    enableNotifications: boolean;
    enableSound: boolean;
}

const DEFAULT_SETTINGS: PomodoroPluginSettings = {
    pomodoroDuration: 25, // minutes
    shortBreakDuration: 5, // minutes
    longBreakDuration: 15, // minutes
    cyclesBeforeLongBreak: 4,
    autoStartNextSession: false,
    enableNotifications: true,
    enableSound: false,
}

export default class PomodoroPlugin extends Plugin {
    settings: PomodoroPluginSettings;
    timer: PomodoroTimer;
    statusBarItemEl: HTMLElement;

    async onload() {
        await this.loadSettings();

        this.timer = new PomodoroTimer(
            this.settings.pomodoroDuration * 60,
            this.settings.shortBreakDuration * 60,
            this.settings.longBreakDuration * 60,
            this.settings.cyclesBeforeLongBreak
        );

        this.statusBarItemEl = this.addStatusBarItem();
        this.updateStatusBar();

        this.addRibbonIcon('timer', 'Open Pomodoro Timer', () => {
            this.activateView();
        });

        this.registerView(
            POMODORO_VIEW_TYPE,
            (leaf) => new PomodoroView(leaf, this)
        );

        this.addCommand({
            id: 'pomodoro-start',
            name: 'Start Pomodoro',
            callback: () => this.startTimer(),
        });

        this.addCommand({
            id: 'pomodoro-pause',
            name: 'Pause Pomodoro',
            callback: () => this.pauseTimer(),
        });

        this.addCommand({
            id: 'pomodoro-reset',
            name: 'Reset Pomodoro',
            callback: () => this.resetTimer(),
        });

        this.addCommand({
            id: 'pomodoro-skip',
            name: 'Skip Session',
            callback: () => this.skipTimer(),
        });

        this.addSettingTab(new PomodoroSettingTab(this.app, this));
    }

    onunload() {
        this.timer.pause();
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async activateView() {
        this.app.workspace.detachLeavesOfType(POMODORO_VIEW_TYPE);

        await this.app.workspace.getRightLeaf(false).setViewState({
            type: POMODORO_VIEW_TYPE,
            active: true,
        });

        this.app.workspace.revealLeaf(
            this.app.workspace.getLeavesOfType(POMODORO_VIEW_TYPE)[0]
        );
    }

    updateStatusBar() {
        const remainingTime = this.timer.getRemainingTime();
        const minutes = Math.floor(remainingTime / 60);
        const seconds = remainingTime % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        const statusText = `🍅 ${timeString}`;
        this.statusBarItemEl.setText(statusText);
    }

    startTimer() {
        this.timer.start(
            (remainingTime, isPomodoro) => {
                this.updateStatusBar();
                // The PomodoroView will update itself via its registered interval
            },
            () => {
                const sessionType = this.timer.getIsPomodoro() ? 'Pomodoro' : 'Break';
                new Notice(`${sessionType} Complete!`);
                this.handleSessionEnd(sessionType);
                this.logSession();
                if (this.settings.autoStartNextSession) {
                    this.startTimer();
                }
            }
        );
    }

    pauseTimer() {
        this.timer.pause();
        this.updateStatusBar();
    }

    resetTimer() {
        this.timer.reset();
        this.updateStatusBar();
    }

    skipTimer() {
        this.timer.skip();
        this.updateStatusBar();
        if (this.settings.autoStartNextSession) {
            this.startTimer();
        }
    }

    async logSession() {
        const now = moment();
        const dailyNote = getDailyNote(now, getAllDailyNotes());

        let fileContent = '';
        if (dailyNote) {
            fileContent = await this.app.vault.read(dailyNote);
        } else {
            const newDailyNote = await createDailyNote(now);
            fileContent = await this.app.vault.read(newDailyNote);
        }

        const sessionType = this.timer.getIsPomodoro() ? 'Break' : 'Pomodoro'; // Log the *completed* session type
        const duration = this.timer.getIsPomodoro() ? this.settings.pomodoroDuration : (this.timer.currentCycle % this.settings.cyclesBeforeLongBreak === 0 ? this.settings.longBreakDuration : this.settings.shortBreakDuration);
        const activeNote = this.app.workspace.getActiveViewOfType(MarkdownView)?.file?.basename || 'No active note';

        const logEntry = `- [x] ${now.format('HH:mm')} - ${sessionType} (${duration}分) - [[${activeNote}]]`;

        if (dailyNote) {
            await this.app.vault.append(dailyNote, `\n${logEntry}`);
        } else {
            const newDailyNote = await createDailyNote(now);
            await this.app.vault.append(newDailyNote, `\n${logEntry}`);
        }
    }

    handleSessionEnd(sessionType: string) {
        if (this.settings.enableNotifications) {
            new Notification('Obsidian Pomodoro', {
                body: `${sessionType} session complete!`,
            });
        }
        if (this.settings.enableSound) {
            // You would typically play a sound here.
            // In a browser environment, this would be an Audio object.
            // For Obsidian, you might need to use a different approach or rely on OS notification sounds.
            // For simplicity, we'll just log for now.
            console.log('Playing session end sound.');
        }
    }
}

class PomodoroSettingTab extends PluginSettingTab {
    plugin: PomodoroPlugin;

    constructor(app: App, plugin: PomodoroPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        new Setting(containerEl)
            .setName('Pomodoro Duration')
            .setDesc('Duration of a pomodoro session in minutes.')
            .addText(text => text
                .setPlaceholder('25')
                .setValue(this.plugin.settings.pomodoroDuration.toString())
                .onChange(async (value) => {
                    this.plugin.settings.pomodoroDuration = parseInt(value);
                    await this.plugin.saveSettings();
                    this.plugin.timer = new PomodoroTimer(
                        this.plugin.settings.pomodoroDuration * 60,
                        this.plugin.settings.shortBreakDuration * 60,
                        this.plugin.settings.longBreakDuration * 60,
                        this.plugin.settings.cyclesBeforeLongBreak
                    );
                    this.plugin.resetTimer();
                }));

        new Setting(containerEl)
            .setName('Short Break Duration')
            .setDesc('Duration of a short break in minutes.')
            .addText(text => text
                .setPlaceholder('5')
                .setValue(this.plugin.settings.shortBreakDuration.toString())
                .onChange(async (value) => {
                    this.plugin.settings.shortBreakDuration = parseInt(value);
                    await this.plugin.saveSettings();
                    this.plugin.timer = new PomodoroTimer(
                        this.plugin.settings.pomodoroDuration * 60,
                        this.plugin.settings.shortBreakDuration * 60,
                        this.plugin.settings.longBreakDuration * 60,
                        this.plugin.settings.cyclesBeforeLongBreak
                    );
                    this.plugin.resetTimer();
                }));

        new Setting(containerEl)
            .setName('Long Break Duration')
            .setDesc('Duration of a long break in minutes.')
            .addText(text => text
                .setPlaceholder('15')
                .setValue(this.plugin.settings.longBreakDuration.toString())
                .onChange(async (value) => {
                    this.plugin.settings.longBreakDuration = parseInt(value);
                    await this.plugin.saveSettings();
                    this.plugin.timer = new PomodoroTimer(
                        this.plugin.settings.pomodoroDuration * 60,
                        this.plugin.settings.shortBreakDuration * 60,
                        this.plugin.settings.longBreakDuration * 60,
                        this.plugin.settings.cyclesBeforeLongBreak
                    );
                    this.plugin.resetTimer();
                }));

        new Setting(containerEl)
            .setName('Cycles Before Long Break')
            .setDesc('Number of pomodoro sessions before a long break.')
            .addText(text => text
                .setPlaceholder('4')
                .setValue(this.plugin.settings.cyclesBeforeLongBreak.toString())
                .onChange(async (value) => {
                    this.plugin.settings.cyclesBeforeLongBreak = parseInt(value);
                    await this.plugin.saveSettings();
                    this.plugin.timer = new PomodoroTimer(
                        this.plugin.settings.pomodoroDuration * 60,
                        this.plugin.settings.shortBreakDuration * 60,
                        this.plugin.settings.longBreakDuration * 60,
                        this.plugin.settings.cyclesBeforeLongBreak
                    );
                    this.plugin.resetTimer();
                }));

        new Setting(containerEl)
            .setName('Auto Start Next Session')
            .setDesc('Automatically start the next pomodoro or break session after the current one ends.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoStartNextSession)
                .onChange(async (value) => {
                    this.plugin.settings.autoStartNextSession = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Enable Notifications')
            .setDesc('Display OS native notifications when a session ends.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableNotifications)
                .onChange(async (value) => {
                    this.plugin.settings.enableNotifications = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Enable Sound')
            .setDesc('Play a sound when a session ends.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableSound)
                .onChange(async (value) => {
                    this.plugin.settings.enableSound = value;
                    await this.plugin.saveSettings();
                }));
    }
}
