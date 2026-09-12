# DUAA | دعاء — Architecture

This document describes how the app is built **as it exists in this repository**, not how it
might be built. Every path below is real and can be opened.

---

## 1. Layer map

```
src/
├── app/            Routes only (expo-router file-based). No business logic.
├── components/     Presentational + composite UI. No service imports except via hooks.
├── features/       Cross-screen behaviour: search engine, share card, daily dua, user stats.
├── hooks/          Tiny shared hooks (useReducedMotion, useIsRTL).
├── store/          Zustand stores — the only writable client state. Persisted via AsyncStorage.
├── services/
│   ├── contracts/  Interfaces (AuthService, DatabaseService, …). Pure TypeScript.
│   ├── impl/       Implementations, one file each, swappable.
│   └── registry.ts Composition root — the ONLY file that chooses implementations.
├── data/           Bundled authentic content (duas, azkar, tasbeeh presets). Static, typed.
├── design/         Tokens (colour/spacing/typography), theme provider, RTL provider, marks.
├── core/           Config/env, errors, utils (Arabic normalisation, Hijri/Gregorian dates,
│                   logger), constants (storage keys), a11y helpers, domain types.
└── types/          Asset module declarations (wav/png/svg).
```

Dependency direction is one-way:

```
app  →  components  →  features  →  store  →  services(contracts)  →  data / core
                                     ↓
                              services(impl) ← registry
```

UI never imports an implementation. ESLint enforces this: `src/app/**`, `src/components/**` and
`src/features/**` are blocked from importing `@/services/impl/*` (see `eslint.config.js`).

---

## 2. Services: the seam that Firebase will plug into

Thirteen contracts live in `src/services/contracts/`:

| Contract | Implementation today | Behaviour today | Next stage |
|---|---|---|---|
| `StorageService` | `AsyncStorageService` | real, local | unchanged |
| `ContentService` | `LocalContentService` | real, bundled content | `RemoteFirstContentService` wrapping it |
| `FavoritesService` | `LocalFavoritesService` | real, persisted locally | Firestore sync decorator |
| `AuthService` | `UnavailableAuthService` | honest `NOT_CONFIGURED` errors | `FirebaseAuthService` |
| `UserService` | `LocalUserService` | real local profile + stats | Firestore-backed profile |
| `DatabaseService` | `UnavailableDatabaseService` | honest `NOT_CONFIGURED` errors | `FirestoreDatabaseService` |
| `NotificationService` | `LocalNotificationPreferencesService` | real preference storage, no OS scheduling | Expo push + FCM decorator |
| `CommunityService` | `UnavailableCommunityService` | honest `NOT_CONFIGURED` errors | `FirestoreCommunityService` |
| `AnalyticsService` | `NoopAnalyticsService` | no-op, records nothing | Firebase Analytics |
| `ConnectivityService` | `NetInfoConnectivityService` | real | unchanged |
| `ClipboardService` | `ExpoClipboardService` | real | unchanged |
| `DeviceFeedbackService` | `ExpoDeviceFeedbackService` | real haptics + generated audio | unchanged |
| `ShareService` | `UniversalShareService` | real text + generated image | unchanged |

Rules that keep the seam honest:

1. **`registry.ts` is the only composition root.** Instances are created lazily and memoised, so
   nothing boots until first use (the Firebase SDK will not load on a screen that does not need it).
2. **No Firebase SDK anywhere yet.** `package.json` has no `firebase` dependency, and
   `grep -rl firebase src` matches only: `core/config/env.ts` (reads `EXPO_PUBLIC_FIREBASE_*`),
   `services/registry.ts` + `contracts/ContentService.ts` + `impl/LocalNotificationPreferencesService.ts`
   (comments describing the next stage), and `app/settings/privacy.tsx` (user-facing copy that says
   what this build does *not* send anywhere).
3. **Unconfigured ≠ broken.** Every unimplemented backend returns
   `Result.err(AppError.notConfigured(...))` with a ready-to-show Arabic `userMessage`. Screens
   render that message verbatim — they never invent data and never show a spinner forever.
4. **`Result<T, AppError>`** is the return type of every async service call. There are no thrown
   exceptions crossing the service boundary, so no screen needs a try/catch to stay honest.

Error taxonomy (`src/core/errors/AppError.ts`): `NOT_CONFIGURED`, `OFFLINE`, `NOT_FOUND`,
`STORAGE_FAILURE`, `VALIDATION`, `CANCELLED`, `UNSUPPORTED_PLATFORM`, `UNKNOWN` — each with a
default Arabic message and an optional `cause` for logging.

---

## 3. Content layer (separate from UI, replaceable by Firestore)

`src/data/content/` holds the bundled corpus: **147 duas and azkar entries across 12 categories**,
plus three azkar sessions. One file per category (`duas.rizq.ts`, `azkar.morning.ts`, …), with
`authoring.ts` documenting the schema conventions and `index.ts` building the derived structures:

