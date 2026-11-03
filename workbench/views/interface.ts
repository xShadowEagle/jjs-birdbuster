import type Phaser from 'phaser';
import { GROUND_Y, TOUCH, type ButtonId } from '../../src/constants';
import { IMAGES, SHEETS } from '../../src/assets/manifest';
import { frameCount } from '../../src/assets/keys';
import { RAINBOW_BUTTONS, RING_FRAME_MS, drawTouchDisc, hintAlpha, iconAlpha, iconOf, rainbowIconOf } from '../../src/ui/touch';
import { drawDashBar, tintDashLabel } from '../../src/ui/dashBar';
import { textWidth } from '../../src/ui/font';
import { label } from '../../src/ui/text';
import { UI } from '../../src/ui/colors';
import { t } from '../../src/language';
import { tearWeb, smashWall } from '../../src/entities/enemies/breaks';
import { BUTTON_IDS, BUTTON_SETS, LIVE, draftTex, drafts } from '../catalog';
import { state } from '../state';
import { runningBird } from './images';

const HINTED: readonly ButtonId[] = ['attack', 'dash'];

export function showInterface(scene: Phaser.Scene): void {
  runningBird(scene);
  const set = BUTTON_SETS[state.pick], g = scene.add.graphics().setDepth(20);
  const texOf = (key: string, file: string) => (set !== LIVE && drafts.get(file)?.has(set) ? draftTex(file, set) : key);
  const down = state.press === 'Pressed', rings: Phaser.GameObjects.Sprite[] = [];
  const drawDiscs = () => {
    g.clear();
    for (const id of BUTTON_IDS) {
      const { x, y } = TOUCH.buttons[id], cool = state.press === 'Cooling' && id === 'dash' ? 0.5 : 0;
      drawTouchDisc(g, x, y, { down, cool, hint: state.press === 'Hint' && HINTED.includes(id) ? hintAlpha(scene.time.now) : 0 });
    }
  };
  drawDiscs();
  for (const id of BUTTON_IDS) {
    const { x, y } = TOUCH.buttons[id];
    const charged = state.press === 'Rainbow' && RAINBOW_BUTTONS.find(b => b === id);
    if (charged) rings.push(scene.add.sprite(x, y, texOf('ui.rainbow_ring', SHEETS['ui.rainbow_ring'].file), 0).setDepth(20.5));
    const icon = charged ? rainbowIconOf(charged) : iconOf(id, state.swing === 'Cleave' ? 'cleave' : 'peck');
    scene.add.image(x, y, texOf(icon, IMAGES[icon])).setDepth(21).setAlpha(iconAlpha(down));
  }
  scene.time.addEvent({
    delay: RING_FRAME_MS, loop: true,
    callback: () => { for (const r of rings) r.setFrame((Number(r.frame.name) + 1) % frameCount(r.texture)); },
  });
  const word = label(scene, 6, 31, t('hud.dash'), { color: UI.gold }).setDepth(30), bar = scene.add.graphics().setDepth(30);
  const barX = 6 + textWidth(t('hud.dash')) + 6, cool = state.press === 'Cooling' ? 0.5 : 0, charged = state.press === 'Rainbow';
  word.setAlpha(cool > 0 ? 0.4 : 1);
  const drawBars = () => {
    drawDiscs();
    tintDashLabel(word, charged, scene.time.now);
    drawDashBar(bar.clear(), barX, 33, cool, charged, scene.time.now);
  };
  drawBars();
  scene.time.addEvent({ delay: 30, loop: true, callback: drawBars });
}

export function showBreaks(scene: Phaser.Scene): void {
  runningBird(scene);
  const hitY = GROUND_Y - 16;
  const round = () => {
    const w = scene.add.sprite(210, GROUND_Y / 2, 'world.jungle.web').setDepth(9), b = scene.add.sprite(300, GROUND_Y / 2, 'world.tower.wall').setDepth(9);
    scene.time.delayedCall(600, () => { tearWeb(scene, w, hitY); w.destroy(); });
    scene.time.delayedCall(1000, () => { smashWall(scene, b, hitY); b.destroy(); });
  };
  round();
  scene.time.addEvent({ delay: 2200, loop: true, callback: round });
}
