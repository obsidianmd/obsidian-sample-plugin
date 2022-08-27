import { Notice } from 'obsidian';

export class TemplaterError extends Error {
  constructor(msg: string, public console_msg?: string) {
    super(msg);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}
export function log_error(e: Error | TemplaterError): void {
  const notice = new Notice('', 8000);
  if (e instanceof TemplaterError && e.console_msg) {
    // TODO: Find a better way for this
    // @ts-ignore
    notice.noticeEl.innerHTML = `<b>Templater Error</b>:<br/>${e.message}<br/>Check console for more information`;
    console.error(`Templater Error:`, e.message, '\n', e.console_msg);
  } else {
    // @ts-ignore
    notice.noticeEl.innerHTML = `<b>Templater Error</b>:<br/>${e.message}`;
  }
}

export function errorWrapperSync<T>(fn: () => T, msg: string): T {
  try {
    return fn();
  } catch (e) {
    log_error(new TemplaterError(msg, e.message));
    return null;
  }
}

export enum FileSuggestMode {
  TemplateFiles,
  ScriptFiles,
}
