export const RIVALS = {
  grey: { name: 'name.grey', color: 0x9c9cac, voice: 760 },
  teal: { name: 'name.teal', color: 0x2e9e96, voice: 900 },
  lime: { name: 'name.lime', color: 0x789426, voice: 1040 },
} as const;

export type RivalId = keyof typeof RIVALS;
export const RIVAL_IDS = Object.keys(RIVALS) as RivalId[];
