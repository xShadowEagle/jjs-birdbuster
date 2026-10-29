import Phaser from 'phaser';
import type Controls from '../controls';
import type Fx from '../fx';
import type { Shot } from '../fx';
import type { Box } from '../geom';
import type Player from './Player';
import { nextAttackId, type Attack } from './enemies/Enemy';
import { RAINBOW_BUTTONS, type RainbowButton } from '../ui/touch';
import { RAINBOW } from '../ui/colors';
import { sfx } from '../audio/sfx';
import { always, type Sounds } from './feedback';

const REFILL_MS = 2000;
const AURA = { everyMs: 60, back: 6, up: 26 };
const TRAIL = { everyPx: 12, alpha: 0.4, ms: 200 };

export default class Rainbow {
  given = false;
  private refills: Partial<Record<RainbowButton, Phaser.Time.TimerEvent>> = {};
  private shots: { id: number; attack: Attack; shot: Shot }[] = [];
  private readonly rainbowAttackIds: Record<RainbowButton, number> = { attack: -1, dash: -1 };
  private auraAt = 0;
  private trailX = 0;
  private trailHue = 0;

  constructor(private readonly scene: Phaser.Scene, private readonly controls: Pick<Controls, 'rainbowCharged'>, private readonly player: Player, private readonly fx: Fx, private readonly sound: Sounds = always) {}

  give(): void {
    this.given = true;
    for (const b of RAINBOW_BUTTONS) this.controls.rainbowCharged.add(b);
  }

  takesSwing(): boolean { return this.takes('attack', 'rainbowCleave', this.player.swingId, p => this.fx.rainbowCleave(() => p.body)); }

  takesDash(): boolean { return this.takes('dash', 'rainbowDash', this.player.dashId, p => this.fx.rainbowDash(() => p.body, p.view)); }

  private takes(button: RainbowButton, attack: 'rainbowCleave' | 'rainbowDash', birdAttackId: number, shoot: (p: Player) => Shot): boolean {
    if (!this.spend(button)) return false;
    this.rainbowAttackIds[button] = birdAttackId;
    this.sound(sfx[attack]);
    this.shots.push({ id: nextAttackId(), attack, shot: shoot(this.player) });
    return true;
  }

  get swingAttack(): Attack { return this.player.swingId === this.rainbowAttackIds.attack ? 'rainbowCleave' : this.player.swing; }

  get dashAttack(): Attack { return this.player.dashId === this.rainbowAttackIds.dash ? 'rainbowDash' : 'dash'; }

  hitting(): { attack: Attack; id: number; box: Box }[] {
    const out: { attack: Attack; id: number; box: Box }[] = [];
    this.shots = this.shots.filter(({ id, attack, shot }) => {
      const box = shot.box();
      if (box) out.push({ attack, id, box });
      return !shot.done();
    });
    return out;
  }

  /** 0 = charged, 1 = just spent */
  cooldown(button: RainbowButton): number {
    if (this.controls.rainbowCharged.has(button)) return 0;
    return Phaser.Math.Clamp(1 - (this.refills[button]?.getProgress() ?? 1), 0, 1);   // the timer's own clock: slow motion slows both
  }

  update(time: number): void {
    if (!this.given) return;
    const p = this.player;
    if (Math.abs(p.x - this.trailX) >= TRAIL.everyPx) {
      this.trailX = p.x;
      if (p.view.visible && !p.dashing(time)) this.fx.ghost(p.view, RAINBOW[this.trailHue++ % RAINBOW.length], TRAIL.alpha, TRAIL.ms);
    }
    if (!this.controls.rainbowCharged.size || time < this.auraAt) return;
    this.auraAt = time + AURA.everyMs;
    this.fx.aura(p.x - AURA.back + Phaser.Math.Between(-4, 4), p.y - Phaser.Math.Between(4, AURA.up));
  }

  private spend(button: RainbowButton): boolean {
    if (!this.controls.rainbowCharged.delete(button)) return false;
    this.refills[button] = this.scene.time.delayedCall(REFILL_MS, () => { if (this.given) this.controls.rainbowCharged.add(button); });
    return true;
  }
}
