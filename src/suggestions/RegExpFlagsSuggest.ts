// Credits go to Liam's Periodic Notes Plugin: https://github.com/liamcain/obsidian-periodic-notes

import { TextInputSuggest } from './suggest';
import { REGEXP_FLAGS, RegExpFlag } from '../constants/RegExpFlags';

export class RegExpFlagsSuggest extends TextInputSuggest<RegExpFlag> {
  // @ts-ignore TODO refactor types types
  getSuggestions() {
    return REGEXP_FLAGS;
  }

  renderSuggestion = (flag: RegExpFlag, el: HTMLElement) => {
    const { regExpState } = this.plugin.settings;
    const hasFlag = regExpState.flags.includes(flag);
    if (hasFlag) {
      el.addClass('bulk-flag-selected');
    } else {
      el.removeClass('bulk-flag-selected');
    }
    el.setText(flag);
  };

  selectSuggestion = (flag: RegExpFlag, event: MouseEvent | KeyboardEvent) => {
    const { regExpState } = this.plugin.settings;
    const target = event.target as HTMLDivElement;

    const hasFlag = regExpState.flags.includes(flag);
    if (hasFlag) {
      regExpState.flags = regExpState.flags.filter((existingFlag) => {
        return existingFlag !== flag;
      });
    } else {
      regExpState.flags = [...regExpState.flags, flag];
    }
    target.classList.toggle('bulk-flag-selected');
    this.inputEl.value = regExpState.flags.join('');
    this.inputEl.trigger('input');
  };
}
