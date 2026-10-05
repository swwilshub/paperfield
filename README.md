# One Sheet

Fold one A4 paper plane an hour, pick a paper colour, release it. There are no drawings or plane names: the only thing a player leaves behind is the plane. A fixed automatic thrower flies it through a deterministic physics model, and every plane stays where it landed.

Status: **M2**. Shared multiplayer field on Firebase once `src/net/firebase-config.js` is filled in (see Multiplayer); until then, local play (planes saved in this browser).

## Run locally

```sh
npm run serve          # python3 -m http.server 8080
open http://localhost:8080/
```

No build step: native ES modules, with three.js r128 pinned through the import map in `index.html`.
Add `?nolimit` to the URL to switch off the throw limit in local mode.
To reset the local field, run `localStorage.removeItem('onesheet-local-v1')` in the console.

## Tests

```sh
npm test               # physics golden, music sequencer and throw-limit tests (node --test)
npm ci && npx playwright install chromium
npx playwright test    # smoke: page loads with no console errors; full fold → trim → release → reveal loop on a phone viewport
BASE_URL=https://<user>.github.io/paperfield/ npx playwright test -g "no console errors"   # check the live site
```

`tests/golden.json` is produced **only** from the legacy file: `npm run golden` runs the prototype's physics core in Node on the specs in `tests/fixtures/specs.json`. The port must match it to 0.01 and, in the same runtime, bit for bit. Changing physics means regenerating the golden file and writing down why.

## Music

"Fade to Wind" by palettedisk, played as nine stems by a dynamic mixer:

- **Progressive layers.** Each stage sets a level per stem. The idle field is felt piano, pads and wind. Folding, wings, trim and release bring in strings, guitar, bass and percussion. The countdown builds, the throw brings in the full band (drums and percussion follow speed, brass and strings follow height), the landing swells, then it settles back.
- **Generated as it plays.** The song is cut into 8-bar phrases (120 BPM, 2 s bars). At each phrase end the sequencer picks the next one at random from those that fit harmonically after the current bar, weighted to suit the stage and away from recent phrases, so the arrangement never repeats exactly. A throw jumps to a fitting full-band phrase at the next bar line. It is seeded by plane, so everyone watching a throw hears the same arrangement.
- **Light on phones.** Only the phrases about to play are fetched (about 0.5–1 MB each) and decoded at 32 kHz; at most three are kept.

Rebuild the phrase files from the stems zip (needs ffmpeg and numpy):

```sh
python3 tools/build-music.py Fade_to_Wind_Stems.zip assets/music
```

Listen to a scripted session (idle → fold → wings → trim → release → throw → land → idle) rendered offline through the real mixer:

```sh
python3 -m http.server 8090 &
node tools/preview-music.mjs music-preview.mp3
```

## Multiplayer (Firebase)

With `src/net/firebase-config.js` filled in, everyone shares one field: anonymous sign-in, planes and the
leaderboard live in Firestore, and new throws appear for everyone as they happen. If Firebase can't be
reached, the game falls back to local play.

- **No player-written text.** Pilots get a generated name from their anonymous ID (e.g. "Amber Heron");
  planes are labelled by paper colour.
- **Throw limit scales with activity** (`src/net/cooldown.js`): 3 min × (pilots this hour + planes in the
  last 10 min ÷ 2), between 2 and 60 min. The rules enforce the 2-minute floor.
- **Security rules** (`firestore.rules`): a throw must create the plane and update the pilot in one batch;
  the score must rise by exactly the plane's points (capped at 1500); exact plane shape, palette colours
  only, server timestamps only; only admins (`admins/{uid}`, added by hand) can delete planes.
  Points are still computed in the browser, so a determined cheater could claim up to 1500 a throw.

### Setup (about 10 minutes, free Spark plan)

1. **Project.** <https://console.firebase.google.com> → *Create a project* (any name, e.g. `one-sheet`).
   Google Analytics isn't needed.
2. **Web app.** Project overview → the web icon `</>` → nickname `One Sheet` → don't tick Hosting →
   *Register app*. Copy the `firebaseConfig = { … }` object it shows.
3. **Firestore.** *Build → Firestore Database → Create database* → Standard edition → pick a location
   near your players (e.g. `europe-west2`, London; this can't be changed later) → *Start in production mode*.
4. **Rules.** Firestore → *Rules* tab → replace everything with the contents of `firestore.rules` → *Publish*.
5. **Anonymous sign-in.** *Build → Authentication → Get started → Sign-in method → Anonymous → Enable → Save*.
6. **Authorised domain.** Authentication → *Settings → Authorized domains → Add domain* →
   `swwilshub.github.io`.
7. **Config.** Put the object from step 2 in `src/net/firebase-config.js`:
   ```js
   export const firebaseConfig={apiKey:'…',authDomain:'….firebaseapp.com',projectId:'…',storageBucket:'…',messagingSenderId:'…',appId:'…'};
   ```
   Commit and push; Pages redeploys. The web config isn't secret (the rules protect the data), so it's fine in the repo.
8. **Optional, recommended.** Google Cloud console → *APIs & Services → Credentials* → the "Browser key"
   → *Application restrictions: Websites* → add `https://swwilshub.github.io/*` (and `http://localhost:8080/*` for local testing).
9. **Admin (for removing planes).** Play once on the live site, then Firebase console → Authentication →
   *Users*: copy your user UID. Firestore → *Start collection* `admins` → document ID = that UID, no fields needed.

When the rules change later, paste the new `firestore.rules` again (or `npx firebase deploy --only firestore:rules`).

### Free-tier budget

Spark plan: 50K document reads/day, 20K writes/day, 1 GiB stored, 10 GiB/month egress. A first visit reads
up to 500 planes + 50 pilots (~550 reads, ~1.5 MB); return visits use the local cache and read only what
changed. So roughly 90 brand-new visitors a day fit in the free reads. A throw is 2 writes; a plane doc is
1–3.5 KB, so 1 GiB holds ~300K planes. M4 reduces first-load reads.

### Testing locally against the emulators

```sh
npm run test:emulator   # rules tests, adapter test (two players), and a two-browser Playwright test
npm run emulators       # or run them yourself, then open http://localhost:8080/?emulator
```

## Deploy (GitHub Pages)

`.github/workflows/ci.yml` runs the tests on every push. On `main` (or the repo's default branch) it also deploys to Pages and then loads the live URL to check for console errors.

One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Layout

```
index.html              markup; loads styles/main.css and src/main.js
src/core/               physics: folds, geometry, aero, sim, thrower (no DOM; runs in Node)
src/ui/                 state.js (shared state), tabs, fold, wings, trim, shapes (plane outlines), release, board
src/world/              scene.js (renderer, camera, loop), planes.js (meshes, picking), event.js (throw replay)
src/audio/              music.js (API, sound effects), mixer.js (stem player), sequencer.js (generative arrangement)
assets/music/           phrase files + manifest.json (generated; see Music)
src/net/                store.js (adapter interface), local.js, firebase.js (M2), firebase-config.js
tests/                  physics.test.js, golden.json, fixtures/specs.json, smoke.spec.js
tools/run-legacy.cjs    regenerates golden.json from the legacy file
```
