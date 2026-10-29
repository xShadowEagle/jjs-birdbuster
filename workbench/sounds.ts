import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../src/constants';
import { label } from '../src/ui/text';
import { UI } from '../src/ui/colors';
import { TONES, play, withDefaults, type Tone } from '../src/audio/sfx';
import { CHARACTERS, type CharacterId } from '../src/story/characters';
import { CPS } from '../src/ui/SpeechBubble';
import { EN } from '../src/texts/en';

type SoundEntry = [string, () => Tone[]];
/** `gap`: s */
const repeat = (n: number, gap: number, tones: (i: number) => Tone[]): Tone[] =>
  Array.from({ length: n }, (_, i) => tones(i).map(t => ({ ...t, at: (t.at ?? 0) + i * gap }))).flat();
export const SOUND_GROUPS: [string, SoundEntry[]][] = [
  ['Moves', [
    ['Jump', () => TONES.jump()], ['DoubleJump', () => TONES.jump(true)], ['Land', TONES.land],
    ['Peck', TONES.peck], ['Cleave', TONES.cleave], ['Dash', TONES.dash], ['RainbowCleave', TONES.rainbowCleave], ['RainbowDash', TONES.rainbowDash],
  ]],
  ['Hits', [['Bonk', TONES.bonk], ['Clang', TONES.clang], ['Hurt', TONES.hurt]]],
  ['Bosses', [['Pound', TONES.pound], ['Burst', TONES.burst], ['Gift', TONES.gift]]],
  ['Items / End', [['Pickup', () => TONES.pickup()], ['Pickups', () => repeat(6, 0.12, TONES.pickup)], ['Clear', TONES.clear], ['Fail', TONES.fail]]],
  ['Menu / Story', [
    ['Click', TONES.click], ['Pop', TONES.pop], ['Whoosh', TONES.whoosh],
    ...(Object.keys(CHARACTERS) as CharacterId[]).map(id => [`Voice: ${EN[CHARACTERS[id].name]}`,() => repeat(8, 2 / CPS, () => TONES.voice(CHARACTERS[id].voice))] as SoundEntry),
  ]],
];
export const SOUNDS = SOUND_GROUPS.flatMap(([, sounds]) => sounds);
const WAVES: Record<OscillatorType, number> = { square: UI.gold, triangle: 0x4ab4ff, sawtooth: 0xff6a6a, sine: 0xffffff, custom: UI.dim };
const PLOT = { x0: 30, x1: GAME_W - 14, y0: 26, y1: GAME_H - 34, secs: 0.8, fLow: 50, fHigh: 4000 };

export function showSound(scene: Phaser.Scene, name: string, again: () => void): void {
  const { x0, x1, y0, y1, secs, fLow, fHigh } = PLOT;
  const xOf = (s: number) => Math.round(x0 + (s / secs) * (x1 - x0));
  const yOf = (f: number) => Math.round(y1 - (Math.log(f / fLow) / Math.log(fHigh / fLow)) * (y1 - y0));
  scene.add.rectangle(0, 0, GAME_W, GAME_H, UI.bg, 0.92).setOrigin(0).setDepth(30)
    .setInteractive().on(Phaser.Input.Events.POINTER_DOWN, again);
  const g = scene.add.graphics().setDepth(31);
  for (let i = 0; i <= secs * 10; i++) {
    g.fillStyle(UI.trough).fillRect(xOf(i / 10), y0, 1, y1 - y0 + 1);
    label(scene, xOf(i / 10), y1 + 4, i ? (i / 10).toFixed(1) : '0', { origin: [0.5, 0], color: UI.dim }).setDepth(31);
  }
  for (const f of [100, 250, 500, 1000, 2000, 4000]) {
    g.fillStyle(UI.trough).fillRect(x0, yOf(f), x1 - x0 + 1, 1);
    label(scene, x0 - 4, yOf(f), f < 1000 ? String(f) : `${f / 1000}k`, { origin: [1, 0.5], color: UI.dim }).setDepth(31);
  }
  const tones = SOUNDS.find(([n]) => n === name)![1]();
  let end = 0;
  for (const { f0, f1, dur, type, vol, at } of tones.map(withDefaults)) {
    const from = xOf(at), to = Math.max(from, xOf(at + dur)), thick = vol >= 0.06 ? 3 : vol >= 0.03 ? 2 : 1;
    let last = yOf(f0);
    for (let x = from; x <= to; x++) {
      const k = to > from ? (x - from) / (to - from) : 0, y = yOf(f0 * (f1 / f0) ** k);
      const top = Math.min(y, last) - (thick >> 1), h = Math.abs(y - last) + thick;
      g.fillStyle(WAVES[type], 1 - 0.75 * k).fillRect(x, top, 1, h);
      last = y;
    }
    end = Math.max(end, at + dur);
  }
  let lx = x0;
  for (const type of ['square', 'triangle', 'sawtooth', 'sine'] as const) {
    lx += label(scene, lx, GAME_H - 12, type, { color: WAVES[type] }).setDepth(31).textW + 10;
  }
  label(scene, x1, GAME_H - 12, `${end.toFixed(2)} s`, { origin: [1, 0], color: UI.text }).setDepth(31);
  const head = scene.add.rectangle(x0, y0, 1, y1 - y0 + 1, UI.text, 0.6).setOrigin(0).setDepth(32);
  scene.tweens.add({ targets: head, x: xOf(end), duration: end * 1000, onComplete: () => head.destroy() });
  play(tones);
}
