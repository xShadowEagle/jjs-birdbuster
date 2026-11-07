import { inEvery } from './language';
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

/** For whoever opens the browser's console: Bobo, awake or asleep, and a line. */
export function sayHello(asleep: boolean): void {
  console.log(`%c${BOBO[asleep ? 'asleep' : 'awake'].slice(1, -1)}`, ART);
  console.log(`%c${inEvery(asleep ? 'console.asleep' : 'console.hello').join('\n')}`, TEXT);
}
