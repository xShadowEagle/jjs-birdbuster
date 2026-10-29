import { EN } from '../texts/en';
import type Phaser from 'phaser';
import { FLOW, restartAt, type FlowScene } from '../story/flow';
import { LEVELS, type LevelId } from '../levels';
import { LIME_PARTS, type LimePart } from '../entities/enemies/Lime';
import { SCENES } from '../scenes/keys';
import type Level from '../scenes/Level';
import { css, UI } from '../ui/colors';
import { isTouchScreen } from '../device';
import { autopilot, holdCutscene, holdLevel, playLevels, progress, release, runChecks, type Check, type LevelRun } from './playtest';
import type { CutsceneId } from '../story/cutscenes';
import type { Beat } from '../story/cutscene';

// Toggle: F2, the key left of 1 (by position, on any layout) or the tab on the left edge.
// Phones and tablets get it only with `?dev` in the address.

const OPEN_KEY = 'jjs-dev-open';
const W = 220;

let game: Phaser.Game;
let hitboxes = false;
let god = false;
let autoplay = false;

declare global {
  interface Window {
    playtest?: {
      levels(ids?: LevelId[]): LevelRun[];
      checks(): Check[];
      cutscene(id: CutsceneId, stop: (beat: Beat) => boolean, extra?: number): Promise<string>;
      level(id: LevelId, stop: (level: Level) => boolean, maxSecs?: number): string;
      release(): void;
    };
  }
}

const idName = (id: string) => id.split('-').map(w => (/^l\d$/.test(w) ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1))).join('-');

function activeLevel(): Level | null {
  const l = game.scene.getScene(SCENES.Level) as Level;
  return l && (l.sys.isActive() || l.sys.isPaused()) ? l : null;
}

function activeKeys(): string[] {
  return game.scene.getScenes(false).filter(s => s.sys.isActive() || s.sys.isPaused()).map(s => s.scene.key);
}

/** -1: not in the story */
function currentStep(): number {
  const keys = activeKeys(), key = [SCENES.Level, SCENES.Cutscene, SCENES.Credits].find(k => keys.includes(k));
  return key ? game.scene.getScene<FlowScene>(key).step : -1;
}

function applyAutoplay(level: Level | null): void {
  if (!level) return;
  if (autoplay && !level.controls.driver) level.controls.driver = autopilot(level);
  else if (!autoplay) level.controls.driver = undefined;
}

function applyHitboxes(level: Level | null): void {
  const w = level?.physics?.world;
  if (!w) return;
  if (hitboxes && !w.debugGraphic) w.createDebugGraphic();
  w.drawDebug = hitboxes;
  w.debugGraphic?.clear().setVisible(hitboxes);
}

