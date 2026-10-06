# One Sheet

A multiplayer paper-plane game: <https://swwilshub.github.io/paperfield/>

Fold an A4 sheet, set the wings, pick a paper and let it go. The same automatic thrower flies every
plane through a deterministic physics model, and every plane ever thrown stays where it landed in a
shared 3D field. Points come from distance, hang time and records.

There's nothing to type and nothing to draw: the only thing a player leaves behind is the plane.

## How it plays

- **The field** fills the screen. Drag to look around, pinch or scroll to zoom, tap a plane to see it
  and watch its throw again.
- **Every action is in the dock** at the bottom. *Fold a plane* opens the designer, one step at a time:
  1. **Fold**: drag across the sheet to crease it. Folds are mirrored, like a real plane.
  2. **Wings**: set the keel line, which decides what hangs down and what becomes wing.
  3. **Release**: pick a paper (18 colours and printed patterns) and throw.
- **The throw** plays as an event: countdown, flight, landing, then a points breakdown.
- **Throw limit** scales with how busy the field is: one a minute when it's quiet, stretching towards
  one an hour when it's packed (`src/net/cooldown.js`).
- **Pilots** get a generated name such as "Amber Heron"; planes are named by paper, e.g. "Graph paper plane".

## Run locally

```sh
npm run serve                  # python3 -m http.server 8080
open http://localhost:8080/
```

No build step: native ES modules, with pinned CDN versions in the import map (`index.html`).

| URL option  | Effect                                              |
|-------------|-----------------------------------------------------|
| `?local`    | Play without Firebase (planes saved in this browser) |
| `?nolimit`  | No throw limit (local play only)                    |
| `?emulator` | Use the Firebase emulators (localhost only)         |

Reset local play with `localStorage.removeItem('onesheet-local-v1')` in the console.

## Tests

```sh
npm test               # physics golden, music, throw limit and paper set (node --test)
npx playwright test    # smoke: full-screen layout, no console errors, fold → wings → release → reveal
npm run test:emulator  # Firestore rules, the Firebase adapter and a two-browser multiplayer test
```

One-time setup: `npm ci && npx playwright install chromium`. The emulator tests also need Java.

**Physics is pinned to the prototype.** `tests/golden.json` comes only from `legacy/one-sheet-game.html`
(`npm run golden`), and the port must match it bit for bit. Changing physics means regenerating the golden
file and writing down why.

## Multiplayer (Firebase)

Project `paperfield-ab53c`; the web config is in `src/net/firebase-config.js` (not secret: the rules
protect the data). Players sign in anonymously; planes and pilots live in Firestore, and new throws appear
for everyone live. If Firebase can't be reached, the game falls back to local play.

**Security rules** (`firestore.rules`, tested against the emulator):

- A throw is one batch: the plane is created and the pilot updated together, or neither.
- The score must rise by exactly the plane's points; plane docs must have the exact shape, a paper from
  the fixed set and server timestamps; a 50-second floor between throws.
- Only admins (`admins/{uid}`, added by hand) can delete planes.
- Known gap: points are computed in the browser, so a cheater could claim up to the 1500 cap per throw.

**Changing the rules:** edit `firestore.rules`, run `npm run test:emulator`, then paste the file into the
[Firebase console](https://console.firebase.google.com/project/paperfield-ab53c/firestore/rules) and
*Publish* (or `npx firebase deploy --only firestore:rules`). Changes to the paper set or the throw floor
need this, or new planes are refused.

**Making someone an admin:** copy their UID from *Authentication → Users*, then in Firestore add a document
with that ID to the `admins` collection (no fields needed).

**Free-tier budget** (Spark plan: 50K reads and 20K writes a day, 1 GiB stored): a first visit reads up to
550 documents (500 planes, 50 pilots); return visits read only what changed. That's roughly 90 brand-new
visitors a day. A throw is 2 writes; a plane is 1–3.5 KB.

## Music

"Fade to Wind" by palettedisk, played as nine stems by a dynamic mixer (`src/audio/`):

- **Layers build as you play.** Calm piano, pads and wind on the field; strings, guitar, bass and
  percussion come in as you fold and set the wings; the full band for the throw, following its speed and
  height; a swell on landing.
- **Generated as it plays.** The song is cut into 8-bar phrases. Each next phrase is picked from those
  that fit harmonically, weighted to the moment, so it never repeats exactly. Seeded by plane, so everyone
  watching a throw hears the same thing.
- **Light on phones.** Only the next phrase or two are fetched and decoded.

```sh
python3 tools/build-music.py Fade_to_Wind_Stems.zip assets/music   # rebuild phrase files (ffmpeg, numpy)
python3 -m http.server 8090 & node tools/preview-music.mjs out.mp3  # render a scripted session to listen to
```

## Deploy

`.github/workflows/ci.yml` runs all tests on every push. On `main` (or the default branch) it deploys
to GitHub Pages, then loads the live site and fails on console errors.

## Code layout

```
index.html           markup: field, sheets, dock
styles/main.css      design tokens and layout
src/main.js          boot
src/core/            physics: folds, geometry, aero, sim, thrower (no DOM; runs in Node)
src/ui/              app shell (tabs.js), fold, wings, papers + swatch picker, shapes, release, board
src/world/           3D field: scene, plane meshes, throw events
src/audio/           music API and sound effects, stem mixer, phrase sequencer
src/net/             store adapter (local / Firebase), throw limit, pilot names, plane doc
assets/music/        generated phrase files + manifest
tests/               unit, smoke, rules, adapter and multiplayer tests
tools/               golden-file generator, music builder and preview
legacy/              the original single-file prototype
```

[PLAN.md](PLAN.md) has the milestones; [CLAUDE.md](CLAUDE.md) has the constraints for contributors.
