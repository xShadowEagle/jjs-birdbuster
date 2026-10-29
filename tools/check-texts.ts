// Checks the game's texts (src/texts/en.ts) and the other languages' (src/texts/<id>.ts):
//   - every key in en.ts is used somewhere in src/, written out as a literal ('pause.title')
// Run: npm run check:texts      -- --missing de   what German still lacks   -- --all   every text
import { readFileSync } from 'node:fs';
import { EN, type TextKey } from '../src/texts/en.ts';
import { LANGUAGES, TEXTS, TODO } from '../src/language.ts';
import { CUTSCENES } from '../src/story/cutscenes/index.ts';
import type { Beat } from '../src/story/cutscene.ts';
import { textProblems } from './text-rules.ts';
import { filesUnder } from './files.ts';

const args = process.argv.slice(2);
const keys = Object.keys(EN) as TextKey[];
let failed = false;

const code = filesUnder('src')
  .filter(f => f.endsWith('.ts') && !f.startsWith('texts/')).map(f => readFileSync(`src/${f}`, 'utf8')).join('\n')
  + readFileSync('tools/art/page.ts', 'utf8');
const unused = keys.filter(k => !code.includes(`'${k}'`) && !code.includes(`"${k}"`));
console.log(`${keys.length} texts in English${unused.length ? `, ${unused.length} unused` : ''}`);
for (const k of unused) console.log(`   ✗ unused: ${k} ("${EN[k]}")`);
if (unused.length) failed = true;

for (const l of LANGUAGES) {
  const table = TEXTS[l.id];
  const todo = keys.filter(k => table[k] === TODO);
  if (l.id !== 'en') console.log(`  ${l.name}: ${keys.length - todo.length} of ${keys.length}${l.ready ? ' (offered)' : ' (not offered yet)'}`);
  if (l.ready && todo.length) { failed = true; console.log(`   ✗ offered, but ${todo.length} TODO: npm run check:texts -- --missing ${l.id}`); }
  if (args.includes('--missing') && args[args.indexOf('--missing') + 1] === l.id) for (const k of todo) console.log(`    ${k}: "${EN[k]}"`);
  for (const k of keys) {
    for (const p of textProblems(k, table[k])) { failed = true; console.log(`   ✗ ${l.name} ${k}: ${p} ("${table[k]}")`); }
  }
}

function actorOf(b: Beat): string | undefined {
  if ('say' in b) return b.at ?? b.say;
  if ('move' in b) return b.move;
  if ('emote' in b) return b.emote;
  if ('play' in b) return b.play;
  if ('show' in b) return b.show;
  if ('hide' in b) return b.hide;
  if ('face' in b) return b.face;
  return undefined;
}
for (const [id, c] of Object.entries(CUTSCENES)) {
  const actors = new Set(c.actors.map(a => a.id));
  c.beats.forEach((b, i) => {
    const who = actorOf(b);
    if (who !== undefined && !actors.has(who)) { failed = true; console.log(`   ✗ cutscene ${id}, beat ${i + 1}: it has no actor "${who}"`); }
  });
}

if (args.includes('--all')) for (const k of keys) console.log(`  ${k}: "${EN[k]}"`);
process.exit(failed ? 1 : 0);
