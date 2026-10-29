import type Phaser from 'phaser';
import { EN, type TextKey } from '../src/texts/en';
import { LANGUAGES, PLACEHOLDER, TEXTS, TODO, chooseLanguage, language, languageName, t, type LanguageId } from '../src/language';
import { CHARACTERS } from '../src/story/characters';
import { CUTSCENES } from '../src/story/cutscenes';
import { HEADS, type ActorSpec } from '../src/story/cutscene';
import { LEVELS } from '../src/levels';
import { BUBBLE, GAME_W, GAME_H, GROUND_Y } from '../src/constants';
import type { BiomeId } from '../src/world/biomes';
import { SpeechBubble, type Anchor } from '../src/ui/SpeechBubble';
import { LINE_H, parseStrikes, textWidth, wrapText } from '../src/ui/font';
import { label } from '../src/ui/text';
import { UI, css } from '../src/ui/colors';
import { SPEAKERS, bubbleLines, textProblems } from '../tools/text-rules';
import { changed, onChange, state, type Shown } from './state';

export const KEYS = Object.keys(EN) as TextKey[];
export const LANGS: LanguageId[] = ['en', ...LANGUAGES.filter(l => l.id !== 'en').map(l => l.id)];

const groupOf = (key: TextKey) => key.split('.')[0];
export const GROUPS = [...new Set(KEYS.map(groupOf))];

const STAGES = new Map<TextKey, BiomeId>();
const ACTORS = new Map<TextKey, ActorSpec>();
for (const c of Object.values(CUTSCENES)) {
  for (const b of c.beats) {
    const keys: TextKey[] = 'say' in b ? [b.text] : 'caption' in b ? [b.caption, ...(b.sub ? [b.sub] : [])]
      : 'card' in b ? [b.card.title, ...b.card.lines, ...(b.card.from ? [b.card.from] : [])] : [];
    for (const k of keys) STAGES.set(k, c.stage);
    const actor = 'say' in b && c.actors.find(a => a.id === (b.at ?? b.say));
    if (actor) ACTORS.set(b.text, actor);
  }
}
const anyActor = (id: string) => Object.values(CUTSCENES).flatMap(c => c.actors).find(a => a.id === id);
const stageOf = (key: TextKey): BiomeId | undefined => STAGES.get(key) ?? (groupOf(key) === 'boss' ? LEVELS.boss.biome : undefined);

const table = (lang: LanguageId) => TEXTS[lang] as Record<TextKey, string>;
export const todoIn = (lang: LanguageId, keys = KEYS) => keys.filter(k => table(lang)[k] === TODO).length;
export const groupHasTodo = (group: string) => LANGS.some(l => todoIn(l, KEYS.filter(k => groupOf(k) === group)) > 0);

const list = document.getElementById('texts')!;
const rows = new Map<TextKey, HTMLElement>();
const fields = new Map<string, HTMLTextAreaElement>();
const fieldOf = (key: TextKey, lang: LanguageId) => fields.get(`${lang}:${key}`)!;
const saving = new Map<HTMLTextAreaElement, string>();

const valueOf = (key: TextKey, lang: LanguageId) => {
  const v = fieldOf(key, lang).value.replace(/[\r\n]+/g, ' ');
  return v.trim() ? v : TODO;
};
const problemsOf = (key: TextKey) => LANGS.some(l => textProblems(key, table(l)[key]).length > 0);
const isTodo = (key: TextKey) => LANGS.some(l => table(l)[key] === TODO);
const listed = (key: TextKey, only: Shown) => (only === 'todo' ? isTodo(key) : only === 'problems' ? problemsOf(key) : true);
export const shownCount = (only: Shown) => KEYS.filter(k => listed(k, only)).length;

