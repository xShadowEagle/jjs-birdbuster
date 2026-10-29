import type { CutsceneDef } from '../cutscene';
import { intro } from './intro';
import { trail } from './trail';
import { l1l2 } from './l1-l2';
import { l2l3 } from './l2-l3';
import { l3l4 } from './l3-l4';
import { l4l5 } from './l4-l5';
import { l5Nest } from './l5-nest';
import { nestBoss } from './nest-boss';
import { ending } from './ending';
import { birthday } from './birthday';

export const CUTSCENES = {
  intro,
  trail,
  'l1-l2': l1l2,
  'l2-l3': l2l3,
  'l3-l4': l3l4,
  'l4-l5': l4l5,
  'l5-nest': l5Nest,
  'nest-boss': nestBoss,
  ending,
  birthday,
} satisfies Record<string, CutsceneDef>;

export type CutsceneId = keyof typeof CUTSCENES;
