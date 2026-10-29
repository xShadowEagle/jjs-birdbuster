import type Phaser from 'phaser';
import type { BiomeId } from '../src/world/biomes';
import { ASSETS, BUTTON_SETS, animsOf, drafts, nameOf, setsOf, versionsOf } from './catalog';
import { ATTACKS, CREATURES, TARGETS, familyOf, kindTitle, type Family, type Foe } from './foes';
import { SOUNDS, SOUND_GROUPS, showSound } from './sounds';
import { GROUPS, KEYS, LANGS, goTo, groupHasTodo, showText, shownCount, stepText, todoIn } from './texts';
import { languageName } from '../src/language';
import {
  BIOME_IDS, POSES, PRESS, SHOWN, SWING_ICONS, VIEW_IDS, asset, benchImages, changed, countVersionsWith, inPlace, onChange, oneAtATime, pickImage,
  state, type View,
} from './state';
import { lineUp, sheets } from './views/images';
import { showBreaks, showInterface } from './views/interface';
import { AttacksRun, EnemiesRun, type RunView } from './views/run';

const panel = document.getElementById('panel')!;
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text = '', parent: HTMLElement = panel) => {
  const e = document.createElement(tag);
  e.textContent = text;
  parent.append(e);
  return e;
};
const select = (options: [string, string][], value: string, onPick: (v: string) => void) => {
  const s = el('select');
  for (const [v, text] of options) s.add(new Option(text, v, false, v === value));
  s.addEventListener('change', () => { onPick(s.value); s.blur(); changed(); });
};
type Button = [string, boolean, () => void];
const buttons = (items: Button[]) => {
  const row = el('div');
  row.className = 'row';
  for (const [text, on, fn] of items) {
    const b = el('button', text, row);
    if (on) b.className = 'on';
    b.addEventListener('click', () => { fn(); b.blur(); changed(); });
  }
};
const versionButtons = (names: string[]) => {
  el('h2', `Versions (${names.length})`);
  buttons(names.map((name, i) => [name, i === state.pick, () => { state.pick = i; }]));
};
const kindButtons = (f: Family, shown: Foe | '', pick: (s: Foe) => void) =>
  buttons(f.kinds.map(([s, name]) => [name, shown === s, () => pick(s)]));

const step = <T>(list: T[], at: number, by: number) => list[(at + by + list.length) % list.length];
const nextFamily = (list: Family[], foe: Foe | '', by: number) => step(list, list.indexOf(familyOf(list, foe)), by).kinds[0]?.[0] ?? '';
const nextKind = (list: Family[], foe: Foe | '') => {
  const kinds = familyOf(list, foe).kinds;
  return kinds.length < 2 ? undefined : step(kinds, kinds.findIndex(([s]) => s === foe), 1)[0];
};

function imagePanel(pickable: boolean): void {
  const a = asset(), versions = versionsOf(a);
  if (a.frame) {
    el('h2', 'Animation');
    select(animsOf(a).map(k => [k, k]), state.anim, k => { state.anim = k; });
  }
  if (pickable) versionButtons(versions.map(x => x.name));
  else {
    el('h2', `Versions (${versions.length})`);
    for (const x of versions) el('div', x.name);
  }
}
const runSets = () => setsOf(benchImages());

type Key = [hint: string, act: () => boolean];
interface ViewDef {
  name: string;
  upDown?: [hint: string, step: (by: number) => void];
  keyA?: Key;
  keyW?: Key;
  zoom?: true;
  space?: 'Run' | 'Play';
  moreKeys?: [string, string][];
  versions?: () => string[];
  aboveBiome?: () => void;
  panel?: () => void;
  title: (version: string) => string;
  show?: (scene: Phaser.Scene, again: () => void) => void;
  run?: (scene: Phaser.Scene) => RunView;
}

const IMAGE_VIEW: Partial<ViewDef> = {
  upDown: ['Image', by => pickImage(step(ASSETS, ASSETS.findIndex(x => x.file === state.image), by).file)],
  keyA: ['Animation', () => {
    const a = asset();
    if (!a.frame) return false;
    const anims = animsOf(a);
    state.anim = step(anims, anims.indexOf(state.anim), 1);
    return true;
  }],
  zoom: true,
  space: 'Run',
  versions: () => versionsOf(asset()).map(v => v.name),
  aboveBiome: () => {
    el('h2', 'Image');
    select(ASSETS.map(x => [x.file, `${drafts.has(x.file) ? '● ' : ''}${nameOf(x)}`]), state.image, pickImage);
  },
};

