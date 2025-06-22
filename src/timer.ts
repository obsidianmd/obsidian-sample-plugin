
export class PomodoroTimer {
    private pomodoroDuration: number; // in seconds
    private shortBreakDuration: number; // in seconds
    private longBreakDuration: number; // in seconds
    private cyclesBeforeLongBreak: number;

    private timerId: NodeJS.Timeout | null = null;
    private remainingTime: number; // in seconds
    private isRunning: boolean = false;
    private currentCycle: number = 0;
    private isPomodoro: boolean = true; // true for pomodoro, false for break

    constructor(
        pomodoroDuration: number = 25 * 60,
        shortBreakDuration: number = 5 * 60,
        longBreakDuration: number = 15 * 60,
        cyclesBeforeLongBreak: number = 4
    ) {
        this.pomodoroDuration = pomodoroDuration;
        this.shortBreakDuration = shortBreakDuration;
        this.longBreakDuration = longBreakDuration;
        this.cyclesBeforeLongBreak = cyclesBeforeLongBreak;
        this.remainingTime = this.pomodoroDuration;
    }

    public start(onTick: (remainingTime: number, isPomodoro: boolean) => void, onComplete: () => void) {
        if (this.isRunning) {
            return;
        }
        this.isRunning = true;
        this.timerId = setInterval(() => {
            this.remainingTime--;
            onTick(this.remainingTime, this.isPomodoro);
            if (this.remainingTime <= 0) {
                this.stop();
                onComplete();
                this.nextCycle();
            }
        }, 1000);
    }

    public pause() {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
        this.isRunning = false;
    }

    public reset() {
        this.pause();
        this.currentCycle = 0;
        this.isPomodoro = true;
        this.remainingTime = this.pomodoroDuration;
    }

    public skip() {
        this.pause();
        this.nextCycle();
    }

    private stop() {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
        this.isRunning = false;
    }

    private nextCycle() {
        if (this.isPomodoro) {
            this.currentCycle++;
            if (this.currentCycle % this.cyclesBeforeLongBreak === 0) {
                this.isPomodoro = false;
                this.remainingTime = this.longBreakDuration;
            } else {
                this.isPomodoro = false;
                this.remainingTime = this.shortBreakDuration;
            }
        } else {
            this.isPomodoro = true;
            this.remainingTime = this.pomodoroDuration;
        }
    }

    public getRemainingTime(): number {
        return this.remainingTime;
    }

    public getIsRunning(): boolean {
        return this.isRunning;
    }

    public getIsPomodoro(): boolean {
        return this.isPomodoro;
    }
}