| Category | Entries | Category | Entries |
|---|---|---|---|
| morning أذكار الصباح | 21 | healing الشفاء | 9 |
| evening أذكار المساء | 22 | forgiveness الاستغفار | 9 |
| sleep النوم | 12 | relief الفرج | 12 |
| travel السفر | 10 | prayer الصلاة | 12 |
| rizq الرزق | 10 | general أدعية عامة | 12 |
| parents الوالدين | 8 | success التوفيق والنجاح | 10 |

Exports from `@/data/content`: `CONTENT_VERSION` (`1.4.0`), `ALL_DUAS`, `DUA_BY_ID`,
`DUAS_BY_CATEGORY`, `CATEGORIES_WITH_COUNTS`, `CATEGORY_BY_ID`, `SESSIONS`, `SESSION_BY_KEY`,
`DAILY_DUA_POOL` (103 entries — azkar with high repeat counts are excluded), `SEARCH_INDEX`
(147 pre-normalised haystacks, built once at module load) and `CONTENT_STATS`.

An `AzkarSession` is a *window* onto a category, not a copy of it:
`{ key, title, subtitle, categoryId, windowStartHour, windowEndHour }` — which is why
`/azkar/morning` and `/category/morning` can never disagree.

`LocalContentService` exposes the same `ContentService` contract a Firestore-backed service will
(all of them `Promise<Result<…>>`): `listCategories`, `getCategory`, `listDuas(categoryId?)`,
`getDua`, `listSessions`, `getSession(key)`, `getDailyDua(seed?)`, `search(query, {limit,
categoryId})`, `getAdjacentDuas(duaId)`. Swapping the source therefore changes **zero** call sites
in `src/app` or `src/components`.

Every entry carries `sources: SourceReference[]` (`book`, `number`, `narrator`, `grade`, or a
`quran` reference). Nothing in the corpus is generated text — see `docs/CONTENT-POLICY.md`.

---

## 4. State

Nine Zustand stores (`src/store/`), all persisted with `zustand/middleware` + AsyncStorage under
versioned keys from `src/core/constants/storageKeys.ts` (`duaa:v1:<name>`):

| Store | Owns | Notes |
|---|---|---|
| `settingsStore` | appearance, language, readingScale, motion, sound, haptics | `hasHydrated()` gate for first paint |
| `onboardingStore` | completed flag + timestamp | drives the `/` → `/onboarding` redirect |
| `favoritesStore` | `FavoriteEntry[]` (`duaId`, `addedAt`, optional `note`) | `toggle()` returns the new state |
| `tasbeehStore` | per-dhikr progress, target, custom phrases | `increment()` returns `{count, completedRound, total}` |
| `azkarStore` | per-dhikr counts per session/day, completed days | `countsFor()` returns a **stable** reference (see §7) |
| `searchStore` | recent queries (deduped, capped at 8) | normalised matching, verbatim display |
| `contentStore` | cache + cache metadata for remote content | ready for the remote-first content service |
| `authStore` | cached auth snapshot | populated only when a real backend exists |
| `connectivityStore` | online/offline | fed by `NetInfoConnectivityService` |

Stores are the only place that writes; components read through selectors.

---

## 5. Design system

* **Tokens** — `src/design/tokens/`: `colors.ts` (raw palette: emerald / pine / ivory / gold / ink /
  night), `themeColors.ts` (`lightColors`, `darkColors`, `fixedColors`, `colorSchemes`),
  `spacing.ts`, `typography.ts`, `marks.ts` (SVG mask luminance), `shareCard.ts` (export-card
  palettes).
* **No hardcoded colours** — ESLint fails on any hex literal in `src/**` outside the token files.
  `app.json` cannot import tokens (it is JSON), so `tests/manifest.test.ts` asserts the manifest
  colours equal the token values and fails on drift.
* **Theme** — `src/design/theme/ThemeProvider.tsx` resolves light/dark from the settings store
  (`auto` follows the OS), exposes `useAppTheme()`, and syncs the browser chrome
  (`meta[name=theme-color]`) and native background (`expo-system-ui`).
* **Typography** — Amiri for scripture (`scripture`, `scriptureTitle` variants, line-height 2.05),
  IBM Plex Sans Arabic for UI. Loaded from `assets/fonts` via `@expo-google-fonts/*` and awaited in
  the root layout before the splash hides. Reading scale: `small 0.9 / normal 1 / large 1.18 /
  xLarge 1.38`.
* **UI kit** — `src/components/ui/`: `AppText`, `Screen`, `Button`, `IconButton`, `Card`, `Chip`
  (with an optional inline `trailingAction`), `Controls` (`TextField`, `Segmented`), `Progress`
  (`ProgressBar`), `BottomSheet`, `Toast` (`ToastProvider` + `useToast`), `StateViews`
  (`EmptyState`, `ErrorState`, `LoadingState`, `Skeleton`, `OfflineBanner`), `SettingsRow`
  (wraps the RN `Switch`), `SettingsSection`, `FutureTag`, `Divider`.
