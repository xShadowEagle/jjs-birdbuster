import type { Block } from './symbols';

export const SWAMP_INTRO: Block = {
  name: 'swamp-intro',
  tier: 1,
  rows: [
    '....f.....................k.....',
  ],
};

export const SWAMP: Block[] = [
  {
    name: 'sprinter',
    tier: 1,
    rows: [
      '..f..............k......',
    ],
  },
  {
    name: 'sprinter-2',
    tier: 1,
    rows: [
      '...............k........',
    ],
  },
  {
    name: 'puddle',
    tier: 1,
    rows: [
      '..f.........__..........',
    ],
  },
  {
    name: 'sprinter-pit',
    tier: 2,
    rows: [
      '..........k..........___.......',
    ],
  },
  {
    name: 'two-sprinters',
    tier: 2,
    rows: [
      '..f.......k.........k..........',
    ],
  },
  {
    name: 'needles',
    tier: 2,
    rows: [
      '.................K.............',
    ],
  },
  {
    name: 'lunge-pit',
    tier: 2,
    rows: [
      '..f..............r..........__....',
    ],
  },
  {
    name: 'bridge',
    tier: 2,
    rows: [
      '..........======..........',
      '',
      '..f.......____............',
    ],
  },
  {
    name: 'marsh', // the Kaktu far enough on that it doesn't come as the bird lands
    tier: 3,
    rows: [
      '.......__..............k.........___.....',
    ],
  },
  {
    name: 'big-one',
    tier: 3,
    rows: [
      '..f..................G.........',
    ],
  },
  {
    name: 'gauntlet',
    tier: 3,
    rows: [
      '.........K..........k..........r.......',
    ],
  },
];
