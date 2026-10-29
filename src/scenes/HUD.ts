import Phaser from 'phaser';
import { DASH, GAME_W, GAME_H, RETRY_DELAY, type ButtonId } from '../constants';
import type Level from './Level';
import { LevelEvent, until, type BannerEvent, type ClearEvent, type LevelHook, type LivesEvent, type PickupEvent, type SayEvent } from '../events';
import { SpeechBubble } from '../ui/SpeechBubble';
import { CHARACTERS, RUN_LINES } from '../story/characters';
import type { BossState } from '../entities/BossFight';
import { ITEMS, textureOf } from '../items';
import { label, type Label } from '../ui/text';
import { LINE_H, textWidth } from '../ui/font';
import { UI } from '../ui/colors';
import { Button, onTap } from '../ui/Button';
import { Slider } from '../ui/Slider';
import { drawDashBar, tintDashLabel } from '../ui/dashBar';
import { tex } from '../assets/keys';
import { SCENES } from './keys';
import { sfx } from '../audio/sfx';
import { getVolume, isSoundMuted, setSoundMuted, setVolume, toggleMute } from '../audio/settings';
import { canLock, enterLandscape } from '../orientation';
import { onPress, pressTo, swingOf, type Verbs } from '../controls';
import { isTouchScreen } from '../device';
import { t } from '../language';

const fmt = (s: number) => s.toFixed(2);
const CX = GAME_W / 2, CY = GAME_H / 2;
const BANNER_Y = CY - 16;
const SLOT_PITCH = 19;
const MENU_BUTTON_W = 84;
const EMPTY_SLOT_ALPHA = 0.3;
const KEY_TABLE = { y: CY + 62, gap: 7, between: 22 };
/** over the banner and the speech bubble */
const PAUSE_DEPTH = 110;
type MoveBar = { label: Label; bar: Phaser.GameObjects.Graphics; x: number };
type Move = { verb: 'jump' | keyof Verbs; name: string; key: string };

export default class HUD extends Phaser.Scene {
  private level!: Level;
  private timer!: Label;
  private pauseBtn!: Phaser.GameObjects.Image;
  private goal?: { count: Label; icon: Phaser.GameObjects.Image } | { slots: Phaser.GameObjects.Image[] };
  private hearts: Phaser.GameObjects.Image[] = [];
  private muteIcon!: Phaser.GameObjects.Image;
  private bossBar?: Phaser.GameObjects.Graphics;
  private bossLabel?: Label;
  private dash?: MoveBar;
  private cleave?: MoveBar;
  private prompt!: Label;
  private help: Label[] = [];
  private pause!: Phaser.GameObjects.Container;
  private soundBtn!: Button;
  private volume!: Slider;
  private shadeDown = false;

  private bubble!: SpeechBubble;
  private saying?: Phaser.Time.TimerEvent;

  constructor() { super(SCENES.HUD); }

  init({ level }: { level: Level }): void {
    this.level = level;
  }

  create(): void {
    this.hold(false);
    this.shadeDown = false;
    this.bossBar = this.bossLabel = this.cleave = this.saying = undefined; // this scene object is reused: last run's objects are gone
    this.bubble = new SpeechBubble(this);
    this.topBar();
    this.startPrompt();
    this.pauseMenu();
    this.bindKeys();
    this.listen();
  }

  override update(): void {
    const level = this.level;
    if (!level.over) this.timer.setText(fmt(level.elapsed));
    const now = level.time.now;
    if (this.dash) {
      const charged = level.controls.rainbowCharged.has('dash');
      this.drawBar(this.dash, charged ? 0 : level.player.dashCooldown(level.clock), charged, now);
    }
    if (level.rainbow.given) {
      this.cleave ??= this.moveBar(41, t('move.cleave'));
      this.drawBar(this.cleave, level.rainbow.cooldown('attack'), level.controls.rainbowCharged.has('attack'), now);
    }
  }

