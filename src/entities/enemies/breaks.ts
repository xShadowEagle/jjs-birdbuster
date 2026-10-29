import Phaser from 'phaser';
import { BRICK, GROUND_Y } from '../../constants';
import { tex } from '../../assets/keys';
import type { Box } from '../../geom';

export type Break = (scene: Phaser.Scene, target: Phaser.GameObjects.Sprite, hitY: number) => void;

/** `r`: image px */
function frameOf(texture: Phaser.Textures.Texture, kind: 'piece' | 'bit', r: Box): string {
  const name = `${kind} ${r.x},${r.y},${r.w},${r.h}`;
  if (!texture.has(name)) {
    // the texture's first added frame becomes what it shows by default: keep that the whole image
    const first = texture.firstFrame;
    texture.add(name, 0, r.x, r.y, r.w, r.h);
    texture.firstFrame = first;
  }
  return name;
}

/** `r`: image px */
function piece(scene: Phaser.Scene, target: Phaser.GameObjects.Sprite, r: Box, ox = 0.5, oy = 0.5): Phaser.GameObjects.Image {
  const texture = target.texture, frame = frameOf(texture, 'piece', r);
  const left = target.x - target.width * target.originX, top = target.y - target.height * target.originY;
  return scene.add.image(left + r.x + r.w * ox, top + r.y + r.h * oy, texture.key, frame).setOrigin(ox, oy).setDepth(target.depth);
}

interface Throw { vx: number; vy: number; g?: number; spin?: number; ms: number; delay?: number; fade?: number; floor?: number }
/** `spin`: degrees/s; `floor`: its centre's lowest y; it fades over the last `fade` of its `ms`. */
function fling(scene: Phaser.Scene, img: Phaser.GameObjects.Image, { vx, vy, g = 0, spin = 0, ms, delay = 0, fade = 0.4, floor }: Throw): void {
  const x0 = img.x, y0 = img.y, a0 = img.angle;
  let landed: number | undefined;                         // s
  scene.tweens.addCounter({
    from: 0, to: ms / 1000, duration: ms, delay,
    onUpdate: tw => {
      const t = tw.getValue() ?? 0;
      let x = x0 + vx * t, y = y0 + vy * t + (g * t * t) / 2, a = a0 + spin * t;
      if (floor !== undefined && (landed !== undefined || y >= floor)) {
        landed ??= t;
        const slide = Math.min(t - landed, 0.12);
        x = x0 + vx * landed + vx * 0.5 * slide; y = floor; a = a0 + spin * landed;
      }
      img.setPosition(x, y).setAngle(a).setAlpha(Math.min(1, (1 - tw.progress) / fade));
    },
    onComplete: () => img.destroy(),
  });
}

const rnd = Phaser.Math.FloatBetween;

function dust(scene: Phaser.Scene, x: number, y: number, n: number, depth: number): void {
  for (let i = 0; i < n; i++) {
    const p = scene.add.image(x + rnd(-9, 9), y - rnd(0, 4), tex('fx.puff')).setDepth(depth + 1).setScale(0.6).setAlpha(0.9);
    scene.tweens.add({ targets: p, x: p.x + rnd(-6, 12), y: p.y - rnd(4, 10), scale: rnd(1.3, 1.8), alpha: 0, duration: rnd(350, 500), ease: 'Quad.out', onComplete: () => p.destroy() });
  }
}

function wisps(scene: Phaser.Scene, target: Phaser.GameObjects.Sprite, cut: number, n: number): void {
  for (let i = 0; i < n; i++) {
    const x = Math.floor(rnd(1, target.width - 3)), y = Phaser.Math.Clamp(Math.floor(cut + rnd(-14, 10)), 0, target.height - 6);
    fling(scene, piece(scene, target, { x, y, w: 2, h: 6 }), { vx: rnd(-25, 55), vy: rnd(-55, -10), g: 80, spin: rnd(-220, 220), ms: rnd(650, 950), fade: 0.6 });
  }
}

const rowAt = (t: Phaser.GameObjects.Sprite, y: number, margin: number) => Phaser.Math.Clamp(Math.round(y - (t.y - t.height * t.originY)), margin, t.height - margin);

export const tearWeb: Break = (scene, t, hitY) => {
  const cut = rowAt(t, hitY, 8);
  const up = piece(scene, t, { x: 0, y: 0, w: t.width, h: cut }, 0.5, 0);
  const down = piece(scene, t, { x: 0, y: cut, w: t.width, h: t.height - cut }, 0.5, 1);
  scene.tweens.add({ targets: up, scaleY: 0.12, alpha: 0, duration: 380, ease: 'Cubic.out', onComplete: () => up.destroy() });
  scene.tweens.add({ targets: down, scaleY: 0, scaleX: 1.5, alpha: 0, duration: 300, ease: 'Quad.in', onComplete: () => down.destroy() });
  wisps(scene, t, cut, 6);
};

/** The wall's bricks, as tools/art/biomes.ts lays them. */
function bricks(t: { width: number; height: number }): (Box & { course: number })[] {
  const out: (Box & { course: number })[] = [];
  for (let course = 0; course * BRICK.h < t.height; course++) {
    const y = course * BRICK.h, h = Math.min(BRICK.h, t.height - y);
    for (let x = course % 2 ? -BRICK.wallW / 2 : 0; x < t.width; x += BRICK.wallW) {
      const left = Math.max(0, x);
      out.push({ x: left, y, w: Math.min(x + BRICK.wallW, t.width) - left, h, course });
    }
  }
  return out;
}

/** At load: cut on the first smash, the bricks stalled that frame. */
export function cutWall(textures: Phaser.Textures.TextureManager): void {
  const texture = textures.get(tex('world.tower.wall'));
  for (const b of bricks(texture.getSourceImage())) frameOf(texture, 'piece', b);
}

export const smashWall: Break = (scene, t, hitY) => {
  const hit = Math.floor(rowAt(t, hitY, 8) / BRICK.h);
  for (const b of bricks(t)) {
    const d = b.course - hit, p = piece(scene, t, b), floor = GROUND_Y - b.h / 2;
    if (Math.abs(d) <= 3) fling(scene, p, { vx: rnd(150, 300), vy: rnd(-200, -40) + d * 18, g: 700, spin: rnd(-520, 520), ms: rnd(500, 700), floor });
    else if (d < 0) fling(scene, p, { vx: rnd(-10, 30), vy: rnd(0, 30), g: 900, spin: rnd(-60, 60), ms: 600, delay: 50, fade: 0.35, floor });
    else fling(scene, p, { vx: rnd(20, 80), vy: rnd(-70, -10), g: 700, spin: rnd(-200, 200), ms: 550, floor });
  }
  dust(scene, t.x + 4, GROUND_Y, 5, t.depth);
};

export function crumble(scene: Phaser.Scene, x: number, depth: number): void {
  const texture = scene.textures.get(tex('world.tower.wall'));
  for (let i = 0; i < 8; i++) {
    const frame = frameOf(texture, 'bit', { x: 2 + (i % 4) * 4, y: 9 + i * 8, w: 2 + (i % 3), h: 2 + (i % 2) });
    const bit = scene.add.image(x + rnd(-6, 6), GROUND_Y - 2, texture.key, frame).setDepth(depth);
    fling(scene, bit, { vx: rnd(-110, 110), vy: rnd(-260, -130), g: 900, spin: rnd(-500, 500), ms: rnd(650, 850), floor: GROUND_Y - 1 });
  }
  dust(scene, x, GROUND_Y, 7, depth);
}