export function initDevSidebar(g: Phaser.Game): void {
  if (isTouchScreen() && !new URLSearchParams(location.search).has('dev')) return;
  game = g;
  const panel = document.createElement('div');
  const tab = document.createElement('button');
  Object.assign(panel.style, {
    position: 'fixed', left: '0', top: '0', bottom: '0', width: `${W}px`, overflowY: 'auto', zIndex: '5',
    background: 'rgba(26, 16, 32, 0.92)', color: css(UI.text), font: '11px/1.35 ui-monospace, Consolas, monospace',
    padding: '8px', boxSizing: 'border-box', borderRight: `1px solid ${css(UI.trough)}`,
  });
  Object.assign(tab.style, {
    position: 'fixed', left: '0', top: '8px', zIndex: '5', padding: '4px 6px', cursor: 'pointer',
    background: css(UI.panel), color: css(UI.gold), border: `1px solid ${css(UI.trough)}`, borderLeft: 'none',
    font: '10px ui-monospace, Consolas, monospace', borderRadius: '0 4px 4px 0',
  });
  tab.textContent = 'DEV';
  tab.title = 'Dev Sidebar (F2)';
  document.body.append(panel, tab);

  // the game listens for touches on the whole page
  for (const el of [panel, tab]) {
    for (const type of ['touchstart', 'touchmove', 'touchend', 'pointerdown', 'pointerup', 'mousedown', 'mouseup']) {
      el.addEventListener(type, e => e.stopPropagation());
    }
  }

  let open = true;
  try { open = localStorage.getItem(OPEN_KEY) !== '0'; } catch {}
  const box = document.getElementById('game')!;
  const setOpen = (o: boolean) => {
    open = o;
    panel.style.display = o ? 'block' : 'none';
    tab.style.display = o ? 'none' : 'block';
    Object.assign(box.style, o ? { marginLeft: `${W}px`, width: `calc(100% - ${W}px)` } : { marginLeft: '', width: '' });
    window.dispatchEvent(new Event('resize'));
    try { localStorage.setItem(OPEN_KEY, o ? '1' : '0'); } catch {}
  };
  tab.addEventListener('click', () => setOpen(true));
  window.addEventListener('keydown', e => {
    if (e.code === 'F2' || e.code === 'Backquote') { e.preventDefault(); setOpen(!open); }
  });

  const section = (title: string) => {
    const h = document.createElement('div');
    h.textContent = title;
    Object.assign(h.style, { color: css(UI.gold), margin: '10px 0 4px', letterSpacing: '1px', fontSize: '10px' });
    panel.append(h);
    const box = document.createElement('div');
    Object.assign(box.style, { display: 'flex', flexWrap: 'wrap', gap: '3px' });
    panel.append(box);
    return box;
  };
  const button = (box: HTMLElement, text: string, onClick: () => void, full = false) => {
    const b = document.createElement('button');
    b.textContent = text;
    Object.assign(b.style, {
      font: 'inherit', color: css(UI.text), background: '#2a2036', border: `1px solid ${css(UI.trough)}`,
      borderRadius: '3px', padding: '2px 5px', cursor: 'pointer', textAlign: 'left', width: full ? '100%' : 'auto',
    });
    // blur afterwards, or Space in the game would press the button again
    b.addEventListener('click', () => { onClick(); b.blur(); });
    box.append(b);
    return b;
  };
  const toggle = (box: HTMLElement, name: string, flip: () => boolean) => {
    const b = button(box, `${name}: Off`, () => { b.textContent = `${name}: ${flip() ? 'On' : 'Off'}`; });
  };

  const head = document.createElement('div');
  Object.assign(head.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'center' });
  head.innerHTML = `<b style="color:${css(UI.gold)}">DEV</b>`;
  const hide = document.createElement('button');
  hide.textContent = '‹ Hide (F2)';
  Object.assign(hide.style, { font: 'inherit', color: css(UI.dim), background: 'none', border: 'none', cursor: 'pointer' });
  hide.addEventListener('click', () => setOpen(false));
  head.append(hide);
  panel.append(head);

  const jump = section('Jump');
  button(jump, 'Title', () => restartAt(game, -1), true);
  const stepButtons = FLOW.map((s, i) => {
    const name = s.kind === 'level' ? `${idName(s.id)} · ${EN[LEVELS[s.id].name]}` : s.kind === 'cutscene' ? `Cutscene · ${idName(s.id)}` : 'Credits';
    return button(jump, `${String(i).padStart(2)} ${name}`, () => restartAt(game, i), true);
  });

  const bossStep = FLOW.findIndex(s => s.kind === 'level' && LEVELS[s.id].bosses), bossEntry = FLOW[bossStep];
  const bossRows = section('Bosses');
  Object.assign(bossRows.style, { flexDirection: 'column' });
  const row = () => { const r = document.createElement('div'); Object.assign(r.style, { display: 'flex', gap: '3px' }); bossRows.append(r); return r; };
  const firsts = row();
  (bossEntry.kind === 'level' ? LEVELS[bossEntry.id].bosses ?? [] : []).forEach(({ rival }, i) => {
    const start = (part?: LimePart) => restartAt(game, bossStep, { from: { boss: i, part } });
    if (rival === 'lime') { const r = row(); LIME_PARTS.forEach((p, n) => button(r, `Lime-P${n + 1}`, () => start(p))); }
    else button(firsts, rival[0].toUpperCase() + rival.slice(1), () => start());
  });

  const level = section('Level');
  button(level, 'Clear', () => activeLevel()?.dev.clear());
  button(level, 'Restart', () => activeLevel()?.restartStage());
  button(level, 'Hurt', () => activeLevel()?.hurt());
  button(level, 'Drop Item', () => activeLevel()?.dev.drop());
  toggle(level, 'God', () => { god = !god; const l = activeLevel(); if (l) l.god = god; return god; });
  button(level, 'Next Step', () => {
    const cur = currentStep();
    if (cur >= 0) restartAt(game, cur + 1);
  });

  const debug = section('Debug');
  toggle(debug, 'Hitboxes', () => { hitboxes = !hitboxes; applyHitboxes(activeLevel()); return hitboxes; });
  button(debug, 'Workbench ↗', () => window.open('workbench/', 'birdbuster-workbench'));

  const test = section('Test');
  const results = document.createElement('div');
  Object.assign(results.style, { width: '100%', marginTop: '3px' });
  const run = (what: () => { ok: boolean; text: string }[]) => {
    results.textContent = 'Running...';
    setTimeout(() => {
      const t0 = performance.now(), lines = what(), failed = lines.filter(l => !l.ok).length;
      results.replaceChildren(...lines.map(({ ok, text }) => {
        const d = document.createElement('div');
        d.textContent = `${ok ? '✓' : '✗'} ${text}`;
        d.style.color = css(ok ? UI.dim : UI.hp);
        return d;
      }));
      const sum = document.createElement('div');
      sum.textContent = `${lines.length - failed} OK, ${failed} Failed · ${((performance.now() - t0) / 1000).toFixed(1)} s`;
      sum.style.color = css(failed ? UI.hp : UI.gold);
      results.prepend(sum);
    }, 30);
  };
  button(test, 'Play Levels', () => run(() => playLevels(game, currentStep()).map(r => ({ ok: r.ok, text: r.line }))));
  button(test, 'Checks', () => run(() => runChecks(game, currentStep()).map(c => ({ ok: c.ok, text: c.ok ? c.name : `${c.name}: ${c.detail}` }))));
  toggle(test, 'Autoplay', () => { autoplay = !autoplay; applyAutoplay(activeLevel()); return autoplay; });
  test.append(results);
  window.playtest = {
    levels: ids => playLevels(game, currentStep(), ids),
    checks: () => runChecks(game, currentStep()),
    cutscene: (id, stop, extra) => holdCutscene(game, id, stop, extra),
    level: (id, stop, maxSecs) => holdLevel(game, id, stop, maxSecs),
    release,
  };

  section('Status');
  const status = document.createElement('pre');
  Object.assign(status.style, { margin: '0', font: 'inherit', color: css(UI.dim), whiteSpace: 'pre-wrap' });
  panel.append(status);
  let lastLevel: Level | null = null;
  window.setInterval(() => {
    // each new level has a new physics world and controls: these carry over, with the panel open or not
    const l = activeLevel();
    if (l !== lastLevel || (l && l.sys.isActive() && hitboxes && !l.physics.world.drawDebug)) applyHitboxes(l);
    if (l) l.god = god;
    applyAutoplay(l);
    lastLevel = l;
    if (!open) return;
    const step = currentStep();
    stepButtons.forEach((b, i) => { b.style.borderColor = i === step ? css(UI.gold) : css(UI.trough); });
    const lines = [`Scenes  ${activeKeys().join(' ') || '-'}`, `FPS     ${game.loop.actualFps.toFixed(0)}`];
    if (l) {
      const p = l.player;
      lines.push(
        `Level   ${idName(l.id)} ${EN[l.def.name]}${l.scene.isPaused() ? ' (paused)' : ''}`,
        `Phase   ${l.phase}`,
        `Goal    ${progress(l)}${l.def.goal ? ` ${l.def.goal.item}` : ''}`,
        `Hearts  ${l.def.lives ? `${l.lives}/${l.def.lives}${god ? ' (god)' : ''}` : '-'}`,
        `Time    ${l.elapsed.toFixed(2)}`,
        `Bird    ${Math.round(p.x)}, ${Math.round(p.y)}${p.isSliding ? ' sliding' : ''}`,
        `Enemies ${l.dev.enemies().length}`,
        `Speed   ${Math.round(p.body.velocity.x)}, ${Math.round(p.body.velocity.y)}`,
      );
    }
    status.textContent = lines.join('\n');
  }, 200);

  setOpen(open);
}
