import Phaser from 'phaser';
import { ANIMS, IMAGES, MUSIC, SHEETS, musicUrls } from '../assets/manifest';
import { makeFont } from '../ui/font';
import { preloadMusic } from '../audio/music';
import { storyMusic } from '../story/music';
import { cutWall } from '../entities/enemies/breaks';
import { SCENES } from './keys';

export default class Boot extends Phaser.Scene {
  constructor() { super(SCENES.Boot); }

  preload(): void {
    const bar = document.querySelector<HTMLElement>('#loading .bar i');
    this.load.on(Phaser.Loader.Events.PROGRESS, (p: number) => { if (bar) bar.style.width = `calc(${Math.round(p * 80)}px * var(--k))`; });

    this.load.audio(MUSIC.title, musicUrls(MUSIC.title));
    this.load.setPath('assets/');
    for (const [key, file] of Object.entries(IMAGES)) this.load.image(key, file);
    for (const [key, s] of Object.entries(SHEETS)) this.load.spritesheet(key, s.file, { frameWidth: s.w, frameHeight: s.h });
  }

  create(): void {
    makeFont(this);
    cutWall(this.textures);
    void preloadMusic(storyMusic());
    for (const [key, a] of Object.entries(ANIMS)) {
      this.anims.create({
        key,
        frames: a.frames.map(frame => ({ key: a.sheet, frame })),
        frameRate: a.fps,
        repeat: a.loop === false ? 0 : -1,
      });
    }
    document.getElementById('loading')?.remove();
    this.scene.start(SCENES.Title);
  }
}
