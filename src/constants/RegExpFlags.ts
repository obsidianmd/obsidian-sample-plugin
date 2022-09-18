export type RegExpFlag = 'g' | 'i' | 'm' | 'u' | 'y' | 'n' | 's' | 'x' | 'A';

export const REGEXP_FLAGS = [
  'g',
  'i',
  'm',
  'u',
  'y',
  'n',
  's',
  'x',
  'A',
] as const;

export type RegExpFlags = typeof REGEXP_FLAGS;
