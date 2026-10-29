import type Phaser from 'phaser';
import { savedMuted, saveMuted, savedVolume, saveVolume } from '../save';
import { isTouchScreen } from '../device';

const MAX_GAIN = isTouchScreen() ? 0.4 : 0.2;

let game: Phaser.Game | null = null;
// Phaser's `sound.mute` reads stale while the AudioContext is suspended, so `mute = !mute` can fail to toggle
let muted = false;
let volume = 1;

export function initAudioSettings(g: Phaser.Game): void {
  game = g;
  setSoundMuted(savedMuted(), false);
  setVolume(savedVolume(), false);
}

export function getVolume(): number { return volume; }

/** `v`: 0 to 1 */
export function setVolume(v: number, persist = true): void {
  volume = v;
  if (game) game.sound.volume = MAX_GAIN * v * v;
  if (persist) saveVolume(v);
}

export function isSoundMuted(): boolean { return muted; }

export function setSoundMuted(m: boolean, persist = true): void {
  muted = m;
  if (game) game.sound.mute = m;
  if (persist) saveMuted(m);
}

export function toggleMute(): boolean {
  setSoundMuted(!muted);
  return muted;
}
