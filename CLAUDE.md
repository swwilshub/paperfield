# One Sheet

A multiplayer paper-plane game. Players fold an A4 sheet in the browser (how often depends on how busy the field is: src/net/cooldown.js), pick a paper, and release it. A fixed automatic thrower flies it through a physics model. Every plane stays where it landed in a shared 3D field. Points come from distance, hang time and records.

## Source of truth

`legacy/one-sheet-game.html` is the working prototype, built as a claude.ai artifact. Everything in it works except persistence, which depends on `window.claude.use('db')` and `window.claude.use('user')`. Those only exist inside claude.ai. Port the behaviour; don't redesign it unless PLAN.md says so.

The prototype has four parts:
- **Physics core**: the first `<script>`. It holds the fold engine (`foldPolys`, `applyFolds`), the 2 mm layer raster (`geometry`), aero (`aeroModel`), the 3-DOF flight sim (`simulate`) and the automatic thrower (`throwPlane`).
- **App**: the second `<script>`, in sections marked `// ===== <name> =====`. They are tabs, folding, wings, trim, drawing, release, board, audio, 3D world and network.
- **Styles**: one `<style>` block with design tokens on `:root`, plus a dark theme.
- **Dependency**: three.js r128 as a UMD global from cdnjs.

## Hard constraints

- **Physics must stay bit-for-bit deterministic.** The same plane spec and the same seed must give the same flight on every machine, because everyone watches the same seeded throws. Any change to the physics core needs golden-test updates and a written reason.
- **No user-written content on planes.** Drawing and plane names were removed so the only thing a player leaves behind is the plane itself (folds, keel line, a paper from the fixed set in `src/ui/papers.js`: colours and printed patterns). Planes are labelled by paper, e.g. "Graph paper plane". Don't add free text or images to plane docs.
- **Full-screen field, one dock.** The 3D field fills the screen; every action lives in the bottom dock (`#dock`), one row per mode (`body[data-mode]`), main action centred. Building happens in a bottom sheet whose content is per step, so the fold step can be swapped for 3D folding (tap to fold the sheet to the middle, crease the wings with a finger) without touching the dock.
- **The designer is just Paper → Fold → Wings → Release.** Trim is fixed (elevator 6°, wing angle 5°, aim for distance, 80 gsm); no controls for it.
- **Folds stay mirrored.** The flight model is 2D longitudinal, so asymmetric planes can't be simulated honestly.
- **Static hosting only.** The site is served by GitHub Pages. No server code except Firebase services, and only if PLAN.md calls for them.
- **Backend is Firebase.** It provides Auth (anonymous; pilot names are generated, never typed) and Firestore. The Firebase web config goes in `src/net/firebase-config.js`. It is not secret; security comes from Firestore rules.
- **No build step at first.** Use native ES modules and an import map with pinned CDN versions. Add Vite only if a milestone needs it.
- **The page must still work when the backend is unreachable.** It falls back to local, unsaved play, as the prototype does.

## Layout to create

```
index.html
src/core/      folds.js geometry.js aero.js sim.js thrower.js
src/ui/        state.js tabs.js (app shell: modes, sheets, dock) fold.js wings.js papers.js (the paper set + pattern tiles) paper.js (swatch picker) shapes.js release.js board.js
src/world/     scene.js planes.js event.js
src/audio/     music.js (game-facing API) engine.js (procedural chill band + event cues) theory.js (pure, seeded keys/chords/scales)
src/net/       store.js (adapter interface) local.js firebase.js firebase-config.js cooldown.js (throw limit) pilots.js (generated pilot names) planedoc.js (the saved plane doc)
styles/        main.css
tests/         physics/theory/cooldown/papers.test.js (node --test) rules.test.js firebase.test.js multiplayer.spec.js (emulators) smoke.spec.js (Playwright)
firestore.rules  firebase.json  README.md  PLAN.md
legacy/one-sheet-game.html
```

## Working agreement

- **Order of work.** Work milestone by milestone from PLAN.md. Stop at the end of each one with a short report: what now works, how to verify it, and what's next.
- **Steps.** Number multi-step work, one bounded action per step, at most 5 items per list.
- **Reporting.** Lead with the command, path or snippet. No preamble or recap.
- **Errors.** State the location, the cause and the fix.
- **Before destructive actions.** Ask first: deleting files, rewriting git history, changing Firestore rules on a live project.
- **Repeated failure.** After three failed fixes for the same problem, stop and name the assumption you doubt.
- **Commits.** Small commits with messages in the imperative. Never commit service-account keys or `.env` files.
