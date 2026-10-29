import type { MusicKey } from '../assets/manifest';
import { LEVELS } from '../levels';
import { CUTSCENES } from './cutscenes';
import { FLOW, type FlowEntry } from './flow';

const musicOf = (entry: FlowEntry | undefined): MusicKey =>
  (!entry || entry.kind === 'credits' ? 'title' : entry.kind === 'level' ? LEVELS[entry.id].music : CUTSCENES[entry.id].music ?? 'cutscene');

export const musicAt = (index: number): MusicKey => musicOf(FLOW[index]);

const rainbowMusicOf = (entry: FlowEntry): MusicKey | undefined => (entry.kind === 'level' ? LEVELS[entry.id].rainbowMusic : undefined);

export const storyMusic = (): MusicKey[] =>
  [...new Set(FLOW.flatMap(s => [musicOf(s), rainbowMusicOf(s)].filter(k => k !== undefined)))];