function status(key: TextKey, lang: LanguageId): void {
  const box = fieldOf(key, lang).nextElementSibling as HTMLElement, text = valueOf(key, lang);
  const problems = textProblems(key, text);
  const lines = SPEAKERS.has(key) && text !== TODO && !problems.length ? `${bubbleLines(text)} of ${BUBBLE.maxLines} lines` : '';
  box.textContent = [lines, ...problems].filter(Boolean).join(' · ');
  box.className = `status${problems.length ? ' bad' : ''}`;
}

async function save(key: TextKey, lang: LanguageId): Promise<void> {
  const field = fieldOf(key, lang), text = valueOf(key, lang), box = field.nextElementSibling as HTMLElement;
  if (text === table(lang)[key] || saving.get(field) === text) return;
  if (text === TODO && lang === 'en') { box.textContent = 'English needs a text'; box.className = 'status bad'; return; }
  saving.set(field, text);
  const res = await fetch('/__texts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ lang, key, text }) })
    .catch(() => undefined);
  saving.delete(field);
  if (!res?.ok) { box.textContent = `not saved: ${res ? await res.text() : 'no dev server'}`; box.className = 'status bad'; return; }
  table(lang)[key] = text;
  if (valueOf(key, lang) === text) field.classList.remove('dirty');
  for (const l of LANGS) status(key, l);
  box.textContent = 'saved';
  box.className = 'status saved';
  setTimeout(() => status(key, lang), 1200);
  changed();
}

function pick(key: TextKey, lang: LanguageId): void {
  if (state.text === key && state.lang === lang) return;
  state.text = key;
  state.lang = lang;
  state.biome = stageOf(key) ?? state.biome;
  changed();
}

const shownRows = () => KEYS.filter(k => !rows.get(k)!.hidden);
function move(key: TextKey, lang: LanguageId, by: number): void {
  const shown = shownRows(), next = shown[shown.indexOf(key) + by];
  if (next) fieldOf(next, lang).focus();
}
export function stepText(by: number): void {
  const shown = shownRows(), next = shown[(shown.indexOf(state.text) + by + shown.length) % shown.length];
  if (!next) return;
  state.text = next;
  state.biome = stageOf(next) ?? state.biome;
  rows.get(next)!.scrollIntoView({ block: 'nearest' });
}
export function goTo(group: string): void {
  const first = shownRows().find(k => groupOf(k) === group) ?? KEYS.find(k => groupOf(k) === group)!;
  state.text = first;
  state.biome = stageOf(first) ?? state.biome;
  document.getElementById(`texts-${group}`)?.scrollIntoView({ block: 'start' });
}

function build(): void {
  const head = document.createElement('div');
  head.className = 'text head';
  head.append(...['', ...LANGS.map(languageName)].map(name => Object.assign(document.createElement('div'), { textContent: name })));
  list.append(head, Object.assign(document.createElement('div'), { id: 'texts-none' }));
  let group = '';
  for (const key of KEYS) {
    if (groupOf(key) !== group) {
      group = groupOf(key);
      list.append(Object.assign(document.createElement('h3'), { id: `texts-${group}`, textContent: group }));
    }
    const row = document.createElement('div');
    row.className = 'text';
    const about = document.createElement('div');
    about.className = 'key';
    about.textContent = key;
    const who = SPEAKERS.get(key);
    if (who) about.append(Object.assign(document.createElement('div'), { className: 'who', textContent: EN[CHARACTERS[who].name] }));
    if (who) (about.lastChild as HTMLElement).style.color = css(CHARACTERS[who].color);
    row.append(about);
    for (const lang of LANGS) {
      const cell = document.createElement('div');
      const field = document.createElement('textarea');
      field.spellcheck = false;
      field.placeholder = TODO;
      field.value = table(lang)[key] === TODO ? '' : table(lang)[key];
      fields.set(`${lang}:${key}`, field);
      field.addEventListener('focus', () => pick(key, lang));
      field.addEventListener('input', () => { field.classList.toggle('dirty', valueOf(key, lang) !== table(lang)[key]); for (const l of LANGS) status(key, l); changed(); });
      field.addEventListener('blur', () => void save(key, lang));
      field.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); void save(key, lang); move(key, lang, e.shiftKey ? -1 : 1); }
        else if (e.key === 'Escape') {
          field.value = table(lang)[key] === TODO ? '' : table(lang)[key];
          field.classList.remove('dirty');
          for (const l of LANGS) status(key, l);
          field.blur();
          changed();
        }
      });
      cell.append(field, Object.assign(document.createElement('div'), { className: 'status' }));
      row.append(cell);
    }
    rows.set(key, row);
    list.append(row);
    for (const lang of LANGS) status(key, lang);
  }
}

