import Phaser from 'phaser';
import { isSoundMuted } from './settings';

// Through Phaser's sound manager, so mute, the master volume and the mobile audio unlock apply.

const SFX_GAIN = 5;

export const webAudio = (g: Phaser.Game | null): Phaser.Sound.WebAudioSoundManager | null =>
  (g?.sound instanceof Phaser.Sound.WebAudioSoundManager ? g.sound : null);

let manager: Phaser.Sound.WebAudioSoundManager | null = null;

export function initSfx(g: Phaser.Game): void {
  manager = webAudio(g);
  // iOS can leave the audio suspended after a call or a screen lock; only a tap or a key may resume it
  for (const type of ['touchend', 'mousedown', 'keydown']) {
    document.addEventListener(type, () => {
      const ctx = manager?.context;
      if (ctx && !manager!.locked && ctx.state !== 'running') void ctx.resume().catch(() => undefined);
    });
  }
}

/** `f0`, `f1`: Hz. `dur`, `at`: s. */
export interface Tone { f0: number; f1?: number; dur: number; type?: OscillatorType; vol?: number; at?: number }

const TONE_DEFAULTS = { type: 'square', vol: 0.08, at: 0 } as const;

export const withDefaults = ({ f0, f1 = f0, dur, type = TONE_DEFAULTS.type, vol = TONE_DEFAULTS.vol, at = TONE_DEFAULTS.at }: Tone): Required<Tone> =>
  ({ f0, f1, dur, type, vol, at });

