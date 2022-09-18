export type RegExpFlag =
  | 'g'
  | 'm'
  | 'i'
  | 'x'
  | 's'
  | 'u'
  | 'U'
  | 'A'
  | 'J'
  | 'D';

export const REGEXP_FLAGS = [
  'g',
  'm',
  'i',
  'x',
  's',
  'u',
  'U',
  'A',
  'J',
  'D',
] as const;

export type RegExpFlags = typeof REGEXP_FLAGS;
