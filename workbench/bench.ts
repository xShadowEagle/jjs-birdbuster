import Phaser from 'phaser';
import { GAME_W, PLAYER, frameDt } from '../src/constants';
import { ANIMS, type AnimKey } from '../src/assets/manifest';
import { BIOMES } from '../src/world/biomes';
import Backdrop from '../src/world/Backdrop';
import { groundStrip } from '../src/world/ground';
import { makeFont } from '../src/ui/font';
import { label } from '../src/ui/text';
import { UI } from '../src/ui/colors';
import { ALL_FRAMES, ASSETS, LIVE, NEW_FRAMES, animsOf, draftTex, drafts, versionsOf } from './catalog';
import { learnTextures } from './foes';
import { asset, benchImages, changed, inPlace, onChange, state } from './state';
import { VIEWS } from './panel';
import { framesOf } from './views/images';
import type { RunView } from './views/run';

export default class Bench extends Phaser.Scene {
  private backdrop?: Backdrop;
  private ground?: Phaser.GameObjects.TileSprite;
  private scroll = 0;
  private run?: RunView;
  private swapped: [string, string][] = [];

  constructor() { super('Bench'); }

  preload(): void {
    for (const a of ASSETS) {
      const load = (key: string, url: string, frame = a.frame) => frame
        ? this.load.spritesheet(key, url, { frameWidth: frame.w, frameHeight: frame.h })
        : this.load.image(key, url);
      if (a.key) load(a.key, `/assets/${a.file}`);
      for (const [set, d] of drafts.get(a.file) ?? []) load(draftTex(a.file, set), d.url, d.frame ?? a.frame);
    }
  }

  create(): void {
    makeFont(this);
    for (const a of ASSETS) {
      if (!a.frame) continue;
      const liveN = a.key ? framesOf(this, a.key) : 0;
      for (const v of versionsOf(a)) {
        for (const k of animsOf(a)) {
          if (k === ALL_FRAMES || k === NEW_FRAMES) {
            const n = framesOf(this, v.tex);
            const [from, to] = k === ALL_FRAMES ? [0, n - 1] : n > liveN ? [liveN, n - 1] : [0, 0];
            this.anims.create({ key: `${v.tex}|${k}`, frames: this.anims.generateFrameNumbers(v.tex, { start: from, end: to }), frameRate: k === NEW_FRAMES ? 8 : 4, repeat: -1, repeatDelay: 400 });
            continue;
          }
          const d = ANIMS[k as AnimKey];
          this.anims.create({ key: `${v.tex}|${k}`, frames: d.frames.map(frame => ({ key: v.tex, frame })), frameRate: d.fps, repeat: -1, repeatDelay: d.loop === false ? 500 : 0 });
        }
      }
    }
    this.gameAnims();
    learnTextures(this);
    onChange(() => this.build());
    changed();
  }

  private gameAnims(sheet?: string): void {
    for (const [key, d] of Object.entries(ANIMS)) {
      if (sheet && d.sheet !== sheet) continue;
      this.anims.remove(key);
      this.anims.create({ key, frames: d.frames.map(frame => ({ key: d.sheet, frame })), frameRate: d.fps, repeat: d.loop === false ? 0 : -1 });
    }
  }

  /** Drafts stand in for live textures: the game's code asks for them by key. */
  private swap(pairs: [live: string, draft: string][]): void {
    for (const [live, draft] of pairs) {
      this.textures.renameTexture(live, `${live}|live`);
      this.textures.renameTexture(draft, live);
      this.gameAnims(live);
    }
    this.swapped = pairs;
  }

  private unswap(): void {
    for (const [live, draft] of this.swapped) {
      this.textures.renameTexture(live, draft);
      this.textures.renameTexture(`${live}|live`, live);
      this.gameAnims(live);
    }
    this.swapped = [];
  }

  build(): void {
    this.time.removeAllEvents();
    this.tweens.killAll();
    this.run?.destroy();
    this.run = undefined;
    this.children.removeAll(true);
    this.unswap();
    this.cameras.main.stopFollow().removeBounds().resetFX().setScroll(0, 0);
    const a = asset(), versions = versionsOf(a), biome = BIOMES[state.biome];
    const view = VIEWS[state.view], version = view.versions?.()[state.pick] ?? LIVE;
    const shown = versions[state.pick];
    if (view.run && version !== LIVE) this.swap(benchImages().filter(i => drafts.get(i.file)?.has(version)).map(i => [i.key!, draftTex(i.file, version)]));
    const swap = (key: string) => {
      if (!inPlace()) return key;
      if (key === a.key) return shown.tex;
      const file = ASSETS.find(x => x.key === key)?.file;
      return file && drafts.get(file)?.has(shown.name) ? draftTex(file, shown.name) : key;
    };
    this.backdrop = new Backdrop(this, biome, swap);
    this.ground = groundStrip(this, biome, 0, GAME_W, swap(biome.ground)).setDepth(0).setScrollFactor(0);
    this.run = view.run?.(this);
    view.show?.(this, () => this.build());
    this.add.rectangle(0, 0, GAME_W, 13, UI.panel, 0.8).setOrigin(0).setDepth(50).setScrollFactor(0);
    label(this, 4, 3, view.title(version), { color: UI.gold }).setDepth(51).setScrollFactor(0);
  }

  override update(_: number, delta: number): void {
    const dt = frameDt(delta);
    if (this.run) this.scroll = this.run.update(dt);
    else if (state.run) this.scroll += PLAYER.runSpeed * dt;
    this.backdrop?.update(this.scroll, dt);
    if (this.ground) this.ground.tilePositionX = Math.round(this.scroll);
  }
}
