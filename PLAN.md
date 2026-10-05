# One Sheet: milestones

Each milestone ends in a working, deployable state. Don't start the next one until the current one's checks pass.

---

## M1: Modular port, local play on GitHub Pages (about 2 h)

Goal: the prototype split into ES modules, working without a backend, live on Pages.

1. Copy the prototype to `legacy/`. Split the physics core into `src/core/*` with no DOM access, so the same files run in Node.
2. Write golden tests in `tests/physics.test.js` (`node --test`). Use 5 fixed plane specs: classic dart, flat sheet, all-keel, landscape glider, nose-heavy float. Each has a fixed seed. Record `dist`, `time`, `maxZ` and `loops` from the legacy file first, then assert the port matches to 0.01.
3. Split the UI, world and audio into modules. Keep three.js r128 behaviour, loaded through the import map.
4. Add `src/net/store.js` as an adapter interface: `connect`, `me`, `onPlanes`, `onPilots`, `savePlane`, `nameOf`. Implement `local.js` to keep state in memory and in `localStorage`.
5. Add a GitHub Actions workflow that runs the physics tests on push. Deploy Pages from `main`.

**Done when:**
- The golden tests pass.
- The Pages URL loads with no console errors.
- A full fold → draw → release → event → reveal loop works in local mode on a phone.

---

## M2: Firebase multiplayer (about 3 h)

Goal: a shared persistent field for anyone with the link.

1. Use the Firebase modular SDK from the gstatic CDN, with a pinned version. Sign in anonymously. On first visit, ask for a nickname (2–20 characters) and store it on the pilot doc.
2. Set up the data model:
   - **`pilots/{uid}`**: `{nick, score, planes, last, lastPlane, pbDist, pbTime}`.
   - **`planes/{id}`**: the prototype's plane doc fields plus `uid`.

   Use a top-level `planes` collection, so one query feeds the field.
3. **Live data.** Subscribe with `onSnapshot` on `planes` ordered by `at`, limited to 500, and on `pilots` ordered by `score`, limited to 50. New remote planes trigger the existing "just threw… Watch" toast.
4. **Saving.** Save with a single `writeBatch`: create the plane doc and update the pilot doc together. Set `at`/`last` with `serverTimestamp()`.
5. **Persistence and setup.** Enable Firestore persistent local cache, so return visits don't re-read every plane. Document the Firebase console setup steps in the README (project, web app, Firestore, Anonymous auth, authorised domain `<user>.github.io`).

**Done when:**
- Two browsers on different devices see each other's planes appear live.
- Reloading shows all planes in place.
- Offline fallback still works when Firebase is blocked.

---

## M3: Rules enforced by the database (about 3 h)

Goal: the hourly limit, ownership and doc shape are checked by Firestore, not just the browser.

1. Write `firestore.rules`. The sketch below is a starting point only, not verified; the emulator tests decide.
   ```
   match /pilots/{uid} {
     allow read: if true;
     allow write: if request.auth.uid == uid
       && request.resource.data.last == request.time
       && (resource == null || request.time > resource.data.last + duration.value(1, 'h'))
       && getAfter(/databases/$(db)/documents/planes/$(request.resource.data.lastPlane)).data.uid == uid
       && request.resource.data.score == (resource == null ? 0 : resource.data.score)
            + getAfter(/databases/$(db)/documents/planes/$(request.resource.data.lastPlane)).data.points;
   }
   match /planes/{id} {
     allow read: if true;
     allow create: if request.resource.data.uid == request.auth.uid
       && request.resource.data.at == request.time
       && getAfter(/databases/$(db)/documents/pilots/$(request.auth.uid)).data.lastPlane == id;
     allow delete: if isAdmin();
   }
   ```
2. Validate the plane doc's shape:
   - `keys().hasOnly([...])`
   - `name` up to 28 characters
   - `folds` up to 28 entries
   - `img` is a string under 150 000 characters
   - `points` between 0 and 1500
   - `tr` up to 1000 numbers
3. Add an admin role: an `admins/{uid}` doc, readable by everyone and writable only from the console. Admins can delete or hide planes.
4. Write rules tests in `tests/rules.test.js` against the Firestore emulator. They must cover:
   - a second plane inside the hour is rejected
   - writing to another pilot is rejected
   - an inflated score is rejected
   - an oversized image is rejected
   - an admin delete is allowed
5. Deploy the rules with `firebase deploy --only firestore:rules`, but only after asking me.

**Done when:**
- All rules tests pass in CI, using the emulator in GitHub Actions.
- Releasing twice within an hour fails, even when called from the browser console.

---

## M4: Scale, performance and polish (about 4 h)

Goal: the game stays smooth with 1 000+ planes on a mid-range phone.

1. Split each plane into a light `planes/{id}` doc (pose and stats) and an `art/{id}` doc holding the texture. Load art lazily for planes within about 60 m of the camera or on tap. Show distant planes as instanced, untextured meshes.
2. Upgrade three.js from r128 to a current pinned version via the import map. Fix colour-management differences so the paper and ground look the same as before.
3. Add a frame-time budget: lower the pixel ratio and cut confetti if the frame rate stays under 45 fps.
4. Accessibility:
   - make the fold tool keyboard-operable (two points set with arrow keys and Enter)
   - honour reduced motion
   - read results out to screen readers
5. Audio: fade in ambient music only after the first interaction, and add a master volume control.

**Done when:**
- A seeded field of 1 500 fake planes holds 50 fps or more on a mid-range Android phone.
- First load reads fewer than 600 documents.

---

## M5: Public launch and moderation (about 2 h)

Goal: safe to share publicly.

1. **Reporting.** Add a "Report" button on the plane card that writes a `reports/{id}` doc. The reporter's ID is checked by the rules.
2. **Moderation view.** Add an admin view at `?admin` that lists reports and lets you hide or delete planes.
3. **Nicknames.** Apply a nickname filter (blocklist plus length and character rules) on the client and in the rules where possible.
4. **README.** Cover how to play, how the physics works, Firebase setup, the rules deploy, and the cost notes. Check Firebase's current free-tier quotas and note them.
5. **Launch check.** Test on iOS Safari and Android Chrome, check social-preview metadata, and optionally set up a custom domain.

**Done when:**
- A stranger can open the link, pick a nickname, fold, throw and appear on the leaderboard.
- You can remove a plane in under 30 seconds.

---

## Stretch (not scheduled)

- **Server-side re-simulation.** A Cloud Function would re-run `throwPlane` on create and reject mismatched results. This needs the Firebase Blaze plan; the physics is already deterministic.
- **Seasons.** Monthly leaderboard resets, with an archive of past fields.
- **Live spectating.** Show everyone watching a throw at the same moment.
