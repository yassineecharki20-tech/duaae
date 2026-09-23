# DUAA | دعاء — Verification record

Everything below was executed in this repository. Numbers are copied from real command output, not
estimated. Nothing here claims a behaviour that was not observed.

Current stage: **2 — internationalization (ar/fr/en), personalization, personalized home, favorite
collections.** Stage-1 results are preserved and still passing.

---

## 1. Commands and results

| Check | Command | Result |
|---|---|---|
| Type safety | `npm run typecheck` (`tsc --noEmit`) | **exit 0** — no errors, `strict: true` |
| Lint | `npm run lint` (`expo lint` → ESLint 9 flat config) | **exit 0** — 0 errors, 0 warnings |
| Unit + screen tests | `npm test` (`jest`) | **222 passed / 222**, 16 suites, 2 projects |
| Production web build | `npx expo export --platform web` | **32 static routes** written to `dist/`, exit 0 |
| Static HTML shell | inspect `dist/index.html` | `<html lang="ar" dir="rtl">`, `theme-color` = `#F9F6EE` / `#0A1512` per scheme, body CSS colours come from tokens |
| Translation coverage | `tests/i18n.test.ts` + `tests/no-hardcoded-strings.test.ts` | Key parity ar/fr/en (842 / 804 / 804 top-level keys), placeholder parity, **zero** user-facing literals outside `core/i18n` |
| Contrast matrix | `tests/design/palettes.test.ts` | All **128** palette × accent × scheme combinations meet WCAG AA for body text |
| Brand assets | `npm run brand:generate` | 12 PNG in `assets/images` + 4 SVG in `assets/logo`; re-running reproduces byte-identical files (verified by md5 of `icon.png` / `mark.svg` before and after) |
| Audio assets | `npm run audio:generate` | `assets/audio/tick.wav`, `assets/audio/chime.wav` (synthesised, typed via `src/types/assets.d.ts`) |
| Manifest ↔ tokens | `tests/manifest.test.ts` | 8 assertions that `app.json` colours equal the design tokens and that every referenced image exists |

Not executed (and why): iOS/Android native builds (no Xcode/Android SDK or device in this
environment), `expo prebuild`, EAS Build, and any real Firebase/Google Sign-In call (no project
configured — by design, see `docs/FIREBASE-INTEGRATION.md`).

---

## 2. Test inventory

Two Jest projects (`jest.config.js`).

### `logic` — Node environment, no React (10 suites / 149 tests)

