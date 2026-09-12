# DUAA | دعاء — Verification record

Everything below was executed in this repository. Numbers are copied from real command output, not
estimated. Nothing here claims a behaviour that was not observed.

---

## 1. Commands and results

| Check | Command | Result |
|---|---|---|
| Type safety | `npm run typecheck` (`tsc --noEmit`) | **exit 0** — no errors, `strict: true` |
| Lint | `npm run lint` (`expo lint` → ESLint 9 flat config) | **exit 0** — 0 errors, 0 warnings |
| Unit + screen tests | `npm test` (`jest`) | **147 passed / 147**, 12 suites, 2 projects |
| Web bundle (dev) | `npx expo start --web` then request the Metro entry bundle | HTTP 200, ~5.76 MB dev bundle, no unresolved-module errors |
| Production web build | `npx expo export --platform web` | **29 static routes** written to `dist/`, exit 0 |
| Static HTML shell | inspect `dist/index.html` | `<html lang="ar" dir="rtl">`, `theme-color` = `#F9F6EE` / `#0A1512` per scheme, body CSS colours come from tokens |
| Brand assets | `npm run brand:generate` | 12 PNG in `assets/images` + 4 SVG in `assets/logo`; re-running reproduces byte-identical files (verified by md5 of `icon.png` / `mark.svg` before and after) |
| Audio assets | `npm run audio:generate` | `assets/audio/tick.wav`, `assets/audio/chime.wav` (synthesised, typed via `src/types/assets.d.ts`) |
| Manifest ↔ tokens | `tests/manifest.test.ts` | 8 assertions that `app.json` colours equal the design tokens and that every referenced image exists |

Not executed (and why): iOS/Android native builds (no Xcode/Android SDK or device in this
environment), `expo prebuild`, EAS Build, and any real Firebase call (no project configured — by
design, see `docs/FIREBASE-INTEGRATION.md`).

---

## 2. Test inventory

Two Jest projects (`jest.config.js`).

### `logic` — Node environment, no React (7 suites / 94 tests)

