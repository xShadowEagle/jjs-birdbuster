import type Phaser from 'phaser';
import { BIRD_SCREEN_X, GAME_W, GAME_H, GROUND_Y } from '../../src/constants';
import { textWidth } from '../../src/ui/font';
import { label } from '../../src/ui/text';
import { UI } from '../../src/ui/colors';
import { frameCount } from '../../src/assets/keys';
import { LIVE, type Asset, type Version } from '../catalog';
import { oneAtATime, state } from '../state';

export const framesOf = (scene: Phaser.Scene, tex: string): number => frameCount(scene.textures.get(tex));

export function runningBird(scene: Phaser.Scene): void {
  scene.add.sprite(BIRD_SCREEN_X, GROUND_Y, 'char.bird', 0).setOrigin(0.5, 1).setDepth(5).play('char.bird|run');
}

export function lineUp(scene: Phaser.Scene, a: Asset, versions: Version[]): void {
  const name = (v: Version, x: number, y: number, text = v.name) => label(scene, x, y, text, { origin: [0.5, 0], color: v.name === LIVE ? UI.dim : UI.text }).setDepth(6);
  const stand = (v: Version, x: number) => {
    const s = scene.add.sprite(x, GROUND_Y, v.tex, 0).setOrigin(0.5, 1).setScale(state.zoom).setDepth(5);
    if (a.frame) s.play(`${v.tex}|${state.anim}`);
  };
  if (oneAtATime(versions)) {
    const v = versions[state.pick] ?? versions[0], x = GAME_W / 2;
    stand(v, x);
    name(v, x, GROUND_Y + 6, `${v.name}  (${state.pick + 1}/${versions.length}, Q E)`);
    return;
  }
  const gap = GAME_W / (versions.length + 1);
  const crowded = versions.some(v => textWidth(v.name) > gap - 4);
  versions.forEach((v, i) => {
    const x = Math.round(gap * (i + 1));
    stand(v, x);
    name(v, x, GROUND_Y + 6 + (crowded && i % 2 ? 10 : 0));
  });
}

export function sheets(scene: Phaser.Scene, versions: Version[]): void {
  const z = state.zoom;
  scene.add.rectangle(0, 13, GAME_W, GAME_H - 13, UI.bg, 0.6).setOrigin(0).setDepth(4);
  let y = 17;
  for (const v of versions) {
    const src = scene.textures.get(v.tex).getSourceImage();
    label(scene, 4, y, `${v.name}  ${src.width}x${src.height}`, { color: v.name === LIVE ? UI.dim : UI.text }).setDepth(7);
    y += 10;
    if (v.frame) {
      const w = v.frame.w * z, h = v.frame.h * z, n = framesOf(scene, v.tex);
      const cols = Math.max(1, Math.floor((GAME_W - 6) / (w + 2)));
      for (let f = 0; f < n; f++) {
        const x = 4 + (f % cols) * (w + 2), fy = y + Math.floor(f / cols) * (h + 2);
        scene.add.rectangle(x, fy, w, h, UI.panel, 0.7).setOrigin(0).setDepth(5);
        scene.add.image(x, fy, v.tex, f).setOrigin(0).setScale(z).setDepth(6);
        label(scene, x + 1, fy + 1, String(f), { color: UI.dim }).setDepth(7);
      }
      y += Math.ceil(n / cols) * (h + 2) + 3;
    } else {
      const fit = Math.min(z, (GAME_W - 8) / src.width);
      scene.add.image(4, y, v.tex).setOrigin(0).setScale(fit).setDepth(5);
      y += src.height * fit + 3;
    }
  }
}
