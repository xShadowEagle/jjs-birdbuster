import type Phaser from 'phaser';
import { SCENES } from '../scenes/keys';
import type { LevelId } from '../levels';
import type Level from '../scenes/Level';
import type { LevelData } from '../scenes/Level';
import type Cutscene from '../scenes/Cutscene';
import type Credits from '../scenes/Credits';
import type { CutsceneId } from './cutscenes';
import { saveStepId, savedStepId } from '../save';

export type FlowEntry =
  | { kind: 'cutscene'; id: CutsceneId }
  | { kind: 'level'; id: LevelId }
  | { kind: 'credits' };

export const FLOW: FlowEntry[] = [
  { kind: 'cutscene', id: 'intro' },
  { kind: 'cutscene', id: 'trail' },
  { kind: 'level', id: 'l1' },
  { kind: 'cutscene', id: 'l1-l2' },
  { kind: 'level', id: 'l2' },
  { kind: 'cutscene', id: 'l2-l3' },
  { kind: 'level', id: 'l3' },
  { kind: 'cutscene', id: 'l3-l4' },
  { kind: 'level', id: 'l4' },
  { kind: 'cutscene', id: 'l4-l5' },
  { kind: 'level', id: 'l5' },
  { kind: 'cutscene', id: 'l5-nest' },
  { kind: 'cutscene', id: 'nest-boss' },
  { kind: 'level', id: 'boss' },
  { kind: 'cutscene', id: 'ending' },
  { kind: 'cutscene', id: 'birthday' },
  { kind: 'credits' },
];

export type FlowScene = Level | Cutscene | Credits;

export const sceneOf = (entry: FlowEntry): typeof SCENES.Cutscene | typeof SCENES.Level | typeof SCENES.Credits =>
  ({ cutscene: SCENES.Cutscene, level: SCENES.Level, credits: SCENES.Credits })[entry.kind];

export const stepOf = (id: string): number => FLOW.findIndex(s => 'id' in s && s.id === id);

export const continueAt = (): number => stepOf(savedStepId() ?? '');

export interface StepData { step: number }

export function restartAt(game: Phaser.Game, index: number, extra?: Pick<LevelData, 'from'>): void {
  const scenes = game.scene;
  for (const s of scenes.getScenes(false)) if (s.sys.isActive() || s.sys.isPaused()) scenes.stop(s.scene.key);
  // any scene's plugin can start the next, even a stopped one's
  playStep(scenes.getScene(SCENES.Title), index, extra);
}

export function playStep(scene: Phaser.Scene, index: number, extra?: Pick<LevelData, 'from'>): void {
  const entry = FLOW[index];
  const scenes = scene.scene;
  scenes.stop(SCENES.HUD);
  if (!entry) { scenes.start(SCENES.Title); return; }
  saveStepId(index > 0 && entry.kind !== 'credits' ? entry.id : undefined);
  scenes.start(sceneOf(entry), { ...extra, ...entry, step: index } satisfies StepData);
}