  private moveBar(y: number, text: string): MoveBar {
    return { label: label(this, 6, y, text, { color: UI.gold }), bar: this.add.graphics(), x: 6 + textWidth(text) + 6 };
  }

  /** `cool`: 1 to 0 */
  private drawBar(b: MoveBar, cool: number, charged: boolean, now: number): void {
    b.label.setAlpha(cool > 0 ? 0.4 : 1);
    tintDashLabel(b.label, charged, now);
    drawDashBar(b.bar.clear(), b.x, b.label.y + 2, cool, charged, now);
  }

  private topBar(): void {
    const { def } = this.level;
    this.pauseBtn = this.add.image(10, 10, tex('ui.pause')).setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-6, -6, 21, 21), hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true,
    });
    onTap(this.pauseBtn, () => this.level.pauseRun());
    this.timer = label(this, 22, 7, fmt(0));
    this.hearts = Array.from({ length: def.lives ?? 0 }, (_, i) => this.add.image(10 + i * 12, 23, tex('ui.heart')));
    this.muteIcon = this.add.image(10 + this.hearts.length * 12 + (this.hearts.length ? 2 : 0), 23, tex('ui.mute')).setAlpha(0.8).setVisible(isSoundMuted());
    this.dash = def.verbs.dash ? this.moveBar(31, t('hud.dash')) : undefined;

    label(this, CX, 7, t(def.name), { origin: [0.5, 0], color: UI.dim });

    this.goal = undefined;
    if (!def.goal) return;
    const pieces = ITEMS[def.goal.item].texture;
    if (typeof pieces === 'string') {
      this.goal = { count: label(this, GAME_W - 6, 7, `0/${def.goal.count}`, { color: UI.gold, origin: [1, 0] }), icon: this.add.image(0, 10, pieces) };
      this.placeIcon();
    } else {
      this.goal = {
        slots: pieces.map((key, i) => this.add.image(GAME_W - 14 - (pieces.length - 1 - i) * SLOT_PITCH, 11, key).setAlpha(EMPTY_SLOT_ALPHA)),
      };
    }
  }

  private say(e: SayEvent): void {
    this.saying?.remove();
    void this.bubble.say(CHARACTERS[RUN_LINES[e.text]], t(e.text), e);
    this.saying = this.time.delayedCall(e.ms, () => this.bubble.hide());
  }

  private banner(e: BannerEvent): void {
    const title = label(this, 0, -9, t(e.title), { origin: [0.5, 0.5], color: UI.gold });
    const name = label(this, 7, 3, t(e.text), { origin: [0.5, 0.5] });
    const icon = this.add.image(-Math.round(name.width / 2) - 3, 3, tex(e.icon), 0);
    const w = Math.max(title.width, name.width + 14) + 16;
    const panel = this.add.graphics().fillStyle(UI.panel, 0.92).fillRoundedRect(-w / 2, -17, w, 30, 4).lineStyle(1, UI.gold, 0.8).strokeRoundedRect(-w / 2 + 0.5, -16.5, w - 1, 29, 4);
    const box = this.add.container(CX, BANNER_Y, [panel, title, icon, name]).setScale(0.6).setAlpha(0).setDepth(60);
    this.tweens.add({ targets: box, scale: 1, alpha: 1, duration: 180, ease: 'Back.out' });
    this.tweens.add({ targets: box, alpha: 0, delay: e.ms - 300, duration: 300, onComplete: () => box.destroy() });
  }

  private showBoss(s: BossState | null): void {
    this.bossBar ??= this.add.graphics();
    this.bossLabel ??= label(this, CX, 18, '', { origin: [0.5, 0], color: UI.gold });
    this.bossBar.clear();
    this.bossLabel.setVisible(!!s);
    if (!s) return;
    this.bossLabel.setText(t('hud.boss', { n: s.index + 1, of: s.count }));
    const pipW = 8, gap = 2, w = s.max * (pipW + gap) - gap, x0 = Math.round(CX - w / 2);
    for (let i = 0; i < s.max; i++) {
      this.bossBar.fillStyle(UI.panel).fillRect(x0 + i * (pipW + gap) - 1, 28, pipW + 2, 5);
      this.bossBar.fillStyle(i < s.hp ? UI.hp : UI.trough).fillRect(x0 + i * (pipW + gap), 29, pipW, 3);
    }
  }

  private showLives({ lives }: LivesEvent): void {
    this.hearts.forEach((h, i) => {
      const full = i < lives;
      if (h.texture.key === tex('ui.heart') && !full) {
        this.tweens.add({ targets: h, scale: 1.6, duration: 90, yoyo: true, onComplete: () => h.setScale(1) });
      }
      h.setTexture(full ? tex('ui.heart') : tex('ui.heart_empty'));
    });
  }

  private placeIcon(): void {
    if (this.goal && 'icon' in this.goal) this.goal.icon.setX(this.goal.count.left - 9);
  }

  private moves(): Move[] {
    const { verbs } = this.level.def, swing = swingOf(verbs), key = (id: ButtonId) => this.level.controls.label(id);
    const moves: Move[] = [{ verb: 'jump', name: t('move.jump'), key: key('jump') }];
    if (verbs.slide) moves.push({ verb: 'slide', name: t('move.slide'), key: key('slide') });
    if (swing === 'peck') moves.push({ verb: 'attack', name: t('move.peck'), key: key('attack') });
    if (swing === 'cleave') moves.push({ verb: 'cleave', name: t('move.cleave'), key: key('attack') });
    if (verbs.dash) moves.push({ verb: 'dash', name: t('move.dash'), key: key('dash') });
    return moves;
  }

  private startPrompt(): void {
    const { goal, teach } = this.level.def;
    // above the upper touch buttons (y 140+), even with all four moves listed
    this.prompt = label(this, CX, CY - 42, pressTo('run'), { scale: 2, origin: 0.5 });
    this.tweens.add({ targets: this.prompt, alpha: 0.4, duration: 500, yoyo: true, repeat: -1 });
    const help = ({ verb, name, key }: Move) => (verb === 'jump' ? t('hud.help.jump', { key })
      : verb === 'slide' ? t('hud.help.slide', { key })
      : verb === 'dash' ? t('hud.help.dash', { key, s: DASH.cooldownMs / 1000 })
      : t('hud.help.attack', { key, move: name }));
    const lines: [string, number][] = [
      [goal ? t('hud.collect', { count: goal.count, items: t(goal.count === 1 ? ITEMS[goal.item].one : ITEMS[goal.item].many) }) : t('hud.beat'), UI.text],
      ...this.moves().map((m): [string, number] => (teach === m.verb ? [t('hud.newMove', { help: help(m) }), UI.gold] : [help(m), UI.dim])),
    ];
    this.help = lines.map(([text, color], i) => label(this, CX, CY - 22 + i * LINE_H, text, { origin: 0.5, color }));
  }

  private showPrompt(on: boolean): void {
    this.prompt.setVisible(on);
    for (const h of this.help) h.setVisible(on && !this.level.started);
  }

  private pauseMenu(): void {
    const level = this.level;
    const shade = this.add.rectangle(0, 0, GAME_W, GAME_H, UI.panel, 0.55).setOrigin(0).setInteractive();
    // only a full click: the release of the one that opened the menu lands here too
    shade.on(Phaser.Input.Events.POINTER_DOWN, () => { this.shadeDown = true; });
    shade.on(Phaser.Input.Events.POINTER_UP, () => { if (this.shadeDown) level.resumeRun(); this.shadeDown = false; });

    this.soundBtn = new Button(this, CX - 50, CY + 42, '', () => this.switchSound(), { minWidth: MENU_BUTTON_W });
    this.showMute();

    const pct = label(this, CX + 56, CY + 14, '', { origin: [0, 0.5] });
    const showPct = (v: number) => pct.setText(`${Math.round(v * 100)}%`);
    this.volume = new Slider(this, CX - 34, CY + 14, 80, getVolume(), (v, done) => {
      setVolume(v, done);
      showPct(v);
      if (isSoundMuted()) { setSoundMuted(false); this.showMute(); }
      if (done) sfx.click();
    });
    showPct(this.volume.value);

    this.pause = this.add.container(0, 0, [
      shade,
      label(this, CX, CY - 36, t('pause.title'), { scale: 3, origin: 0.5 }),
      label(this, CX, CY - 12, pressTo('continue'), { origin: 0.5, color: UI.dim }),
      label(this, CX - 42, CY + 14, t('pause.volume'), { origin: [1, 0.5] }),
      this.volume,
      pct,
      this.soundBtn,
      new Button(this, CX + 50, CY + 42, t('pause.toTitle'), () => level.quitToTitle(), { minWidth: MENU_BUTTON_W }),
    ]).setVisible(false).setDepth(PAUSE_DEPTH);
    if (canLock()) this.fullscreenButton();
    if (!isTouchScreen()) this.keyTable();
  }

  private keyTable(): void {
    const moves = this.moves().map((m): [string, string] => [m.name, m.key]);
    const menu: [string, string][] = [[t('pause.keys.pause'), t('key.pause')], [t('pause.keys.sound'), t('key.sound')], [t('pause.volume'), t('key.volume')]];
    const widest = (rows: [string, string][], i: 0 | 1) => Math.max(...rows.map(r => textWidth(r[i])));
    const width = (rows: [string, string][]) => widest(rows, 0) + KEY_TABLE.gap + widest(rows, 1);
    let x = Math.round(CX - (width(moves) + KEY_TABLE.between + width(menu)) / 2);
    for (const rows of [moves, menu]) {
      const keysX = x + widest(rows, 0) + KEY_TABLE.gap;
      rows.forEach(([action, keys], i) => this.pause.add([
        label(this, x, KEY_TABLE.y + i * LINE_H, action, { color: UI.dim }),
        label(this, keysX, KEY_TABLE.y + i * LINE_H, keys),
      ]));
      x += width(rows) + KEY_TABLE.between;
    }
  }

  private fullscreenButton(): void {
    const btn = new Button(this, CX, CY + 66, t('pause.fullscreen'), () => void enterLandscape(), { minWidth: MENU_BUTTON_W });
    this.pause.add(btn);
    const show = () => btn.setVisible(!document.fullscreenElement);
    show();
    document.addEventListener('fullscreenchange', show);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => document.removeEventListener('fullscreenchange', show));
  }

  private hold(on: boolean): void {
    this.time.paused = on;   // Phaser doesn't reset it when the scene starts again
    if (on) this.tweens.pauseAll(); else this.tweens.resumeAll();
  }

  private switchSound(): void {
    toggleMute();
    this.showMute();
  }

  private showMute(): void {
    this.soundBtn.setText(isSoundMuted() ? t('pause.soundOff') : t('pause.soundOn'));
    this.muteIcon.setVisible(isSoundMuted());
  }

  private bindKeys(): void {
    const level = this.level;
    const togglePause = () => (level.scene.isPaused() ? level.resumeRun() : level.pauseRun());
    onPress(this, ['P', 'ESC'], togglePause);
    onPress(this, ['SPACE', 'ENTER'], () => level.resumeRun());
    onPress(this, ['M'], () => this.switchSound());
    onPress(this, ['LEFT'], () => { if (level.scene.isPaused()) this.volume.set(this.volume.value - 0.1, true); }, { repeat: true });
    onPress(this, ['RIGHT'], () => { if (level.scene.isPaused()) this.volume.set(this.volume.value + 0.1, true); }, { repeat: true });
  }

  // Level's emitter outlives its restarts: unhook on its shutdown
  private listen(): void {
    const level = this.level;
    const hooks: LevelHook[] = [
      [LevelEvent.Pickup, (e: PickupEvent) => this.flyPickup(e)],
      [LevelEvent.Clear, (e: ClearEvent) => this.showClear(e)],
      [LevelEvent.Lives, (e: LivesEvent) => this.showLives(e)],
      [LevelEvent.Fail, () => this.showFail()],
      [LevelEvent.Boss, (s: BossState | null) => this.showBoss(s)],
      [LevelEvent.Say, (e: SayEvent) => this.say(e)],
      [LevelEvent.Banner, (e: BannerEvent) => this.banner(e)],
      [LevelEvent.Go, () => this.showPrompt(false)],
      [LevelEvent.Ready, () => this.showPrompt(true)],
      [LevelEvent.Pause, () => { this.shadeDown = false; this.pause.setVisible(true); this.pauseBtn.setVisible(false); this.hold(true); }],
      [LevelEvent.Resume, () => { this.pause.setVisible(false); this.pauseBtn.setVisible(true); this.hold(false); }],
    ];
    until(level, level.events, hooks);
    level.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scene.stop());
  }

  private flyPickup({ item, count: n, goal, x, y }: PickupEvent): void {
    const g = this.goal;
    if (!g) return;
    const target = 'slots' in g ? g.slots[n - 1] : g.icon;
    const fly = this.add.image(x, y, textureOf(item, n - 1));
    this.tweens.add({
      targets: fly, x: target.x, y: target.y, duration: 380, ease: 'Cubic.in',
      onComplete: () => {
        fly.destroy();
        if ('slots' in g) target.setAlpha(1);
        else {
          g.count.setText(`${n}/${goal}`);
          this.placeIcon();
          // a flash, not a pop: scaling text would distort the pixel font
          g.count.setTint(0xffffff);
          this.time.delayedCall(120, () => g.count.setTint(UI.gold));
        }
        this.tweens.killTweensOf(target);
        target.setScale(1);
        this.tweens.add({ targets: target, scale: 1.3, duration: 70, yoyo: true });
      },
    });
  }

  private showClear({ time }: ClearEvent): void {
    this.timer.setText(fmt(time));
    this.panel(t('panel.clear', { level: t(this.level.def.name) }), fmt(time), 'continue');
  }

  private showFail(): void {
    this.timer.setText(fmt(this.level.elapsed));
    this.panel(t('panel.fail'), t('panel.tryAgain'), 'restart');
  }

  private panel(title: string, line: string, then: 'continue' | 'restart'): void {
    const cy = Math.round(CY - 20);
    // even, so it stays on whole pixels
    const w = 2 * Math.ceil(Math.max(220, textWidth(title, 2) + 24, textWidth(line, 2) + 24) / 2);
    const items: (Phaser.GameObjects.Graphics | Label)[] = [
      this.add.graphics().fillStyle(UI.panel, 0.8).fillRoundedRect(CX - w / 2, cy - 38, w, 84, 6),
      label(this, CX, cy - 22, title, { scale: 2, color: UI.gold, origin: 0.5 }),
      label(this, CX, cy + 2, line, { scale: 2, origin: 0.5 }),
    ];
    for (const [i, o] of items.entries()) {
      o.setAlpha(0);
      this.tweens.add({ targets: o, alpha: 1, delay: i * 90, duration: 150 });
    }
    const again = label(this, CX, cy + 56, pressTo(then), { origin: 0.5 }).setAlpha(0);
    this.tweens.add({ targets: again, alpha: 1, delay: RETRY_DELAY, duration: 200, onComplete: () => this.tweens.add({ targets: again, alpha: 0.4, duration: 500, yoyo: true, repeat: -1 }) });
  }
}
