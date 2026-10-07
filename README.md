# Paperfield

A multiplayer paper-plane game: <https://swwilshub.github.io/paperfield/>

Fold an A4 sheet, set the wings, pick a paper and let it go. The same automatic thrower flies every
plane through a deterministic physics model, and every plane ever thrown stays where it landed in a
shared 3D field. Points come from distance, hang time and records.

There's nothing to type and nothing to draw: the only thing a player leaves behind is the plane.

## How it plays

- **The field** fills the screen. Drag to look around, pinch or scroll to zoom, tap a plane to see it
  and watch its throw again.
- **Every action is in the dock** at the bottom. *Fold a plane* opens the designer, one step at a time
  (tap a step's name to jump back):
  1. **Paper**: 62 colours and printed patterns (graph, blueprint, tartan, sakura, honeycomb, rainbow…), or *Random*.
  2. **Fold**: drag across the sheet to crease it. Folds are mirrored, like a real plane. The first time, a short demo
     shows a corner being folded (*Show me* replays it).
  3. **Wings**: drag either end of the keel line to set how deep the keel hangs at the nose and tail; the rest is wing.
  4. **Release**: your plane turns slowly above the sheet. Release it and the sheet folds up in front of you, then the countdown starts.
- **The throw** plays as an event: countdown, flight, landing, then a points breakdown.
- **Sharing**: every plane has a link (`?plane=<id>`) that opens the field on that plane where it landed, and a
  Photo button that saves a captioned picture of it on the ground. Links carry only the plane's id, not its design.
- **Throw limit**: your first 3 planes have no wait. After that it scales with how busy the field is: one a minute when it's quiet, stretching towards
  one an hour when it's packed (`src/net/cooldown.js`).
- **Too good to be true**: a plane with an implausible result (over 100 m, 15 s, 25 m up or 5 loops) is re-flown
  with the real physics before it's shown. If its saved flight doesn't match, it stays in the database but out of the
  field, the records and its pilot's shown points; its share link plays the flight, then crumples it into a paper ball
  (`src/net/verify.js`).
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
npm test               # physics golden, music theory, throw limit and paper set (node --test)
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
  the fixed set and server timestamps; a 50-second floor between throws after a pilot's first 3 planes.
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

Procedural chill music made in code with Web Audio (`src/audio/`): electric piano, warm pad, soft bass,
brushed drums, glassy plucks, vinyl crackle and wind. Each song is generated from a seed (key, lo-fi
7th/9th chord progression, 70–84 BPM with a lazy swing), so it never needs a download.

- **It builds as you play.** Piano and pads on the field; bass and hats as you fold; drums as you set the
  wings; the full band on the release screen. The countdown rises, the flight has the whole band with
  wind and melody following speed and height, and the landing resolves before it settles back.
- **Each throw has its own song**, seeded by the plane, so everyone watching hears the same music.
- **Game events are musical cues** in the song's key: creases (rising with each fold), undo, start again,
  invalid creases, keel sliders, paper choice, opening records, tapping a plane, another player's plane
  arriving, distance milestones, loops, the peak, dives, the landing (brighter for a record, softer for a
  short hop), points rows, personal bests, the total, and your next plane becoming ready.

```sh
python3 -m http.server 8090 & node tools/preview-music.mjs out.mp3   # render a scripted session to listen to
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
src/ui/              app shell (tabs.js), fold, wings, papers + swatch picker, shapes, release, board, share (links + photos)
src/world/           3D field: scene, plane meshes, throw events, release preview + fold-up (preview, foldanim)
src/audio/           music API, procedural engine and event cues, music theory
src/net/             store adapter (local / Firebase), throw limit, pilot names, plane doc
tests/               unit, smoke, rules, adapter and multiplayer tests
tools/               golden-file generator, music preview renderer
legacy/              the original single-file prototype
```

[PLAN.md](PLAN.md) has the milestones; [CLAUDE.md](CLAUDE.md) has the constraints for contributors.
