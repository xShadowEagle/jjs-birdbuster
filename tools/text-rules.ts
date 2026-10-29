import { EN, type TextKey } from '../src/texts/en.ts';
import { PLACEHOLDER, TODO } from '../src/language.ts';
import { missingGlyphs, parseStrikes, wrapText } from '../src/ui/font.ts';
import { CUTSCENES } from '../src/story/cutscenes/index.ts';
import { BUBBLE } from '../src/constants.ts';
import { RUN_LINES, type CharacterId, type RunLine } from '../src/story/characters.ts';

export const SPEAKERS = new Map<TextKey, CharacterId>([
  ...Object.values(CUTSCENES).flatMap(c => c.beats.flatMap(b => ('say' in b ? [[b.text, b.say] as const] : []))),
  ...(Object.keys(RUN_LINES) as RunLine[]).map(k => [k, RUN_LINES[k]] as const),
]);

const placeholders = (text: string) => [...text.matchAll(PLACEHOLDER)].map(m => m[1]).sort().join(',');

export const bubbleLines = (text: string) => wrapText(parseStrikes(text).plain, BUBBLE.textW).length;

export function textProblems(key: TextKey, text: string): string[] {
  if (text === TODO) return [];
  const problems: string[] = [];
  if (placeholders(text) !== placeholders(EN[key])) problems.push(`keep the placeholders {${placeholders(EN[key])}}`);
  const missing = missingGlyphs(parseStrikes(text).plain.replace(PLACEHOLDER, ''));
  if (missing.length) problems.push(`the font has no ${missing.join(' ')}`);
  const lines = SPEAKERS.has(key) ? bubbleLines(text) : 0;
  if (lines > BUBBLE.maxLines) problems.push(`${lines} lines in its bubble (at most ${BUBBLE.maxLines}: split it)`);
  return problems;
}
