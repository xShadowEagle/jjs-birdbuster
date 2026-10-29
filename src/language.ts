import { savedLanguage, saveLanguage } from './save';
import { EN, type TextKey } from './texts/en';
import { DE } from './texts/de';

export type LanguageId = 'de' | 'en';
export const LANGUAGES: readonly { id: LanguageId; name: string; ready: boolean }[] = [
  { id: 'de', name: 'Deutsch', ready: true },
  { id: 'en', name: 'English', ready: true },
];

export const TEXTS: Record<LanguageId, Readonly<Record<TextKey, string>>> = { de: DE, en: EN };

export const TODO = 'TODO';

export const languageName = (id: LanguageId): string => LANGUAGES.find(l => l.id === id)!.name;

// global: for replace() and matchAll(), not test() or exec(), which keep its lastIndex
export const PLACEHOLDER = /\{(\w+)\}/g;

export type TextVars = Record<string, string | number>;

let chosen: LanguageId | undefined;

export function language(): LanguageId {
  chosen ??= (LANGUAGES.find(l => l.id === savedLanguage() && l.ready) ?? LANGUAGES.find(l => l.ready)!).id;
  return chosen;
}

export function chooseLanguage(id: LanguageId, remember = true): void {
  chosen = id;
  if (remember) saveLanguage(id);
}

export function inEvery(key: TextKey): string[] {
  return [...new Set(LANGUAGES.map(l => TEXTS[l.id][key]))];
}

export function t(key: TextKey, vars?: TextVars): string {
  const text = TEXTS[language()][key];
  return vars ? text.replace(PLACEHOLDER, (m, k: string) => (k in vars ? String(vars[k]) : m)) : text;
}
