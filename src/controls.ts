import Phaser from 'phaser';
import { DEPTH, GAME_W, TOUCH, type ButtonId, type Swing } from './constants';
import { RAINBOW_BUTTONS, RING_FRAME_MS, drawTouchDisc, iconAlpha, iconOf, rainbowIconOf, type RainbowButton } from './ui/touch';
import { frameCount, tex } from './assets/keys';
import { isTouchScreen } from './device';
import { t } from './language';
import type { TextKey } from './texts/en';

type Key = Phaser.Input.Keyboard.Key;
export type KeyName = keyof typeof Phaser.Input.Keyboard.KeyCodes;

const BINDINGS = {
  // no W: with Ctrl held for a slide, Ctrl+W would close the browser tab
  jump: { keys: ['UP', 'SPACE'], label: 'key.jump' },
  slide: { keys: ['DOWN', 'CTRL', 'S'], label: 'key.slide' },
  attack: { keys: ['X', 'J'], label: 'key.attack' },
  dash: { keys: ['C', 'K'], label: 'key.dash' },
} satisfies Record<ButtonId, { keys: KeyName[]; label: TextKey }>;
type BoundKey = (typeof BINDINGS)[ButtonId]['keys'][number];

export interface Verbs { slide?: boolean; attack?: boolean; cleave?: boolean; dash?: boolean }

export const swingOf = (v: Verbs): Swing | undefined => (v.cleave ? 'cleave' : v.attack ? 'peck' : undefined);

export function onPress(scene: Phaser.Scene, keys: KeyName[], fn: () => void, { repeat = false } = {}): void {
  for (const k of keys) scene.input.keyboard!.on(`keydown-${k}`, (e: KeyboardEvent) => { if (repeat || !e.repeat) fn(); });
}

