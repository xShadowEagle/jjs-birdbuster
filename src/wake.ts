// The browser drops the wake lock when the page is hidden.

/** Without a touch or a key; longer than the credits roll. */
const IDLE_MS = 3 * 60_000;

let wanted = false;
let lock: WakeLockSentinel | undefined;
let asking = false;
let idle = 0;

async function take(): Promise<void> {
  if (lock || asking || !wanted || document.visibilityState !== 'visible' || !navigator.wakeLock) return;
  asking = true;
  try {
    const got = await navigator.wakeLock.request('screen');
    got.addEventListener('release', () => { if (lock === got) lock = undefined; });
    lock = got;
    if (!wanted) drop();                    // the title came up while asking
  } catch {}
  asking = false;
}

function drop(): void {
  void lock?.release().catch(() => {});
  lock = undefined;
}

function touched(): void {
  window.clearTimeout(idle);
  if (!wanted) return;
  void take();
  idle = window.setTimeout(drop, IDLE_MS);
}

export function keepAwake(on: boolean): void {
  wanted = on;
  if (on) touched();
  else { window.clearTimeout(idle); drop(); }
}

export function initWake(): void {
  for (const e of ['pointerdown', 'keydown']) window.addEventListener(e, touched, { passive: true });
  document.addEventListener('visibilitychange', touched);
}
