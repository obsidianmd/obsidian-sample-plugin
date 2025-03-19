import { Plugin, TFile } from 'obsidian';

export default class MusicNotePlugin extends Plugin {
    private audio: HTMLAudioElement | null = null;
    private isPlaying: boolean = false;
    private toggleButton: HTMLElement | null = null;
    private statusBarItem: HTMLElement | null = null;

    async onload() {
        console.log("Music Note Plugin Loaded!");

        // 상태 바 아이템 생성
        this.statusBarItem = this.addStatusBarItem();
        this.toggleButton = this.statusBarItem.createEl("button", { text: "Play" });

        // 버튼 스타일 적용 (toggleButton이 null이 아닌지 확인)
        if (this.toggleButton) {
            this.toggleButton.style.backgroundColor = "transparent";
            this.toggleButton.style.border = "none";
            this.toggleButton.style.cursor = "pointer";
            this.toggleButton.style.color = "#8A8A8A"; // 당신이 찾은 색상으로 변경
            this.toggleButton.style.display = "none"; // 처음엔 숨김

            // 버튼 클릭 이벤트
            this.toggleButton.addEventListener("click", () => {
                if (!this.isPlaying) {
                    if (!this.audio) {
                        this.audio = new Audio("https://music.youtube.com/watch?v=mJYyGLzdnZE&list=RDAMVMmJYyGLzdnZE");
                    }
                    this.audio.play().catch(error => {
                        console.log("Audio play failed:", error);
                    });
                    this.toggleButton!.textContent = "Stop"; // !로 null 아님을 보장
                    this.isPlaying = true;
                } else {
                    if (this.audio) {
                        this.audio.pause();
                        this.audio.currentTime = 0;
                    }
                    this.toggleButton!.textContent = "Play"; // !로 null 아님을 보장
                    this.isPlaying = false;
                }
            });
        }

        // 노트가 열릴 때마다 확인
        this.registerEvent(
            this.app.workspace.on("file-open", (file: TFile | null) => {
                this.checkAudioContent(file);
            })
        );

        // 처음 로드 시 현재 열려있는 파일 확인
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile) {
            this.checkAudioContent(activeFile);
        }
    }

    // 오디오 콘텐츠 확인 함수
    private async checkAudioContent(file: TFile | null) {
        if (!file || !this.toggleButton || !this.statusBarItem) return;

        const content = await this.app.vault.read(file);
        const hasAudio = /youtube\.com|youtu\.be|\.mp3|music\.youtube\.com/i.test(content);

        if (hasAudio) {
            this.toggleButton.style.display = "block"; // 보이기
        } else {
            this.toggleButton.style.display = "none"; // 숨기기
            if (this.audio) {
                this.audio.pause();
                this.audio.currentTime = 0; // 재생 중이면 정지 후 처음으로
                this.isPlaying = false;
                this.toggleButton.textContent = "Play";
            }
        }
    }

    onunload() {
        console.log("Music Note Plugin Unloaded!");
        if (this.audio) {
            this.audio.pause();
        }
    }
}