export function onTapAway(scene: Phaser.Scene, fn: () => void): void {
  scene.input.on(Phaser.Input.Events.POINTER_UP, (_: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => { if (!over.length) fn(); });
}

export function pressTo(verb: 'run' | 'continue' | 'restart'): string {
  const touch = isTouchScreen(), key = t(BINDINGS.jump.label);
  if (verb === 'run') return touch ? t('prompt.run.tap') : t('prompt.run.key', { key });
  if (verb === 'continue') return touch ? t('prompt.continue.tap') : t('prompt.continue.key', { key });
  return touch ? t('prompt.restart.tap') : t('prompt.restart.key', { key });
}

export default class Controls {
  /** 0 = ready, 1 = just used */
  dashCooldown = 0;
  readonly rainbowCharged = new Set<RainbowButton>();
  driver?: (press: (id: ButtonId) => void, hold: (id: ButtonId) => void) => void;

  private readonly keys: Record<BoundKey, Key>;
  private readonly byKeyCode = new Map<number, ButtonId>();
  private readonly enabled: ButtonId[];
  private readonly swing: Swing | undefined;
  private readonly pointers = new Map<number, ButtonId>();
  private readonly tapped = new Set<ButtonId>();
  private readonly isDown = new Set<ButtonId>();
  private readonly justDown = new Set<ButtonId>();
  private pointerUsed = false;
  private quietUntil = 0;
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly icons = new Map<ButtonId, Phaser.GameObjects.Image>();
  private readonly rings = new Map<ButtonId, Phaser.GameObjects.Sprite>();

  constructor(private readonly scene: Phaser.Scene, verbs: Verbs) {
    const names = [...new Set(Object.values(BINDINGS).flatMap(b => b.keys))];
    this.keys = scene.input.keyboard!.addKeys(Object.fromEntries(names.map(n => [n, Phaser.Input.Keyboard.KeyCodes[n]]))) as Record<BoundKey, Key>;
    for (const [id, { keys }] of Object.entries(BINDINGS) as [ButtonId, (typeof BINDINGS)[ButtonId]][]) {
      for (const n of keys) this.byKeyCode.set(this.keys[n].keyCode, id);
    }

    this.swing = swingOf(verbs);
    this.enabled = ['jump'];
    if (verbs.slide) this.enabled.push('slide');
    if (this.swing) this.enabled.push('attack');
    if (verbs.dash) this.enabled.push('dash');

    this.gfx = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.controls);
    for (const id of this.enabled) {
      const { x, y } = TOUCH.buttons[id];
      this.icons.set(id, scene.add.image(x, y, iconOf(id, this.swing)).setScrollFactor(0).setDepth(DEPTH.controlIcons).setVisible(false));
      if (RAINBOW_BUTTONS.some(b => b === id)) this.rings.set(id, scene.add.sprite(x, y, tex('ui.rainbow_ring'), 0).setScrollFactor(0).setDepth(DEPTH.controls).setVisible(false));
    }

    // events, not Key.JustDown: a press that starts and ends within one frame would be lost
    scene.input.keyboard!.on(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, this.onKey, this);
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
  }

  label(id: ButtonId): string {
    if (!isTouchScreen()) return t(BINDINGS[id].label);
    if (this.enabled.length === 1) return t('touch.tap');
    const b = TOUCH.buttons[id], left = b.x < GAME_W / 2, side = left ? t('touch.left') : t('touch.right');
    const half = this.onHalf(left);
    if (half.length === 1) return side;
    return t('touch.where', { side, height: half.every(o => TOUCH.buttons[o].y >= b.y) ? t('touch.high') : t('touch.low') });
  }

  held(id: ButtonId): boolean { return this.isDown.has(id); }
  pressed(id: ButtonId): boolean { return this.justDown.has(id); }
  get anyPressed(): boolean { return this.justDown.size > 0; }

  private onHalf(left: boolean): ButtonId[] { return this.enabled.filter(id => TOUCH.buttons[id].x < GAME_W / 2 === left); }

  private onDown(p: Phaser.Input.Pointer): void {
    this.pointerUsed = true;
    const sameHalf = this.onHalf(p.x < GAME_W / 2);
    let best: ButtonId = 'jump', bestD = Infinity;
    for (const id of sameHalf.length ? sameHalf : this.enabled) {
      const b = TOUCH.buttons[id];
      const d = Phaser.Math.Distance.Squared(p.x, p.y, b.x, b.y);
      if (d < bestD) { bestD = d; best = id; }
    }
    this.pointers.set(p.id, best);
    this.tapped.add(best);
  }

  private onUp(p: Phaser.Input.Pointer): void { this.pointers.delete(p.id); }

  private onKey(e: KeyboardEvent): void {
    const id = this.byKeyCode.get(e.keyCode);
    if (id && e.ctrlKey) e.preventDefault();   // Phaser lets a key through with a modifier: Ctrl+K, J or S would open the browser's
    if (id && !e.repeat && this.enabled.includes(id)) this.tapped.add(id);
  }

  dropThisFrame(): void {
    this.justDown.clear();
    this.isDown.clear();
  }

  /** Ignores new presses briefly too (the press that resumed from pause). */
  dropAll(): void {
    this.tapped.clear();
    this.pointers.clear();
    for (const k of Object.values(this.keys)) k.reset();
    this.quietUntil = this.scene.game.loop.time + 150;   // (the game's clock: a paused scene's is stale)
  }

  update(): void {
    const held = new Set(this.pointers.values());
    this.driver?.(id => this.tapped.add(id), id => held.add(id));
    this.isDown.clear(); this.justDown.clear();
    for (const id of this.enabled) {
      if (this.tapped.has(id)) this.justDown.add(id);
      // a press counts as held for its first frame, even if it's already over
      if (held.has(id) || this.tapped.has(id) || BINDINGS[id].keys.some(n => this.keys[n].isDown)) this.isDown.add(id);
    }
    if (this.scene.game.loop.time < this.quietUntil) { this.justDown.clear(); this.isDown.clear(); }
    this.tapped.clear();
    this.draw();
  }

  private draw(): void {
    const g = this.gfx, shown = isTouchScreen() || this.pointerUsed;
    g.clear();
    for (const [id, icon] of this.icons) {
      const charged = RAINBOW_BUTTONS.find(b => b === id && this.rainbowCharged.has(b)), ring = this.rings.get(id);
      icon.setVisible(shown);
      ring?.setVisible(shown && !!charged);
      if (!shown) continue;
      const { x, y } = TOUCH.buttons[id], down = this.isDown.has(id);
      drawTouchDisc(g, x, y, { down, cool: id === 'dash' ? this.dashCooldown : 0 });
      icon.setTexture(charged ? rainbowIconOf(charged) : iconOf(id, this.swing)).setAlpha(iconAlpha(down));
      if (charged) ring?.setFrame(Math.floor(this.scene.time.now / RING_FRAME_MS) % frameCount(ring.texture));
    }
  }

  destroy(): void {
    this.scene.input.keyboard?.off(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, this.onKey, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
  }
}
