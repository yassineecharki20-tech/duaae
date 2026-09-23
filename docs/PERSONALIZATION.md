# DUAA — Personalization & preferences

One structured preferences object drives the whole appearance and layout of the app. Nothing is
stored twice, no screen owns its own copy of a setting, and every value has a named token behind it.

---

## 1. The single preferences object

`AppPreferences` (`src/core/types/domain.ts`) — 14 fields, all persisted together:

| Field | Values | Default | Where it is edited |
|---|---|---|---|
| `language` | `ar` · `fr` · `en` | `ar` | Settings ▸ Language |
| `appearance` | `system` · `light` · `dark` | `system` | Settings ▸ Personalization / Appearance |
| `palette` | `default` · `emerald` · `midnight` · `sand` · `ocean` · `forest` · `rose` · `monochrome` | `default` | Settings ▸ Personalization |
| `accent` | `gold` · `emerald` · `copper` · `teal` · `sapphire` · `rose` · `sand` · `slate` | `gold` | Settings ▸ Personalization |
| `fontProfile` | `default` · `elegant` · `modern` · `classic` | `default` | Settings ▸ Personalization |
| `readingScale` | `small` (0.9) · `normal` (1) · `large` (1.18) · `xLarge` (1.38) | `normal` | Settings ▸ Personalization / Appearance |
| `density` | `compact` (0.88) · `comfortable` (1) · `spacious` (1.14) | `comfortable` | Settings ▸ Personalization |
| `cardStyle` | `minimal` · `rounded` · `elegant` · `glass` · `classic` | `rounded` | Settings ▸ Personalization |
| `highReadability` | `boolean` | `false` | Settings ▸ Personalization |
| `motion` | `system` · `on` · `off` | `system` | Settings ▸ Appearance |
| `soundEnabled` | `boolean` | `true` | Settings ▸ Notifications / Appearance |
| `hapticsEnabled` | `boolean` | `true` | Settings ▸ Notifications / Appearance |
| `homeSections` | ordered `{ id, visible }[]` (8 sections) | all visible, shipped order | Settings ▸ Home layout |
| `widgetContent` / `widgetSize` | `dailyDua`·`tasbeeh`·`azkar` / `small`·`medium`·`large` | `dailyDua` / `medium` | Settings ▸ Widget |

* Persisted by `src/store/settingsStore.ts` (Zustand + `persist`) under **`duaa:v1:settings`**, with
  `partialize` restricted to `{ preferences }` — runtime flags (`syncState`,
  `restartNeededForDirection`, …) are never written to disk.
* Every setter is a small typed action (`setPalette`, `setAccent`, `setFontProfile`,
  `setReadingScale`, `setDensity`, `setCardStyle`, `setHighReadability`, `setMotion`, `setLanguage`,
  `toggleHomeSection`, `moveHomeSection`, `resetHomeSections`, `resetAppearancePreferences`), so no
  screen mutates state by hand.
* Legacy flat settings from stage 1 are migrated into this object by the store's `migrate`, so an
  existing install keeps its choices.

## 2. Theme composition

`src/design/theme/AppTheme.ts` builds the theme from `(preferences, colorScheme, fontScale)`:

```
PALETTE_SEEDS[palette] ──deriveFromSeed(scheme)──▶ base colour tokens
                                     │
                       applyAccent(accent, scheme) ── ensureContrast / inkOn
                                     │
                       applyHighReadability(scheme)  (optional)
                                     ▼
   Theme { colors, fontFamilies, fontProfile, fontScale, readingScale, typography,
           scripture(), density, card, radii, spacing, motion, reduceMotion, preferences }
```

* `theme.preferences` echoes the values it was built from — the personalization tests read it back
  instead of guessing hex codes.
* **Palettes** are low-saturation seeds (ivory/emerald/night family), so `midnight`, `ocean`, `forest`,
  `rose`, `sand` and `monochrome` stay calm and Islamic-appropriate rather than decorative; each has its
  own light *and* dark derivation.
* **Accents** are contrast-checked at composition time: `ensureContrast(fg, bg, 4.5)` nudges the colour
  in *both* directions until WCAG AA is met, and `inkOn(accent, isDark)` picks the ink that sits on top
  of the accent (≥ 4.5:1). `tests/design/palettes.test.ts` walks all **128 combinations**
  (8 palettes × 8 accents × 2 schemes) and asserts text/accent/border ratios.
* **Typography profiles** only ever use the two bundled Arabic-first families — IBM Plex Sans Arabic
  (interface) and Amiri (scripture) — so Arabic shaping cannot break:
  * `default`: Plex UI, Amiri scripture, ×1 sizes.
  * `elegant`: Amiri display faces over Plex body, ×1.02, looser tracking, 1.7 / 2.12 line heights.
  * `modern`: tighter tracking and slightly smaller sizes.
  * `classic`: Amiri-forward with a firmer rhythm.
* **Reading scale** multiplies scripture type (`theme.scripture(variant?)`), independently of the OS
  accessibility `fontScale` — both apply, so a user can have a large system font *and* extra-large duas.
