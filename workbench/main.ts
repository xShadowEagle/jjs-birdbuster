import Phaser from 'phaser';
import { BASE_CONFIG } from '../src/config';
import { fitZoom, maxLossHere } from '../src/scale';
import { initSfx } from '../src/audio/sfx';
import { initAudioSettings } from '../src/audio/settings';
import Bench from './bench';
import { initPanel } from './panel';
import { initTexts } from './texts';

initTexts();
initPanel();

const game = new Phaser.Game({ ...BASE_CONFIG, scale: { mode: Phaser.Scale.NONE }, scene: [Bench] });
window.game = game;
initAudioSettings(game);
initSfx(game);
const box = document.getElementById('game')!;
const fit = () => {
  const { paddingLeft, paddingRight, paddingTop, paddingBottom } = getComputedStyle(box);
  const w = box.clientWidth - parseFloat(paddingLeft) - parseFloat(paddingRight);
  const h = box.clientHeight - parseFloat(paddingTop) - parseFloat(paddingBottom);
  game.scale.setZoom(fitZoom(w, h, window.devicePixelRatio || 1, maxLossHere()));
};
new ResizeObserver(fit).observe(box);   // the window's size, and the Texts view's list taking room