| Suite | Tests | What it proves |
|---|---|---|
| `tests/arabic.test.ts` | 13 | Normalisation (alef/hamza/ta-marbuta, diacritics, tatweel), search-key folding, and text wrapping that does not break Arabic shaping |
| `tests/date.test.ts` | 19 | Gregorian/Hijri-aware helpers, the daily-seed derivation, session-window logic |
| `tests/search.test.ts` | 11 | Ranking order (exact phrase 100 › title 90 › keyword 70 › category 60 › prefix 40 › contains 25 › source 15), `MIN_QUERY_LENGTH = 2`, category filter |
| `tests/content.test.ts` | 20 | Corpus integrity — see `docs/CONTENT-POLICY.md` §4 |
| `tests/share.test.ts` | 12 | `buildShareText` ordering and `formatSource` output (incl. Qur'an phrasing), `computeShareCardLayout` geometry for both palettes |
| `tests/errors.test.ts` | 11 | `AppError` factories, default Arabic messages per code, `Result` helpers |
| `tests/manifest.test.ts` | 8 | `app.json` colours == tokens, RTL/lang, `duaa://` scheme, static web output, asset existence, no credentials in the manifest |

### `app-web` — jest-expo/web + @testing-library/react in jsdom (5 suites / 53 tests)

| Suite | Tests | What it proves |
|---|---|---|
| `tests/app/smoke.test.tsx` | 1 | The provider stack (RTL ▸ theme ▸ toast) mounts a screen |
| `tests/app/screens.test.tsx` | 22 | Every route renders its real content: home greeting + daily dua + shortcuts, the 12 categories with real counts, tasbeeh dial + 5 presets, the honest Community empty state, profile stats, all three azkar sessions with per-dhikr counters, category screen, dua reader with full attribution, favourites empty state, search pre-query state, `+not-found`, settings hub/appearance/notifications/account/language/about/privacy/terms, onboarding slide 1 |
| `tests/app/interactions.test.tsx` | 13 | Controls actually do things (see §3) |
| `tests/app/navigation.test.tsx` | 7 | Custom tab bar: 5 labelled tabs, `aria-selected` on the active one, `tabPress`/`navigate` on tap, no re-navigate when already focused, survives a missing descriptor, and the real `(tabs)/_layout.tsx` wiring (`lazy`, `headerShown: false`, Arabic titles, real `tabBar` render prop) |
| `tests/app/accessibility.test.tsx` | 10 | ARIA state on buttons/chips/segmented/switch/progress, chip affordances (static chips keep their name, long-press-only chips are buttons, the inline remove control fires independently), explicit RTL direction on every text node, 44 pt icon-button targets |

---

## 3. Behaviour verified by driving the real UI

`tests/app/interactions.test.tsx` clicks, types and swipes through the DOM, then asserts both the
rendered result **and** the persisted store:

* **Tasbeeh** — tapping the dial increments the on-screen count and the store; reaching the target
  completes a round and rolls the counter over; switching dhikr keeps per-phrase progress.
* **Azkar** — tapping a dhikr advances only that dhikr's counter; a single-repeat dhikr shows "تم".
* **Favourites** — favouriting from the reader makes the dua appear on the Favourites screen, and it
  can be removed again from there.
* **Search** — typing a real query returns real matches from the corpus; a nonsense query renders the
  honest empty state; recent terms are recorded and one term can be removed with its × control (the
  store and the toast both update).
* **Appearance** — choosing dark renders a dark background (computed RGB asserted, not guessed) and
  the reading scale persists.
* **Onboarding** — the pager walks slide by slide through "الشريحة التالية", each slide announcing
  `الشريحة N من 4`, and the final CTA calls `router.replace('/(tabs)')` and completes the store.
* **Settings** — reset wipes favourites only after the confirm sheet is accepted.

---

## 4. Bugs found by verification (and fixed)

These are real defects that testing caught; each one is now pinned by a regression test.

1. **Infinite render loop in `azkarStore`.** `countsFor()` returned a fresh `{}` on every call, so
   the selector's reference changed each render → "Maximum update depth exceeded". Fixed by returning
   a frozen `EMPTY_COUNTS` constant or the stored object.
2. **Tab bar crash on first paint.** `BottomTabBar` read `descriptors[route.name]`; React Navigation
   keys descriptors by `route.key`, and with `lazy: true` a descriptor may not exist yet. The
   destructure threw and the error boundary took over the whole app. Fixed to key by `route.key` and
   fall back to the built-in Arabic labels.
3. **Screen readers could not tell which tab was active.** react-native-web 0.21 does not map
   `accessibilityState` to ARIA, so `role="tab"` rendered with no `aria-selected`. Fixed centrally in
   `src/core/a11y/stateProps.ts` and applied to all nine interactive components.
4. **Chips without `onPress` lost their accessible name** and could not carry a long-press action at
   all. Fixed in `Chip` (interactive when *any* gesture exists; static chips still expose
   `aria-label`).
5. **`accessibilityHint` never reaches the web DOM**, so a long-press-only affordance would have been
   undiscoverable. Fixed by adding a visible inline remove control (`Chip.trailingAction`) instead of
   relying on the gesture.
6. **Manifest/theme drift.** `app.json` carried `#F7F4EC` / `#0B6B4F` while the tokens define
   `#F9F6EE` (ivory 100) and `#0B5C41` (emerald 700). Fixed and now guarded by `tests/manifest.test.ts`.
7. **Community screen hid the real reason it was empty.** It now renders the live
   `AppError.userMessage` from `UnavailableCommunityService`.
8. **`+html.tsx` shipped hardcoded shell colours**; they are interpolated from the tokens, so the
   first paint cannot differ from the themed app.

---

## 5. Environment limitations (what could NOT be verified here)

* **No browser automation.** The sandbox has no usable headless Chrome (missing `libnss3`/`libnspr4`,
  no `apt` access), so visual/layout checking was done through jsdom assertions on computed styles and
  rendered text, plus the dev server's own logs — not screenshots.
* **No device or emulator.** Native-only paths (`react-native-view-shot` capture, `expo-haptics`,
  `expo-sharing`, FCM, widgets) are compiled, type-checked and unit-tested where possible, and the
  platform-split modules (`renderShareCard.native.ts` / `.web.ts`) are exercised on the web side, but
  they have not been run on a physical device.
* **Static export ≠ hydration proof.** `expo export` renders the boot shell into HTML; full screen
  content is client-rendered. That is why screen coverage comes from the jsdom suite rather than from
  the exported files.
* **No Firebase project.** Anything behind `NOT_CONFIGURED` is verified to fail *honestly*; it cannot
  be verified to succeed until credentials exist.
* **jsdom is not a browser.** Gesture simulation is limited: react-native-web's long-press cannot be
  triggered from jsdom (verified empirically — `touchStart`/`mouseDown` + fake timers do not fire
  `onLongPress`), which is one reason the remove action also has a visible control that *is* testable.

---

## 6. Re-running everything

```bash
npm install                      # add --legacy-peer-deps if npm rejects the jest-expo peer range
npm run typecheck
npm run lint
npm test
npm run web:lan                  # dev server on 0.0.0.0:8081 (Arena preview friendly)
npm run build:web                # static export to dist/
```

Expected: typecheck exit 0, lint exit 0, `Tests: 147 passed, 147 total` across `12 passed` suites,
and 29 exported routes.
