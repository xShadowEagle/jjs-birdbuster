import { gate } from './gate';
import { showAsleep } from './asleep';
import { sayHello } from './hello';

// Small on purpose: index.html shows nothing until the gate has picked the loading screen or the asleep one.
const gateIs = gate();
if (gateIs === 'open') start(import('./game'));
else if (gateIs === 'napping') {
  const game = import('./game');                          // fetched while Bobo is poked awake
  showAsleep(audio => start(game, audio));
} else showAsleep();
if (!import.meta.env.DEV) sayHello(gateIs);

function start(game: Promise<typeof import('./game')>, audio?: AudioContext): void {
  document.getElementById('loading')!.hidden = false;
  void game.then(g => g.start(audio));
}