| Suite | Tests | What it proves |
|---|---|---|
| `tests/arabic.test.ts` | 13 | Normalisation (alef/hamza/ta-marbuta, diacritics, tatweel), search-key folding, and text wrapping that does not break Arabic shaping |
| `tests/date.test.ts` | 19 | Gregorian/Hijri-aware helpers, the daily-seed derivation, session-window logic, localized relative/long date formatting |
| `tests/search.test.ts` | 11 | Ranking order (exact phrase 100 › title 90 › keyword 70 › category 60 › prefix 40 › contains 25 › source 15), `MIN_QUERY_LENGTH = 2`, category filter |
| `tests/content.test.ts` | 20 | Corpus integrity — see `docs/CONTENT-POLICY.md` §4 |
| `tests/share.test.ts` | 12 | `buildShareText` ordering and `formatSource` output (incl. Qur'an phrasing), `computeShareCardLayout` geometry for both palettes |
| `tests/errors.test.ts` | 11 | `AppError` factories, catalog-driven messages per code, `Result` helpers |
| `tests/manifest.test.ts` | 8 | `app.json` colours == tokens, RTL/lang, `duaa://` scheme, static web output, asset existence, no credentials in the manifest |
| `tests/i18n.test.ts` | 22 | Catalog parity across ar/fr/en, plural sub-keys, CLDR plural selection per language, placeholder parity, direction and locale tags, every option builder returns every value with a non-empty label |
| `tests/design/palettes.test.ts` | 28 | Colour math (`ensureContrast`, `inkOn`), the 128-combination contrast matrix, high-readability tokens, palette/accent seed shape for both schemes |
| `tests/no-hardcoded-strings.test.ts` | 5 | Lexer scan of every `src/**/*.{ts,tsx}`: no Arabic literals outside the catalogs, no quoted strings in JSX text position, no `Record<AppLanguage, string>` label maps outside `core/i18n` |

### `app-web` — jest-expo/web + @testing-library/react in jsdom (6 suites / 73 tests)

| Suite | Tests | What it proves |
|---|---|---|
| `tests/app/smoke.test.tsx` | 1 | The full provider stack (router ▸ i18n ▸ theme ▸ toast) mounts and renders themed Arabic scripture text |
| `tests/app/screens.test.tsx` | 22 | Every route renders its real content: home greeting + daily dua + shortcuts, the 12 categories with real counts, tasbeeh dial + 5 presets, the honest Community "coming soon" state, profile stats, all three azkar sessions with per-dhikr counters, category screen, dua reader with full attribution, favourites empty state, search pre-query state, `+not-found`, settings hub/appearance/notifications/account/language (ar · fr · en as real choices)/about/privacy/terms, onboarding slide 1 |
| `tests/app/interactions.test.tsx` | 13 | Controls actually do things (see §3) |
| `tests/app/personalization.test.tsx` | 20 | Language, theme, home layout, recents, collections, one preferences object (see §4) |
| `tests/app/navigation.test.tsx` | 7 | Custom tab bar: 5 labelled tabs, `aria-selected` on the active one, `tabPress`/`navigate` on tap, no re-navigate when already focused, survives a missing descriptor, and the real `(tabs)/_layout.tsx` wiring (`lazy`, `headerShown: false`, localized titles, real `tabBar` render prop) |
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

## 4. Stage-2 behaviour verified end to end

`tests/app/personalization.test.tsx` uses the real providers, stores and services — no component is
mocked:

* **Language** — the home screen re-renders in French with no restart; `document.documentElement`
  flips `dir` → `ltr` and `lang` → `fr` and the choice persists; `useI18n()` reports
  `{ language, direction, isRTL, locale }` to components; tapping the Français row in
  Settings ▸ Language translates the whole screen (headers included).
* **Theme** — palette, accent, appearance and high-readability each reach the composed theme (real
  token values, e.g. `#F9F6EE` → a different background for `midnight`); reset returns to defaults.
* **Typography** — the `elegant` profile swaps the display face to Amiri while the interface stays
  Arabic-first (shaping cannot break); reading scale raises `theme.scripture().fontSize`; `spacious`
  raises `density.lineHeightScale`; `glass` changes `card.id` and `card.radius`.
* **Personalization screen** — all 8 palettes, 8 accents, 4 text sizes and 5 card styles are present,
  named in the active language, and clicking them writes the matching preference.
* **Home layout** — the home screen renders exactly the configured sections in the configured order;
  hiding a section removes it from home; the **last visible section cannot be hidden**; the real
  switches and up/down controls in Settings ▸ Home drive the same store.
* **Recents** — opening a dua feeds the home "recent" section; with none, the honest empty state shows.
* **Collections** — create (validation for empty / duplicate / over-long names), assign a favorite,
  filter the list by the collection, rename keeping members, delete keeping the duas, search inside
  the saved set, and the Arabic **dual** plural in the count summary (`دعاءان محفوظان`).
* **One preferences system** — every field lives in the single persisted object
  (`partialize` → `['preferences']`), and `syncPreferences()` reports `'local'` while no backend
  exists (`services.auth().isConfigured === false`).

---

## 5. Bugs found by verification (and fixed)

Real defects that testing caught; each is now pinned by a regression test.

**Stage 2**

1. **The brand wordmark was translated.** The i18n migration replaced the calligraphic `دعاء` in
   `DuaaLogo` with `t('app.name')`, which renders "DUAA" in French/English. Fixed with a dedicated
   `app.wordmark` key (identical in all three catalogs, allowlisted in the parity test) — brand art is
   not UI copy.
2. **`ensureContrast` could not reach AA from one direction.** White ink on a mid-tone accent (gold)
   needed darkening *and* lightening attempts; the one-directional nudge gave up and returned a
   failing colour. Now bidirectional, and the 128-combination matrix test enforces it.
3. **`applyAccent` hardcoded the ink** for light and dark schemes instead of deriving it, so a custom
   accent could ship unreadable button text. Replaced by `inkOn(accent, isDark)` (≥ 4.5:1).
4. **`SUBTLE_INK` failed contrast** on both schemes. Retuned to `#66716C` (light) / `#758881` (dark).
5. **Module-level option arrays froze the language.** Labels were built once at import time, so
   switching language left Arabic labels on screen. Every list is now a builder that takes `t`
   (`core/i18n/options.ts`), memoised per render.
6. **`useCallback` deps missing `t`** in 14 places — callbacks captured the previous language's
   strings (toasts, share text). Deps fixed; lint now reports zero warnings.
7. **`TextField` accepted `testID` but never applied it**, so the field was unreachable by test id.
   Now forwarded to the underlying input.
8. **`MAX_COLLECTION_NAME` lived in a concrete service implementation** while the UI imported it —
   caught by the project's own `no-restricted-imports` rule. Moved to the `FavoritesService` contract.
9. **`react-native-web` renders `Switch` as a `View` (carrying `role="switch"`) around a hidden
   `input[role="switch"]`.** Only the input responds to a click in jsdom; the test helper
   `switchInside()` documents and handles this.

**Stage 1** (still pinned by tests)

10. **Infinite render loop in `azkarStore`** — `countsFor()` returned a fresh object each call, so the
    selector's reference changed every render ("Maximum update depth exceeded"). Fixed with a frozen
    `EMPTY_COUNTS`.
11. **Tab bar crash on first paint** — `BottomTabBar` keyed descriptors by `route.name` while React
    Navigation keys them by `route.key`; with `lazy: true` a descriptor may not exist yet.
12. **Screen readers could not tell which tab was active** — react-native-web 0.21 does not map
    `accessibilityState` to ARIA. Fixed centrally in `src/core/a11y/stateProps.ts` and applied to all
    nine interactive components.
13. **Chips without `onPress` lost their accessible name**, and `accessibilityHint` never reaches the
    web DOM — fixed in `Chip` plus a visible inline remove control instead of a long-press-only action.
14. **Manifest/theme drift** — `app.json` carried `#F7F4EC` / `#0B6B4F` while tokens define `#F9F6EE`
    and `#0B5C41`. Fixed and guarded by `tests/manifest.test.ts`.
15. **Community screen hid the real reason it was empty** — it now renders the live
    `AppError.userMessage` (`NOT_CONFIGURED` → "المجتمع قريبًا" / "La communauté arrive bientôt." /
    "Community is coming soon.").
16. **`+html.tsx` shipped hardcoded shell colours** — now interpolated from the tokens.

---

## 6. Environment limitations (what could NOT be verified here)

* **No browser automation.** The sandbox has no usable headless Chrome (missing `libnss3`/`libnspr4`,
  no `apt` access), so visual/layout checking was done through jsdom assertions on computed styles and
  rendered text, plus the dev server's own logs — not screenshots.
* **No device or emulator.** Native-only paths (`react-native-view-shot` capture, `expo-haptics`,
  `expo-sharing`, FCM, widgets, and `I18nManager.forceRTL`) are compiled, type-checked and
  unit-tested where possible, but not run on a physical device. The native restart-after-direction-change
  path is therefore reasoned about and unit-tested, not observed on hardware.
* **Static export ≠ hydration proof.** `expo export` renders the boot shell into HTML; full screen
  content is client-rendered. That is why screen coverage comes from the jsdom suite rather than from
  the exported files.
* **No Firebase project / no Google OAuth client.** Anything behind `NOT_CONFIGURED` is verified to
  fail *honestly*; it cannot be verified to succeed until credentials exist.
* **jsdom is not a browser.** Gesture simulation is limited: react-native-web's long-press cannot be
  triggered from jsdom (verified empirically — `touchStart`/`mouseDown` + fake timers do not fire
  `onLongPress`), which is one reason the remove action also has a visible control that *is* testable.

---

## 7. Re-running everything

```bash
npm install                      # add --legacy-peer-deps if npm rejects the jest-expo peer range
npm run typecheck
npm run lint
npm test
npm run web:lan                  # dev server on 0.0.0.0:8081 (Arena preview friendly)
npm run build:web                # static export to dist/
```

Expected: typecheck exit 0, lint exit 0 with no warnings, `Tests: 222 passed, 222 total` across
`16 passed` suites, and 32 exported routes with `<html lang="ar" dir="rtl">`.
