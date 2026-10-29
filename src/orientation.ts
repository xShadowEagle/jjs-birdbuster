import { inEvery } from './language';
import type Phaser from 'phaser';
import { drawText, textWidth, FONT_H } from './ui/font';
import { GameEvent, until } from './events';
import { css, UI } from './ui/colors';
import { PAGE_IMAGES } from './assets/manifest';

const MQ = '(orientation: portrait) and (pointer: coarse)';

const PHONE_W = 12, PHONE_H = 18;

function pixelCanvas(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.style.imageRendering = 'pixelated';
  draw(c.getContext('2d')!);
  return c;
}

/** Android only: iPhones can't lock, or go fullscreen. */
export const canLock = () => /Android/i.test(navigator.userAgent) && !!document.documentElement.requestFullscreen && 'lock' in (screen.orientation ?? {});

/** Needs a user gesture. */
export async function enterLandscape(): Promise<void> {
  if (!canLock()) return;
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    await (screen.orientation as ScreenOrientation & { lock(o: string): Promise<void> }).lock('landscape');
  } catch {}
}

export function initOrientation(game: Phaser.Game): void {
  const phone = document.createElement('img');
  phone.src = `assets/${PAGE_IMAGES['ui.phone']}`;
  phone.alt = '';
  Object.assign(phone.style, { imageRendering: 'pixelated', display: 'block', transition: 'none' });
  // in every language: it can come up before one is picked
  const groups: [string[], number][] = [[inEvery('rotate.turn'), UI.text]];
  if (canLock()) groups.push([inEvery('rotate.fullscreen'), UI.dim]);
  const LINE = FONT_H + 5, GAP = 6;
  const textW = Math.max(...groups.flatMap(([ls]) => ls.map(l => textWidth(l)))) + 2;
  const textH = groups.reduce((h, [ls]) => h + ls.length * LINE, 0) + GAP * (groups.length - 1);
  const text = pixelCanvas(textW, textH, ctx => {
    let y = 1;
    for (const [ls, color] of groups) {
      for (const l of ls) { drawText(ctx, l, 1 + ((textW - 2 - textWidth(l)) >> 1), y, color); y += LINE; }
      y += GAP;
    }
  });

  const el = document.createElement('div');
  el.id = 'rotate';
  Object.assign(el.style, {
    position: 'fixed', inset: '0', display: 'none', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: '28px', background: css(UI.bg), zIndex: '10', touchAction: 'none',
  });
  const icon = document.createElement('div');
  Object.assign(icon.style, { display: 'flex', alignItems: 'center', justifyContent: 'center' });
  icon.append(phone);
  el.append(icon, text);
  document.body.append(el);

  // a whole number of device pixels per pixel: on a phone's dense screen that's finer than whole CSS pixels
  const size = () => {
    const dpr = devicePixelRatio || 1;
    const k = Math.max(1, Math.floor(Math.min(innerWidth * 0.85 / textW, 4) * dpr)) / dpr;
    text.style.width = `${text.width * k}px`;
    const p = k + 2;
    phone.style.width = `${PHONE_W * p}px`;
    icon.style.width = icon.style.height = `${PHONE_H * p}px`;  // square box, so turning doesn't shift the text
  };

  let tick = 0, timer = 0;
  const flip = () => { phone.style.transform = tick++ % 2 === 1 ? 'rotate(90deg)' : 'none'; };

  // the game listens for touches on the whole page: none may reach it
  const swallow = (e: Event) => { e.stopPropagation(); if (e.cancelable) e.preventDefault(); };
  for (const type of ['touchstart', 'touchmove', 'touchend', 'pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click']) {
    el.addEventListener(type, swallow, { passive: false });
  }
  el.addEventListener('pointerup', () => { void enterLandscape(); });

  const mq = matchMedia(MQ);
  let shown = false;
  const apply = () => {
    if (mq.matches === shown) return;
    shown = mq.matches;
    el.style.display = shown ? 'flex' : 'none';
    if (shown) { size(); tick = 0; flip(); timer = window.setInterval(flip, 1100); } else window.clearInterval(timer);
    game.events.emit(shown ? GameEvent.Blocked : GameEvent.Unblocked);
  };
  // resize and visibility are backups: browsers only deliver the media query's change while the page renders
  mq.addEventListener('change', apply);
  window.addEventListener('resize', () => { apply(); if (shown) size(); });
  document.addEventListener('visibilitychange', apply);
  apply();
}

const isBlocked = () => matchMedia(MQ).matches;

export function freezeWhileBlocked(scene: Phaser.Scene): void {
  const freeze = () => scene.scene.pause(), thaw = () => scene.scene.resume();
  until(scene, scene.game.events, [[GameEvent.Blocked, freeze], [GameEvent.Unblocked, thaw]]);
  if (isBlocked()) scene.time.delayedCall(0, freeze);
}