* **Density** sets `lineHeightScale`, `paragraphGap`, `sectionGap`, `paddingScale` for reading surfaces.
* **Card style** resolves to `theme.card` (`radius`, `borderWidth`, `borderColor`, `backgroundColor`,
  `overlayAlpha`, `hairline`, `elevation`, `paddingScale`) — `glass` uses an overlay + hairline,
  `minimal` drops borders and elevation entirely.
* **High readability** raises text contrast and firms up borders on top of any palette/accent pair.

## 3. Personalized home

`homeSections` is an ordered list of `{ id, visible }` over the 8 section ids:
`dailyDua`, `morning`, `evening`, `tasbeeh`, `favorites`, `recent`, `community`, `quickActions`.

* `visibleHomeSections(preferences)` is the single selector the home screen maps over — the screen has
  no hardcoded order and no `if (userDisabled…)` branches.
* **Settings ▸ Home layout** (`/settings/home`) lists the visible sections with a switch and up/down
  controls, then the hidden ones with a switch to bring them back, plus "reset order".
* Rules enforced in the store (and covered by tests): the **last visible section cannot be hidden**;
  `moveHomeSection(id, ±1)` reorders **within the visible list only** and refuses to move past either
  end; hidden sections keep their stored position so re-showing restores them where they were.
* Persistence is per-installation today and per-account as soon as a backend exists (see §6).

## 4. Recently opened duas

`src/store/recentDuasStore.ts` (persisted under `duaa:v1:duaa.recent`): the dua reader records the open
dua, de-duplicated and moved to the front, capped at **12**. Home shows the first 3, and renders an
honest empty state (`home.recentEmpty`) when nothing has been opened yet.

## 5. Favorites & collections

`src/store/favoritesStore.ts` + `FavoritesService` (contract in `src/services/contracts/FavoritesService.ts`):

* Entry: `{ duaId, addedAt, note?, collectionIds? }`; collection: `{ id, name, createdAt }`, stored
  beside the entries (`duaa:v1:favorites`, `duaa:v1:favorites.collections`).
* **Create / rename / delete** from the Favorites screen (bottom sheets), with validation: name
  required, unique (case- and whitespace-normalised), max **`MAX_COLLECTION_NAME = 30`** — the constant
  lives in the contract so the UI limit and the service rule cannot drift.
* **Deleting a collection never deletes its duas**: membership is stripped, favorites stay saved
  (asserted in `tests/app/personalization.test.tsx`).
* **Assign** a favorite to any number of collections from its row (`assign-{duaId}` → switch per
  collection).
* **Filter** by collection chip (labelled `name · count`) or by category, **search** inside the saved
  set with the same Arabic-aware folding as global search, and **sort** by recently added or by title.
* Every failure path returns a real `AppError.userMessage` from the catalog; the screen also states
  plainly that favorites are stored on this device while no account backend exists.

## 6. Persistence vs. account sync

* Today: **local only.** `services.auth().isConfigured` is `false`, so
  `syncPreferences()` resolves to `'local'` and the profile screen says so honestly
  (`PreferencesSyncState = 'local' | 'synced' | 'unavailable'`).
* The sync seam is already complete: `toUserPreferencesDocument(preferences)` maps **all 14 fields**
  (including palette, accent, font profile, density, card style, high readability, motion, home
  sections and widget settings) onto `UserPreferencesDocument`, and `UserService.syncPreferences` /
  `getPreferences` are part of the contract. Implementing them against Firestore in the next phase
  turns `'local'` into `'synced'` with **no UI or store change**.
* The store calls `syncPreferences()` after rehydration and after changes, so wiring a backend is the
  only missing piece.

## 7. Accessibility

* Text sizes: `xLarge` reading scale + OS `fontScale` both apply; the dua reader exposes a size control
  in its own sheet.
* `highReadability` for stronger contrast; all palette/accent pairs already meet WCAG AA for body text.
* Interactive targets ≥ **44 pt** (`IconButton` sizes, switch rows, chips) — asserted in
  `tests/app/accessibility.test.tsx`.
* Screen readers: `src/core/a11y/stateProps.ts` maps `accessibilityState` to real ARIA (react-native-web
  0.21 does not), so switches report `aria-checked`, chips `aria-selected`, tabs `aria-selected`, and
  every control has an accessible name from the catalogs (in the active language).
* `reduceMotion` honours the OS setting *and* the in-app `motion` preference; animations fall back to
  instant state changes.

## 8. Testing

| Suite | Coverage |
|---|---|
| `tests/design/palettes.test.ts` (28) | Colour math, the 128-combination contrast matrix, high-readability tokens, palette/accent seed shape |
| `tests/app/personalization.test.tsx` (20) | Language switch, theme composition per preference, the personalization screen's full option set, home section hide/show/reorder and its guards, recents, collections end to end, one-preferences-object + local sync |
| `tests/app/accessibility.test.tsx` (10) | ARIA state, RTL text direction, 44 pt targets |
| `tests/i18n.test.ts` (22) | Catalog parity, plurals, direction, option builders |
| `tests/no-hardcoded-strings.test.ts` (5) | No literal UI strings or per-language label maps outside `core/i18n` |