function sync(): void {
  const on = state.view === 'texts';
  document.body.classList.toggle('texts', on);
  if (!on) return;
  if (!rows.size) build();
  // by the saved texts, so a row doesn't vanish while it's typed in
  const typedIn = document.activeElement instanceof HTMLTextAreaElement ? document.activeElement.closest('.text') : null;
  for (const [key, row] of rows) {
    row.hidden = row !== typedIn && !listed(key, state.only);
    row.classList.toggle('on', key === state.text);
  }
  const none = document.getElementById('texts-none')!;
  none.hidden = KEYS.some(k => !rows.get(k)!.hidden);
  none.textContent = state.only === 'todo' ? 'Nothing is TODO.' : 'No text has a problem.';
  for (const group of GROUPS) {
    const h = document.getElementById(`texts-${group}`)!;
    h.hidden = KEYS.every(k => groupOf(k) !== group || rows.get(k)!.hidden);
  }
}
export const initTexts = () => onChange(sync);

const SAMPLES: Record<string, string> = {
  side: 'touch.left', height: 'touch.high', key: 'key.jump', count: '10', items: 'item.feather.many', move: 'move.peck', s: '4',
  help: 'hud.help.jump', n: '1', of: '3', level: 'level.l1',
};
const filled = (text: string): string =>
  text.replace(PLACEHOLDER, (m, k: string) => { const v = SAMPLES[k]; return v === undefined ? m : v in EN ? filled(t(v as TextKey)) : v; });

export function showText(scene: Phaser.Scene): void {
  const key = state.text, text = filled(valueOf(key, state.lang)), was = language();
  chooseLanguage(state.lang, false);
  const who = SPEAKERS.get(key);
  if (who) {
    const spec = ACTORS.get(key) ?? anyActor(who), x = GAME_W / 2;
    let at: Anchor = { x, top: GROUND_Y - 40, bottom: GROUND_Y };
    if (spec) {
      const feet = spec.y ?? GROUND_Y, scale = spec.scale ?? 1;
      const s = scene.add.sprite(x, feet, spec.texture).setOrigin(0.5, 1).setFlipX(!!spec.flip).setScale(scale).setDepth(10);
      if (spec.anim) s.play(spec.anim);
      const heads = HEADS[spec.texture], head = heads && (heads[who] ?? Object.values(heads)[0]);
      at = head ? { x: Math.round(x + (spec.flip ? -head.x : head.x) * scale), top: Math.round(feet - head.top * scale), bottom: feet }
        : { x, top: feet - s.displayHeight, bottom: feet };
    }
    const bubble = new SpeechBubble(scene);
    void bubble.say(CHARACTERS[who], text, at);
    bubble.complete();
  } else {
    const lines = wrapText(parseStrikes(text).plain, GAME_W - 40), y = Math.round(GAME_H / 2 - (lines.length * LINE_H) / 2);
    const w = Math.max(...lines.map(l => textWidth(l)));
    scene.add.rectangle(GAME_W / 2, y - 6, w + 16, lines.length * LINE_H + 8, UI.panel, 0.94).setOrigin(0.5, 0).setDepth(20);
    lines.forEach((line, i) => label(scene, GAME_W / 2, y + i * LINE_H, line, { origin: [0.5, 0] }).setDepth(21));
  }
  chooseLanguage(was, false);
}