export const VIEWS: Record<View, ViewDef> = {
  scene: {
    ...IMAGE_VIEW,
    name: 'Scene',
    panel: () => imagePanel(inPlace() || oneAtATime(versionsOf(asset()))),
    title: version => `${asset().file}${inPlace() ? `  -  ${version}` : ''}`,
    show: scene => { if (!inPlace()) lineUp(scene, asset(), versionsOf(asset())); },
  },
  sheet: {
    ...IMAGE_VIEW,
    name: 'Sheet',
    panel: () => imagePanel(false),
    title: () => asset().file,
    show: scene => sheets(scene, versionsOf(asset())),
  },
  breaks: { name: 'Breaks', space: 'Run', title: () => 'Breaks', show: showBreaks },
  interface: {
    name: 'Interface',
    space: 'Run',
    versions: () => BUTTON_SETS,
    panel: () => {
      el('h2', 'Buttons');
      buttons(PRESS.map(p => [p, state.press === p, () => { state.press = p; }]));
      el('h2', 'Attack');
      buttons(SWING_ICONS.map(s => [s, state.swing === s, () => { state.swing = s; }]));
      versionButtons(BUTTON_SETS);
    },
    title: version => `Interface  -  ${version}`,
    show: showInterface,
  },
  enemies: {
    name: 'Enemies',
    upDown: ['Enemy', by => { state.foe = nextFamily(CREATURES, state.foe, by) || state.foe; }],
    keyW: ['Attack', () => {
      const kind = nextKind(CREATURES, state.foe);
      if (kind) state.foe = kind;
      return !!kind;
    }],
    versions: runSets,
    panel: () => {
      const family = familyOf(CREATURES, state.foe);
      el('h2', 'Enemy');
      buttons(CREATURES.map(f => [f.name, f === family, () => { state.foe = f.kinds[0][0]; }]));
      el('h2', 'Attack');
      kindButtons(family, state.foe, s => { state.foe = s; });
      versionButtons(runSets());
      el('h2', 'Bird');
      buttons([
        ...POSES.map(p => [p, state.pose === p, () => { state.pose = p; }] as Button),
        ['Hitboxes', state.boxes, () => { state.boxes = !state.boxes; }],
      ]);
    },
    title: version => `${kindTitle(CREATURES, state.foe)}  -  ${version}`,
    run: scene => new EnemiesRun(scene),
  },
  attacks: {
    name: 'Attacks',
    upDown: ['Target', by => { state.target = nextFamily(TARGETS, state.target, by); }],
    keyA: ['Attack', () => {
      state.attack = step(ATTACKS, ATTACKS.findIndex(([k]) => k === state.attack), 1)[0];
      return true;
    }],
    keyW: ['Enemy Attack', () => {
      const kind = nextKind(TARGETS, state.target);
      if (kind) state.target = kind;
      return !!kind;
    }],
    versions: runSets,
    panel: () => {
      el('h2', 'Attack');
      buttons(ATTACKS.map(([k, name]) => [name, state.attack === k, () => { state.attack = k; }]));
      const family = familyOf(TARGETS, state.target);
      el('h2', 'Target');
      buttons(TARGETS.map(f => [f.name, f === family, () => { state.target = f.kinds[0]?.[0] ?? ''; }]));
      if (family.kinds.length > 1) {
        el('h2', 'Enemy Attack');
        kindButtons(family, state.target, s => { state.target = s; });
      }
      versionButtons(runSets());
      el('h2', 'Bird');
      buttons([
        ['Hitboxes', state.boxes, () => { state.boxes = !state.boxes; }],
        ['Sound', state.sound, () => { state.sound = !state.sound; }],
      ]);
    },
    title: version => `${ATTACKS.find(([k]) => k === state.attack)![1]}${state.target ? ` at ${kindTitle(TARGETS, state.target)}` : ''}  -  ${version}`,
    run: scene => new AttacksRun(scene),
  },
  sounds: {
    name: 'Sounds',
    upDown: ['Sound', by => { state.sfx = step(SOUNDS, SOUNDS.findIndex(([name]) => name === state.sfx), by)[0]; }],
    space: 'Play',
    panel: () => {
      for (const [group, sounds] of SOUND_GROUPS) {
        el('h2', group);
        buttons(sounds.map(([name]) => [name, state.sfx === name, () => { state.sfx = name; }]));
      }
    },
    title: () => `Sounds  -  ${state.sfx}`,
    show: (scene, again) => showSound(scene, state.sfx, again),
  },
  texts: {
    name: 'Texts',
    upDown: ['Text', stepText],
    space: 'Run',
    moreKeys: [['Field:', ''], ['Save, next', 'Enter'], ['Save, back', 'Shift Enter'], ['Undo', 'Esc']],
    panel: () => {
      el('h2', 'Translated');
      for (const l of LANGS.filter(l => l !== 'en')) el('div', `${languageName(l)}: ${KEYS.length - todoIn(l)} of ${KEYS.length}`);
      el('h2', 'Show');
      buttons(SHOWN.map(([k, name]) => [`${name} ${shownCount(k)}`, state.only === k, () => { state.only = k; }]));
      el('h2', 'Jump (● TODO)');
      buttons(GROUPS.map(g => [`${groupHasTodo(g) ? '● ' : ''}${g}`, false, () => goTo(g)]));
    },
    title: () => `${state.text}  -  ${languageName(state.lang)}`,
    show: showText,
  },
};
const versionCount = () => VIEWS[state.view].versions?.().length ?? 1;

