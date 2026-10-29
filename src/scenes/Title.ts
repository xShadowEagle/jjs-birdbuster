import Phaser from 'phaser';
import { GAME_W, frameDt } from '../constants';
import { label, snapToPixels } from '../ui/text';
import { Button, onTap } from '../ui/Button';
import { scrim } from '../ui/scrim';
import { UI } from '../ui/colors';
import { fadeIn, leave } from './fade';
import { sfx } from '../audio/sfx';
import { isSoundMuted, toggleMute } from '../audio/settings';
import { expectMusic, playMusic } from '../audio/music';
import { musicAt } from '../story/music';
import { FLOW, continueAt, playStep, type StepData } from '../story/flow';
import { LEVELS } from '../levels';
import { enterLandscape } from '../orientation';
import { tex } from '../assets/keys';
import { SCENES } from './keys';
import Backdrop from '../world/Backdrop';
import { BIOMES, type BiomeId } from '../world/biomes';
import { t } from '../language';
import { savedBeaten } from '../save';
import { keepAwake } from '../wake';
import { onPress, onTapAway } from '../controls';
import { version } from '../../package.json';

const TOUR: BiomeId[] = [...new Set(FLOW.flatMap(s => (s.kind === 'level' ? [LEVELS[s.id].biome] : [])))];
const HOLD_MS = 5000;
const FADE_MS = 1500;
const CONTINUE_Y = 128;

export default class Title extends Phaser.Scene {
  private tour: Backdrop[] = [];
  private shown = 0;

  constructor() { super(SCENES.Title); }

  create(): void {
    this.shown = 0;
    keepAwake(false);
    this.tour = TOUR.map((id, i) => new Backdrop(this, BIOMES[id]).setDepth(-20).setAlpha(i === 0 ? 1 : 0));
    this.time.addEvent({ delay: HOLD_MS, loop: true, callback: () => this.nextBackdrop() });
    scrim(this);
    playMusic(this, 'title');

    const title = label(this, GAME_W / 2, 74, t('game.name'), { scale: 4, color: UI.gold, origin: 0.5 });
    const jj = label(this, title.left + 2, title.y - 8, t('game.jjs'), { scale: 2, origin: [0, 1] });
    this.tweens.add({ targets: [title, jj], y: '-=2', duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut', onUpdate: snapToPixels });

    label(this, 7, 9, `v${version}`, { color: UI.dim, keepCase: true });

    const icon = this.add.image(GAME_W - 12, 12, isSoundMuted() ? tex('ui.mute') : tex('ui.sound')).setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-6, -6, 24, 22), hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true,
    });
    const toggle = () => {
      icon.setTexture(toggleMute() ? tex('ui.mute') : tex('ui.sound'));
      sfx.click();
    };
    onTap(icon, toggle);
    onPress(this, ['M'], toggle);

    if (savedBeaten()) {
      new Button(this, 0, 0, t('title.credits'), () => this.go(SCENES.Credits, false)).toBottomRight(6);
      onPress(this, ['C'], () => this.go(SCENES.Credits));
    }

    const at = continueAt();
    expectMusic(musicAt(Math.max(at, 0)));
    if (at >= 0) {
      new Button(this, GAME_W / 2, CONTINUE_Y, t('title.continue'), () => this.go(at, false), { scale: 2, minWidth: 124 });
      new Button(this, GAME_W / 2, CONTINUE_Y + 28, t('title.newGame'), () => this.go(SCENES.Language, false));
      onPress(this, ['N'], () => this.go(SCENES.Language));
    }

    const start = () => this.go(at >= 0 ? at : SCENES.Language);
    onTapAway(this, start);
    onPress(this, ['SPACE', 'ENTER'], start);
    fadeIn(this);
  }

  override update(_: number, delta: number): void {
    const dt = frameDt(delta);
    for (const b of this.tour) b.pan(dt);
  }

  private nextBackdrop(): void {
    const from = this.tour[this.shown];
    this.shown = (this.shown + 1) % this.tour.length;
    const to = this.tour[this.shown].setDepth(-10).setAlpha(0);
    this.tweens.add({
      targets: to, alpha: 1, duration: FADE_MS, ease: 'Sine.inOut',
      onComplete: () => { from.setAlpha(0); to.setDepth(-20); },
    });
  }

  private go(to: typeof SCENES.Language | typeof SCENES.Credits | number, click = true): void {
    const left = leave(this, () => {
      if (typeof to === 'number') playStep(this, to);
      // step -1, or Phaser would keep a story run's step
      else this.scene.start(to, to === SCENES.Credits ? { step: -1 } satisfies StepData : undefined);
    }, { click });
    if (left && to !== SCENES.Credits) void enterLandscape();
  }
}
