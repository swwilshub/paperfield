# One Sheet

Fold one A4 paper plane an hour, pick a paper colour, release it. There are no drawings or plane names: the only thing a player leaves behind is the plane. A fixed automatic thrower flies it through a deterministic physics model, and every plane stays where it landed.

Status: **M1**. Modular port of `legacy/one-sheet-game.html`, local play only (planes are saved in this browser). Multiplayer comes in M2.

## Run locally

```sh
npm run serve          # python3 -m http.server 8080
open http://localhost:8080/
```

No build step: native ES modules, with three.js r128 pinned through the import map in `index.html`.
Add `?nolimit` to the URL to switch off the one-plane-an-hour limit in local mode.
To reset the local field, run `localStorage.removeItem('onesheet-local-v1')` in the console.

## Tests

```sh
npm test               # physics golden tests (node --test), no install needed
npm ci && npx playwright install chromium
npx playwright test    # smoke: page loads with no console errors; full fold → trim → release → reveal loop on a phone viewport
BASE_URL=https://<user>.github.io/paperfield/ npx playwright test -g "no console errors"   # check the live site
```

`tests/golden.json` is produced **only** from the legacy file: `npm run golden` runs the prototype's physics core in Node on the specs in `tests/fixtures/specs.json`. The port must match it to 0.01 and, in the same runtime, bit for bit. Changing physics means regenerating the golden file and writing down why.

## Deploy (GitHub Pages)

`.github/workflows/ci.yml` runs the tests on every push. On `main` (or the repo's default branch) it also deploys to Pages and then loads the live URL to check for console errors.

One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Layout

```
index.html              markup; loads styles/main.css and src/main.js
src/core/               physics: folds, geometry, aero, sim, thrower (no DOM; runs in Node)
src/ui/                 state.js (shared state), tabs, fold, wings, trim, shapes (plane outlines), release, board
src/world/              scene.js (renderer, camera, loop), planes.js (meshes, picking), event.js (throw replay)
src/audio/music.js      procedural music
src/net/                store.js (adapter interface), local.js, firebase.js (M2), firebase-config.js
tests/                  physics.test.js, golden.json, fixtures/specs.json, smoke.spec.js
tools/run-legacy.cjs    regenerates golden.json from the legacy file
```
