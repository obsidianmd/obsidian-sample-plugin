import { Notice } from 'obsidian';
import { TemplaterError } from './error';

export function log_update(msg: string): void {
    const notice = new Notice('', 15000);
    // TODO: Find better way for this
    // @ts-ignore
    notice.noticeEl.innerHTML = `<b>obsidian-agents update</b>:<br/>${msg}`;
}

export function log_error(e: Error | TemplaterError): void {
    const notice = new Notice('', 8000);
    if (e instanceof TemplaterError && e.console_msg) {
        // TODO: Find a better way for this
        // @ts-ignore
        notice.noticeEl.innerHTML = `<b>obsidian-agents Error</b>:<br/>${e.message}<br/>Check console for more information`;
        console.error(`obsidian-agents Error:`, e.message, '\n', e.console_msg);
    } else {
        // @ts-ignore
        notice.noticeEl.innerHTML = `<b>obsidian-agents Error</b>:<br/>${e.message}`;
    }
}
