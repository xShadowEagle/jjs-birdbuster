import Phaser from 'phaser';
import { BG_RGB } from '../ui/colors';
import { sfx } from '../audio/sfx';

export function fadeIn(scene: Phaser.Scene, ms = 250): void {
  scene.cameras.main.fadeIn(ms, ...BG_RGB);
}

// a scene gets a new main camera each run, so this needs no reset
const leaving = new WeakSet<Phaser.Cameras.Scene2D.Camera>();

export const isLeaving = (scene: Phaser.Scene): boolean => leaving.has(scene.cameras.main);

/** Fades out, then calls `then`; once a run: a repeat does nothing and returns false. */
export function leave(scene: Phaser.Scene, then: () => void, { ms = 200, click = false } = {}): boolean {
  const cam = scene.cameras.main;
  if (leaving.has(cam)) return false;
  leaving.add(cam);
  if (click) sfx.click();
  cam.fadeOut(ms, ...BG_RGB);
  cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, then);
  return true;
}
