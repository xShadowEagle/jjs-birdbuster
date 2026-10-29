# Node.js / Package Hygiene

The usual npm attack is a fresh malicious version plus an install script, caught by someone running `npm install` in that window. Our exposure is small: 16 JS packages plus prebuilt per-platform binaries (Rolldown, Lightning CSS, TypeScript); only the optional fsevents (macOS) has an install script, and `.npmrc` keeps it off. Keep it that way. A new runtime dependency (one that ships in the build) also needs its licence and credits (docs/recipes.md, section Credits).

## Project Settings
| Key                   | Why                                                                                                                                   |
|-----------------------|---------------------------------------------------------------------------------------------------------------------------------------|
| `ignore-scripts=true` | No package runs code at install. If a future dependency needs it, allow that one explicitly; don't flip this off.                     |
| `min-release-age=7`   | Never install a version younger than 7 days (npm 11 or newer; older npm ignores it). Most malicious versions are pulled within hours. |
| `save-exact=true`     | No `^` ranges; upgrades are deliberate.                                                                                               |

## Habits
- `npm ci`, not `npm install`: `ci` installs exactly the lockfile.
- Review lockfile diffs like code. A new transitive package: ask why.
- Add a dependency only if it earns its place: downloads, last publish, and that the npm package links to the repo you think it does.
- `npm audit` now and then; upgrade on purpose, one at a time.
- Before an upgrade, see what it brings: in a scratch folder with copies of `package.json`, `package-lock.json` and `.npmrc`, `npm install -D <pkg>@<version> --package-lock-only` resolves the new tree without downloading; comparing the two lockfiles lists every package added or dropped, and any with an install script.
- No `npx` of anything unread: it downloads and runs code in one step.
- `npm run dev` listens on the LAN: only on trusted Wi-Fi.
