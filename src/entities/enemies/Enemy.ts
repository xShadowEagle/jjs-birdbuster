import Phaser from 'phaser';
import type Player from '../Player';
import type Pickups from '../Pickups';
import type { ItemId } from '../../items';
import type { ImageKey } from '../../assets/manifest';
import type { Box } from '../../geom';
import { UI } from '../../ui/colors';
import { PLAYER } from '../../constants';

export interface Arena {
  player: Pick<Player, 'x' | 'y' | 'box' | 'steppedX'>;
  pickups: Pick<Pickups, 'look' | 'drop'>;
  loot(kind: ItemId): boolean;
  cameraRight: number;
  add(enemy: Enemy): void;
}

export type SpawnArena = Pick<Arena, 'loot' | 'pickups'>;

export type Attack = 'peck' | 'cleave' | 'dash' | 'rainbowCleave' | 'rainbowDash' | 'feather';

let attacks = 0;
/** 1 and up: -1 means none */
export const nextAttackId = (): number => ++attacks;

export type HitResult = 'defeated' | 'hurt' | 'blocked';
export type Meeting = 'hurt' | 'blocked' | 'pass';
const PLAIN_OF: Partial<Record<Attack, Attack>> = { rainbowCleave: 'cleave', rainbowDash: 'dash' };

/** Seconds until a shot flying left at `speed` px/s meets the running bird, `least` at the soonest. */
export const secsToBird = (x: number, birdX: number, speed: number, least: number): number => Math.max(least, (x - birdX) / (speed + PLAYER.runSpeed));

export default abstract class Enemy extends Phaser.GameObjects.Sprite {
  abstract readonly boxW: number;
  abstract readonly boxH: number;
  readonly weakTo: readonly Attack[] = ['peck', 'cleave', 'dash'];
  hp = 1;
  gone = false;
  alive = true;
  readonly alwaysStepped: boolean = false;
  private readonly hitBy = new Set<number>();
  private carried?: { kind: ItemId; image: Phaser.GameObjects.Image; dy: number };
  /** taken on its first step, once the subclass has set hp */
  private maxHp = 0;
  private pips?: Phaser.GameObjects.Graphics;

  protected abstract move(dt: number, arena: Arena): void;

  step(dt: number, arena: Arena): void {
    if (!this.alive) return;
    this.move(dt, arena);
    const c = this.carried, r = this.rotation;
    if (c) { const at = this.beside(-Math.sin(r) * c.dy, Math.cos(r) * c.dy); c.image.setPosition(at.x, at.y).setRotation(r); }
    this.drawPips();
  }

  /** the offset rounded on its own: rounded with its position it jitters a pixel */
  protected beside(dx: number, dy: number): { x: number; y: number } {
    return { x: this.x + Math.round(dx), y: this.y + Math.round(dy) };
  }

  private drawPips(): void {
    if (!this.maxHp) {
      this.maxHp = this.hp;
      if (this.hp > 1 && !this.alwaysStepped) {
        this.pips = this.scene.add.graphics().setDepth(this.depth + 0.5);
        this.once(Phaser.GameObjects.Events.DESTROY, () => this.pips?.destroy());
      }
    }
    const g = this.pips;
    if (!g) return;
    const w = 5, gap = 1, x0 = Math.round(this.x - (this.maxHp * (w + gap) - gap) / 2), y = Math.round(this.y - this.height / 2 - 4);
    g.clear();
    for (let i = 0; i < this.maxHp; i++) {
      g.fillStyle(UI.panel).fillRect(x0 + i * (w + gap) - 1, y - 1, w + 2, 4);
      g.fillStyle(i < this.hp ? UI.hp : UI.trough).fillRect(x0 + i * (w + gap), y, w, 2);
    }
  }

  get box(): Box {
    return { x: this.x - this.boxW / 2, y: this.y - this.boxH / 2, w: this.boxW, h: this.boxH };
  }

  get harmless(): boolean { return false; }

  protected meets(attack: Attack): Meeting {
    return this.weakTo.includes(attack) || this.weakTo.includes(PLAIN_OF[attack] ?? attack) ? 'hurt' : 'blocked';
  }

  takeHit(attack: Attack, id: number, arena: Arena): HitResult | null {
    if (!this.alive || this.hitBy.has(id)) return null;
    const how = this.meets(attack);
    if (how === 'pass') return null;
    this.hitBy.add(id);
    if (how === 'blocked') return 'blocked';
    if (--this.hp > 0) { this.whiten(true); this.scene.time.delayedCall(80, () => this.whiten(false)); return 'hurt'; }
    this.alive = false;
    this.fill(false);
    this.pips?.setVisible(false);
    this.dropLoot(arena);
    this.leave(arena);
    return 'defeated';
  }

  protected leave(_arena: Arena): void {
    this.scene.tweens.add({ ...this.defeatTween(), onComplete: () => { this.gone = true; } });
  }

  protected defeatTween(): Phaser.Types.Tweens.TweenBuilderConfig {
    return { targets: this, x: this.x + 30, y: this.y - 26, angle: this.flipX ? -300 : 300, alpha: 0, duration: 420, ease: 'Quad.out' };
  }

  protected dropLoot(arena: Arena): void {
    this.letGo(arena.pickups, 40, -120);
  }

  protected carry(arena: SpawnArena, kind: ItemId, dy: number, depth: number, look?: ImageKey | false): ImageKey | undefined {
    if (!arena.loot(kind)) return undefined;
    const item = arena.pickups.look(kind);
    const image = this.scene.add.image(Math.round(this.x), Math.round(this.y + dy), look || item).setDepth(depth).setVisible(look !== false);
    this.carried = { kind, image, dy };
    this.once(Phaser.GameObjects.Events.DESTROY, () => this.carried?.image.destroy());
    return item;
  }

  protected letGo(pickups: Arena['pickups'], vx: number, vy: number): void {
    const c = this.carried;
    if (!c) return;
    pickups.drop(c.kind, c.image.x, c.image.y, vx, vy);
    c.image.destroy();
    this.carried = undefined;
  }

  protected whiten(on: boolean): void {
    this.fill(on && 0xffffff);
  }

  protected fill(color: number | false): void {
    if (color === false) this.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
    else this.setTint(color).setTintMode(Phaser.TintModes.FILL);
  }
}
