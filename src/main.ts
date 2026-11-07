import Phaser from 'phaser';
import { BASE_CONFIG } from './config';
import Boot from './scenes/Boot';
import Title from './scenes/Title';
import Level from './scenes/Level';
import HUD from './scenes/HUD';
import Cutscene from './scenes/Cutscene';
import Language from './scenes/Language';
import Credits from './scenes/Credits';
import { initAudioSettings } from './audio/settings';
import { initSfx } from './audio/sfx';
import { initMusic } from './audio/music';
import { initOrientation } from './orientation';
import { initWake } from './wake';
import { fitZoom, maxLossHere } from './scale';
import { awake } from './gate';
import { sayHello } from './hello';

declare global { interface Window { game?: Phaser.Game } }

const asleep = !awake();
if (asleep) {
  document.getElementById('loading')?.remove();
  document.getElementById('asleep')!.hidden = false;
} else start();
if (!import.meta.env.DEV) sayHello(asleep);

function start(): void {
  const game = new Phaser.Game({
    ...BASE_CONFIG,
    scale: { mode: Phaser.Scale.NONE, autoCenter: Phaser.Scale.CENTER_BOTH },
    // a touch on the bars beside the canvas still only comes as POINTER_DOWN_OUTSIDE, which nothing listens to: the bars don't count
    input: { activePointers: 3, touch: { target: document.body } },
    scene: [Boot, Title, Language, Cutscene, Level, HUD, Credits],
  });

  initAudioSettings(game);
  initSfx(game);
  initMusic(game);

  const box = document.getElementById('game')!;
  function fit(): void {
    const zoom = fitZoom(box.clientWidth, box.clientHeight, window.devicePixelRatio || 1, maxLossHere());
    if (Math.abs(game.scale.zoom - zoom) > 1e-6) game.scale.setZoom(zoom);
    else game.scale.refresh();                                             // same size: centre it in the new box
  }
  // The box, not just the window: after fullscreen a phone's address bar slides back in, and the resize event can come before it has.
  new ResizeObserver(fit).observe(box);
  window.addEventListener('resize', fit);
  fit();

  initOrientation(game);
  initWake();

  if (import.meta.env.DEV) {
    window.game = game;
    void import('./dev/sidebar').then(m => m.initDevSidebar(game));
  }
}