export function play(tones: Tone[]): void {
  if (!manager || isSoundMuted() || manager.locked || manager.context.state !== 'running') return;   // suspended, they'd all play at once on its return
  const ctx = manager.context;
  for (const { f0, f1, dur, type, vol, at } of tones.map(withDefaults)) {
    const t = ctx.currentTime + at;
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
    gain.gain.setValueAtTime(vol * SFX_GAIN, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(manager.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }
}

const PENTA = [0, 2, 4, 7, 9];
const note = (step: number) => 660 * 2 ** ((Math.floor(step / 5) * 12 + PENTA[step % 5]) / 12);

const rainbow = (step: number, gap: number, at = 0, vol = 0.03): Tone[] =>
  Array.from({ length: 6 }, (_, i) => ({ f0: note(step + i), dur: 0.14, type: 'triangle', vol, at: at + i * gap }));
const chord = (at: number, vol = 0.018): Tone[] => [1047, 1319, 1568, 2093].map(f0 => ({ f0, dur: 0.45, type: 'triangle', vol, at }));
const twinkle = (at: number, n: number, vol = 0.015): Tone[] =>
  Array.from({ length: n }, (_, i) => ({ f0: note(i % 2 ? 12 : 10), dur: 0.05, type: 'triangle', vol, at: at + i * 0.04 }));

const DASH: Tone[] = [{ f0: 180, f1: 900, dur: 0.18, type: 'sawtooth', vol: 0.04 }, { f0: 2400, f1: 1200, dur: 0.1, type: 'triangle', vol: 0.03, at: 0.02 }];
const CLEAVE: Tone[] = [{ f0: 2200, f1: 500, dur: 0.12, type: 'sawtooth', vol: 0.03 }, { f0: 900, f1: 400, dur: 0.1, type: 'triangle', vol: 0.05, at: 0.02 }];
const SHARDS: [number, number][] = [[3520, 0.04], [2960, 0.07], [4180, 0.09], [3320, 0.13], [2640, 0.16], [3950, 0.2], [3080, 0.25], [3730, 0.31], [2790, 0.38]];
/** s: when Fx.rainbowDash's blast races off (its 260 ms are up) */
const BLAST_AT = 0.24;

export const TONES = {
  jump: (air = false): Tone[] => [{ f0: air ? 420 : 280, f1: air ? 840 : 560, dur: 0.09, vol: 0.05 }],
  land: (): Tone[] => [{ f0: 150, f1: 70, dur: 0.07, type: 'triangle', vol: 0.12 }],
  pickup: (streak = 0): Tone[] => {
    const s = Math.min(streak, 9);
    return [{ f0: note(s), dur: 0.05, vol: 0.06 }, { f0: note(s + 2), dur: 0.09, vol: 0.06, at: 0.05 }];
  },
  clear: (): Tone[] => [
    { f0: 523, dur: 0.1, at: 0 }, { f0: 659, dur: 0.1, at: 0.1 }, { f0: 784, dur: 0.1, at: 0.2 },
    { f0: 1046, dur: 0.35, at: 0.3, type: 'triangle', vol: 0.12 },
  ],
  click: (): Tone[] => [{ f0: 900, dur: 0.03, vol: 0.05 }],
  voice: (pitch: number): Tone[] => [{ f0: pitch * (0.92 + Math.random() * 0.16), dur: 0.035, vol: 0.025 }],
  whoosh: (): Tone[] => [{ f0: 900, f1: 140, dur: 0.35, type: 'sawtooth', vol: 0.025 }],
  pop: (): Tone[] => [{ f0: 480, f1: 960, dur: 0.07, type: 'triangle', vol: 0.06 }],
  peck: (): Tone[] => [{ f0: 1400, f1: 700, dur: 0.04, type: 'triangle', vol: 0.05 }],
  dash: (): Tone[] => DASH,
  cleave: (): Tone[] => CLEAVE,
  rainbowDash: (): Tone[] => [
    { f0: 140, f1: 1000, dur: 0.26, type: 'sawtooth', vol: 0.045 }, { f0: 1800, f1: 300, dur: 0.3, type: 'triangle', vol: 0.04, at: BLAST_AT },
    ...chord(BLAST_AT), ...rainbow(0, 0.04, 0.03), ...twinkle(BLAST_AT + 0.08, 8),
  ],
  rainbowCleave: (): Tone[] => [
    ...CLEAVE, { f0: 300, f1: 1200, dur: 0.45, type: 'triangle', vol: 0.04, at: 0.05 }, { f0: 600, f1: 2400, dur: 0.45, type: 'sine', vol: 0.02, at: 0.05 },
    ...chord(0.02, 0.012), ...rainbow(2, 0.03, 0.04), ...twinkle(0.2, 8),
  ],
  bonk: (): Tone[] => [{ f0: 220, f1: 110, dur: 0.08, type: 'square', vol: 0.07 }, { f0: 660, f1: 990, dur: 0.06, type: 'triangle', vol: 0.05, at: 0.03 }],
  burst: (): Tone[] => [
    { f0: 4200, f1: 1600, dur: 0.05, type: 'square', vol: 0.04 }, { f0: 2800, f1: 900, dur: 0.07, type: 'sawtooth', vol: 0.025, at: 0.01 },
    ...SHARDS.map(([f0, at], i) => ({ f0, f1: f0 * 0.96, dur: 0.045, type: 'triangle' as const, vol: 0.03 * (1 - i / SHARDS.length) + 0.006, at })),
  ],
  gift: (): Tone[] => [...rainbow(0, 0.05, 0, 0.04), ...chord(0.3, 0.02), ...twinkle(0.34, 10)],
  finale: (): Tone[] => [
    { f0: 120, f1: 45, dur: 0.6, type: 'square', vol: 0.08 }, { f0: 240, f1: 90, dur: 0.4, type: 'sawtooth', vol: 0.04 },
    ...chord(0.05, 0.03), ...rainbow(0, 0.06, 0.12, 0.04), ...twinkle(0.5, 14),
  ],
  clang: (): Tone[] => [{ f0: 1200, f1: 1150, dur: 0.12, type: 'square', vol: 0.03 }, { f0: 1800, dur: 0.08, type: 'triangle', vol: 0.03 }],
  hurt: (): Tone[] => [{ f0: 320, f1: 90, dur: 0.22, type: 'sawtooth', vol: 0.05 }, { f0: 160, f1: 60, dur: 0.2, type: 'square', vol: 0.04, at: 0.04 }],
  creak: (): Tone[] => [
    { f0: 140, f1: 190, dur: 0.5, type: 'sawtooth', vol: 0.03 }, { f0: 220, f1: 160, dur: 0.35, type: 'square', vol: 0.02, at: 0.35 },
    { f0: 80, f1: 50, dur: 0.25, type: 'triangle', vol: 0.12, at: 0.7 },
  ],
  pound: (): Tone[] => [
    { f0: 110, f1: 40, dur: 0.35, type: 'triangle', vol: 0.14 }, { f0: 70, f1: 30, dur: 0.3, type: 'square', vol: 0.06 },
    { f0: 300, f1: 80, dur: 0.12, type: 'sawtooth', vol: 0.03 },
  ],
  fail: (): Tone[] => [{ f0: 392, dur: 0.14 }, { f0: 330, dur: 0.14, at: 0.15 }, { f0: 262, dur: 0.4, at: 0.3, type: 'triangle', vol: 0.12 }],
};

type Sounds = typeof TONES;
export const sfx = Object.fromEntries(
  Object.entries<(...args: never[]) => Tone[]>(TONES).map(([name, tones]) => [name, (...args: never[]) => play(tones(...args))]),
) as { [K in keyof Sounds]: (...args: Parameters<Sounds[K]>) => void };