const keysOf = (view: ViewDef) => [
  ...(view.upDown ? [[view.upDown[0], '↑ ↓']] : []),
  ['Biome', '← →'],
  ...(view.keyA ? [[view.keyA[0], 'A']] : []),
  ...(view.keyW ? [[view.keyW[0], 'W']] : []),
  ...(view.versions ? [['Version', 'Q E']] : []),
  ...(view.zoom ? [['Size', '1-4']] : []),
  ['View', 'V'],
  ...(view.space ? [[view.space, 'Space']] : []),
  ...(view.moreKeys ?? []),
] as [string, string][];

function render(): void {
  panel.replaceChildren();
  const v = state.view, view = VIEWS[v];
  const title = el('h1', 'Workbench  ');
  Object.assign(el('a', 'Game ↗', title), { href: '../', target: 'birdbuster-game' });
  view.aboveBiome?.();
  el('h2', 'Biome');
  select(BIOME_IDS.map(b => [b, b]), state.biome, b => { state.biome = b as BiomeId; });
  view.panel?.();
  el('h2', 'View');
  for (let i = 0; i < VIEW_IDS.length; i += 2) buttons(VIEW_IDS.slice(i, i + 2).map(id => [VIEWS[id].name, v === id, () => { state.view = id; state.pick = 0; }]));
  buttons([
    ...(view.space === 'Run' ? [[state.run ? 'Running' : 'Still', state.run, () => { state.run = !state.run; }] as Button] : []),
    ...(view.zoom ? [1, 2, 3, 4].map(z => [`${z}x`, state.zoom === z, () => { state.zoom = z; }] as Button) : []),
  ]);
  const keys = keysOf(view), width = Math.max(...keys.map(([what]) => what.length)) + 2;
  el('div', keys.map(([what, key]) => what.padEnd(width) + key).join('\n')).className = 'hint';
}

/** The panel lists the keys that do something in a view: keysOf. */
function onKey(e: KeyboardEvent): void {
  const typing = document.activeElement instanceof HTMLSelectElement || document.activeElement instanceof HTMLTextAreaElement;
  if (typing || e.ctrlKey || e.altKey || e.metaKey) return;
  const v = state.view, view = VIEWS[v];
  switch (e.key) {
    case 'ArrowDown': case 'ArrowUp': if (!view.upDown) return; view.upDown[1](e.key === 'ArrowDown' ? 1 : -1); break;
    case 'ArrowRight': case 'ArrowLeft': state.biome = step(BIOME_IDS, BIOME_IDS.indexOf(state.biome), e.key === 'ArrowRight' ? 1 : -1); break;
    case 'a': case 'A': if (!view.keyA?.[1]()) return; break;
    case 'w': case 'W': if (!view.keyW?.[1]()) return; break;
    case 'q': case 'Q': case 'e': case 'E': {
      const n = versionCount();
      state.pick = (state.pick + (e.key.toLowerCase() === 'e' ? 1 : -1) + n) % n;
      break;
    }
    case 'v': case 'V': state.view = VIEW_IDS[(VIEW_IDS.indexOf(v) + 1) % VIEW_IDS.length]; state.pick = 0; break;
    case ' ': if (!view.space) return; if (view.space === 'Run') state.run = !state.run; break;
    case '1': case '2': case '3': case '4': if (!view.zoom) return; state.zoom = Number(e.key); break;
    default: return;
  }
  e.preventDefault();
  changed();
}

export function initPanel(): void {
  countVersionsWith(versionCount);
  render();
  onChange(render);
  window.addEventListener('keydown', onKey);
}
