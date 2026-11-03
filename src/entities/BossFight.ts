import type Phaser from 'phaser';
import type { ButtonId } from '../constants';
import type Boss from './enemies/Boss';
import type { BossSpec } from './enemies/Boss';
import { makeBoss } from './enemies/bosses';
import type { LimePart } from './enemies/Lime';
import type Enemies from './Enemies';

const NEXT_MS = 2200;

export interface BossStart { boss: number; part?: LimePart }

export interface BossState { index: number; count: number; hp: number; max: number }

export default class BossFight {
  private index = -1;
  private current?: Boss<string>;
  private waitUntil = 0;
  beaten = false;

  get hint(): ButtonId | undefined { return this.current?.alive ? this.current.hint : undefined; }

  get defeated(): number { return this.index + (this.current?.alive ? 0 : 1); }
  get allDown(): boolean { return this.defeated >= this.specs.length; }

  constructor(private readonly scene: Phaser.Scene, private readonly enemies: Enemies, private readonly specs: BossSpec[], private readonly from: BossStart | undefined,
    private readonly onChange: (s: BossState | null) => void, private readonly onBoss: (boss: Boss<string>) => void) {
    if (from) this.index = Math.min(from.boss, specs.length - 1) - 1;
  }

  update(time: number, camLeft: number): void {
    const boss = this.current;
    if (boss?.alive) return;
    const last = this.index + 1 >= this.specs.length;
    if (boss) {
      this.waitUntil = time + (last ? boss.beatenMs : NEXT_MS);
      this.current = undefined;
      this.onChange(null);
      return;
    }
    if (time < this.waitUntil) return;
    if (last) this.beaten = this.index >= 0;
    else this.spawnNext(camLeft);
  }

  private spawnNext(camLeft: number): void {
    const spec = this.specs[++this.index];
    const report = (hp: number) => this.onChange({ index: this.index, count: this.specs.length, hp, max: spec.hp });
    const boss = makeBoss(this.scene, camLeft, spec, this.index === this.from?.boss ? this.from.part : undefined);
    this.onBoss(boss);
    boss.onHp = report;
    this.enemies.add(boss);
    this.current = boss;
    report(spec.hp);
  }
}
