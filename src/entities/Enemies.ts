import type Phaser from 'phaser';
import { DROP_BEHIND, GAME_W } from '../constants';
import type Enemy from './enemies/Enemy';
import type { Arena, Attack, HitResult, SpawnArena } from './enemies/Enemy';
import type Player from './Player';
import type Rainbow from './Rainbow';
import Rogue, { RogueThrower } from './enemies/Rogue';
import Kaktu, { KaktuBig, KaktuShooter } from './enemies/Kaktu';
import Archid, { ArchidSwinger } from './enemies/Archid';
import Fae, { FaeThrower } from './enemies/Fae';
import { Wall, Web } from './enemies/Barrier';
import type { BlockSymbol } from '../track/symbols';
import { overlaps, type Box } from '../geom';

type Spawn = new (scene: Phaser.Scene, x: number, y: number, arena: SpawnArena) => Enemy;

export const ENEMY_SYMBOLS = {
  r: Rogue,
  R: RogueThrower,
  k: Kaktu,
  K: KaktuShooter,
  G: KaktuBig,
  a: Archid,
  A: ArchidSwinger,
  e: Fae,
  E: FaeThrower,
  '|': Web,
  '#': Wall,
} satisfies Partial<Record<BlockSymbol, Spawn>>;
export type EnemySymbol = keyof typeof ENEMY_SYMBOLS;
export const isEnemySymbol = (ch: string): ch is EnemySymbol => Object.prototype.hasOwnProperty.call(ENEMY_SYMBOLS, ch);

export const WAKE_AHEAD = 24;

export interface Hit { x: number; y: number; result: HitResult }

/** Seconds: 0 on some frames of a screen faster than 60 Hz, several steps' worth on a slow one. */
export const stepped = (scene: Phaser.Scene): number => scene.physics.world.stepsLastFrame / scene.physics.world.fps;

export default class Enemies {
  private readonly list: Enemy[] = [];

  constructor(private readonly scene: Phaser.Scene, private readonly arena: Omit<Arena, 'cameraRight' | 'add'>) {}

  onSpawn?: (enemy: Enemy) => void;

  spawn(symbol: EnemySymbol, x: number, y: number): void {
    const e = new ENEMY_SYMBOLS[symbol](this.scene, x, y, this.arena);
    this.list.push(e);
    this.onSpawn?.(e);
  }

  private arenaAt(camLeft: number): Arena {
    return { ...this.arena, cameraRight: camLeft + GAME_W, add: e => this.add(e) };
  }

  add(enemy: Enemy): void {
    this.list.push(enemy);
  }

  get all(): readonly Enemy[] { return this.list; }

  strikes(p: Player, rainbow: Rainbow, now: number, camLeft: number): Hit[] {
    const hits: Hit[] = [];
    const swing = p.swingBox(now), dash = p.dashBox(now);
    if (swing) hits.push(...this.strike(rainbow.swingAttack, p.swingId, swing, camLeft));
    if (dash) hits.push(...this.strike(rainbow.dashAttack, p.dashId, dash, camLeft));
    for (const { attack, id, box } of rainbow.hitting()) hits.push(...this.strike(attack, id, box, camLeft));
    return hits;
  }

  private strike(attack: Attack, id: number, box: Box, camLeft: number): Hit[] {
    const arena = this.arenaAt(camLeft);
    const hits: Hit[] = [];
    for (const e of this.list) {
      if (!e.alive || !overlaps(e.box, box)) continue;
      const result = e.takeHit(attack, id, arena);
      if (result) hits.push({ x: e.x, y: e.y, result });
    }
    return hits;
  }

  /** `dt`: `stepped`, not the frame's time: a boss keeping pace with the camera shook otherwise. */
  update(dt: number, camLeft: number, running: boolean, bird: Box): boolean {
    const arena = this.arenaAt(camLeft);
    let hit = false;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const e = this.list[i];
      if (running && dt > 0 && (e.alwaysStepped || e.x < arena.cameraRight + WAKE_AHEAD)) e.step(dt, arena);
      if (e.gone || (!e.alwaysStepped && e.x < camLeft - DROP_BEHIND)) { e.gone = true; e.destroy(); this.list.splice(i, 1); continue; }
      if (e.alive && !e.harmless && overlaps(e.box, bird)) hit = true;
    }
    return hit;
  }
}