* **Motion** — durations 80/140/220/340/520 ms from tokens; all suppressed when
  `settingsStore.motion === 'reduced'` or the OS asks for reduced motion (`useReducedMotion`).
* **Brand** — `scripts/generate-brand-assets.mjs` deterministically renders the icon set, splash,
  favicon and logo lockups from the "دعاء" wordmark plus a crescent: 12 PNG in `assets/images`
  (icon, icon-small, icon-night, adaptive foreground/monochrome/background, splash light/dark,
  favicon ×2, logo light/dark) and 4 SVG marks in `assets/logo`.
  `scripts/generate-audio-assets.mjs` synthesises the tasbeeh tick and target chime as WAV.
  Both are reproducible (`npm run assets:generate`), so no binary asset is hand-edited.

---

## 6. RTL and Arabic-first

* `src/app/+html.tsx` emits `<html lang="ar" dir="rtl">` in the **static HTML**, so direction is
  correct before any JavaScript runs; the pre-hydration CSS is generated from the tokens.
* `src/design/rtl/RTLProvider.tsx` (+ `.web.tsx`) sets the locale for react-native-web by
  deep-importing its `LocaleProvider` (RNW's `I18nManager.forceRTL` is a no-op on web), and
  `bootRTL()` handles the native side.
* Logical properties only: `marginStart/paddingEnd/textAlign` — never `left/right` in components.
* `src/core/utils/arabic.ts` normalises alef/hamza/ta-marbuta, strips diacritics and tatweel for
  matching, and wraps text for the share card **without** breaking Arabic shaping.
* **i18n strategy:** the app ships Arabic only. There is no keyed string table, because a
  translation layer with a single language would be dead code and a maintenance trap. UI strings
  live next to the components that render them; `settings/language.tsx` shows English as
  `status: 'planned'` and disabled ("قريبًا") rather than pretending it exists. When a second
  language is genuinely commissioned, the introduction point is `src/core/i18n/` (already the home
  of RTL logic) plus a keys extraction pass — the architecture does not need to change.

---

## 7. Two rules learned the hard way (do not regress them)

1. **Zustand selectors must return stable references.** `azkarStore.countsFor()` returns either a
   frozen `EMPTY_COUNTS` constant or the stored object — never a fresh `{}`. A fresh object per call
   makes React re-render forever ("Maximum update depth exceeded").
2. **React Navigation keys `descriptors` by `route.key`, not `route.name`.** The custom tab bar
   reads `descriptors[route.key]` defensively and falls back to its own labels; with `lazy: true` a
   missing descriptor is a normal first-paint state, not a crash. `tests/app/navigation.test.tsx`
   pins both.

---

## 8. Accessibility

* `src/core/a11y/stateProps.ts` — `a11yState()` returns `accessibilityState` **plus** the explicit
  `aria-selected` / `aria-disabled` / `aria-checked` / `aria-expanded` / `aria-busy` attributes on
  web. Verified gap: react-native-web 0.21 does not translate `accessibilityState` into ARIA, so a
  `role="tab"` Pressable rendered with no `aria-selected`. Every interactive component funnels its
  state through this helper.
* Every text node renders with an explicit direction (`AppText`), so mixed-content screens stay RTL.
* Icon-only controls require `accessibilityLabel` by type (`IconButton`, `TextField`).
* Touch targets: 44 pt minimum (`IconButton`); the chip's inline remove control uses a 20 pt glyph
  with 12 pt hit slop to reach the same effective target.
* Hidden gestures are avoided: the "remove a recent search" action is a visible × button as well as
  a native long-press, because RNW drops `accessibilityHint` on web.
* `tests/app/accessibility.test.tsx` asserts all of the above in jsdom.

---

## 9. Testing strategy

Two Jest projects (`jest.config.js` → `jest.logic.config.js` + `jest.app.config.js`):

* **`logic`** (node env, 7 suites / 94 tests): pure modules — Arabic normalisation, dates, search
  ranking, content integrity, share text/card layout, error taxonomy, and the `app.json` ↔ token
  drift guard. No React, no DOM, fast.
* **`app-web`** (jest-expo/web + `@testing-library/react`, jsdom, 5 suites / 53 tests): real screens
  mounted inside the real providers (RTL ▸ theme ▸ toast). Native-only modules are mocked in
  `tests/app/setup.ts`; `expo-router/js-tabs` is stubbed so it **records the props the layout passed
  it**, which lets tests invoke the real `tabBar` render prop and the real screen declarations.

What the app-web suite actually does (`tests/app/interactions.test.tsx`): taps the tasbeeh dial and
asserts the on-screen count **and** the persisted store, completes a round and checks roll-over,
switches dhikr, advances azkar counters, favourites a dua from the reader and finds it on the
favourites screen (then removes it), types a search query and reads real results, removes a single
recent term, switches to dark and asserts the rendered background, walks the onboarding pager slide
by slide to the CTA and asserts the router call, and resets local data through the confirm sheet.

Details, commands and known limitations: `docs/VERIFICATION.md`.
