import { inEvery } from './language';
import type { Gate } from './gate';
import { UI, css } from './ui/colors';

// As printed (String.raw keeps the backslashes), between the line breaks after and before the backticks.
const BOBO = {
  asleep: String.raw`
               Z
   o-.__     Z
     ( - >  z
 \\_/ ) )
\~~~~~~~~~/
 '-------'
`,
  awake: String.raw`
      \|/
     ( o >
 \\_/   )
  \\___/
    / \
`,
};
const ART = 'font: bold 13px/1.25 monospace; color: goldenrod;';
// inline-block: Firefox clips an inline card's padding to its lines
const TEXT = `display: inline-block; background: ${css(UI.bg)}; color: ${css(UI.text)}; font: 12px monospace; padding: 6px 10px; border-radius: 6px;`;

const LINES = { open: 'console.hello', asleep: 'console.asleep', napping: 'console.napping' } as const;

/** For whoever opens the browser's console: Bobo, awake or asleep, and a line. */
export function sayHello(gate: Gate): void {
  console.log(`%c${BOBO[gate === 'open' ? 'awake' : 'asleep'].slice(1, -1)}`, ART);
  console.log(`%c${inEvery(LINES[gate]).join('\n')}`, TEXT);
}
