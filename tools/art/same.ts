// Compares every PNG in workbench/drafts/<set>/ with the file it stands in for under public/assets/,
// pixel by pixel: each should say "same"; fails otherwise.
//   npm run art:same -- <set> [<set> ...]
import { existsSync, readFileSync } from 'node:fs';
import { decodePng } from './lib/png.ts';
import { liveFile } from './lib/drafts.ts';
import { filesUnder } from '../files.ts';

const sets = process.argv.slice(2);
if (!sets.length) throw new Error('which draft set? npm run art:same -- <set>');
let bad = 0;
for (const set of sets) {
  const dir = `workbench/drafts/${set}/`;
  if (!existsSync(dir)) throw new Error(`no draft set ${dir}`);
  for (const f of filesUnder(dir).filter(f => f.endsWith('.png'))) {
    const live = `public/assets/${liveFile(f)}`;
    let verdict: string;
    if (!existsSync(live)) verdict = 'no such file in the game';
    else {
      const a = decodePng(readFileSync(dir + f)), b = decodePng(readFileSync(live));
      let differ = 0;
      if (a.w !== b.w || a.h !== b.h) verdict = `different size (${a.w}x${a.h}, the game's ${b.w}x${b.h})`;
      else {
        for (let i = 0; i < a.rgba.length; i += 4) {
          const clear = a.rgba[i + 3] === 0 && b.rgba[i + 3] === 0;
          if (!clear && [0, 1, 2, 3].some(c => a.rgba[i + c] !== b.rgba[i + c])) differ++;
        }
        verdict = differ ? `${differ} pixels differ` : 'same';
      }
    }
    if (verdict !== 'same') bad++;
    console.log(`  ${set}/${f}`.padEnd(56), verdict);
  }
}
if (bad) process.exit(1);
